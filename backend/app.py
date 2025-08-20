from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import os

from utils.file_reader import read_pdf, read_excel, extract_names
from utils.search_engine import load_filters, search_text_advanced
from utils.simple_search import simple_search

UPLOAD_FOLDER = "temp_file_uploads"
FILTERS_FILE = "filters.txt"
LASTNAMES = "lastnames.txt"

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:3000"}})
app.config["UPLOAD_FOLDER"] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Φορτώνουμε φίλτρα μία φορά στην αρχή
filters = load_filters(FILTERS_FILE)  
lastnames = load_filters(LASTNAMES)  

# Route για να σερβίρει τα αρχεία όπως στον browser
@app.route("/view/<filename>")
def view_file(filename):
    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    if not os.path.exists(file_path):
        return "File not found", 404
    # Απλό send, browser θα κάνει inline rendering για PDF/Excel
    return send_from_directory(app.config["UPLOAD_FOLDER"], filename)

# Simple search
@app.route("/search", methods=["GET"])
def search_file():
    filename = request.args.get("filename")
    if not filename:
        return jsonify({"error": "Missing filename"}), 400

    file_path = os.path.join(app.config["UPLOAD_FOLDER"], filename)
    try:
        results = simple_search(file_path, LASTNAMES)
    except FileNotFoundError:
        return jsonify({"error": "File not found"}), 404
    except ValueError:
        return jsonify({"error": "Unsupported file type"}), 400

    return jsonify({"results": results})

# Αναζήτηση μέσα από viewer (γρήγορη, χωρίς fuzzy)
@app.route("/viewer-search", methods=["POST"])
def viewer_search():
    file = request.files.get("file")
    if not file:
        return jsonify({"results": {}})

    # Αποθήκευση προσωρινά στο server (μπορεί να είναι in-memory)
    temp_path = f"temp_{file.filename}"
    file.save(temp_path)

    text = read_pdf(temp_path)

    filters = load_filters("filters.txt")
    results = {}

    for keyword in filters:
        if keyword in text:
            results[keyword] = [keyword]  # απλή substring αντιστοίχιση

    os.remove(temp_path)
    return jsonify({"results": results})

# Επιστρέφει το αρχείο με τα φίλτρα
@app.route("/filters.txt")
def get_filters():
    return send_from_directory(".", "filters.txt", mimetype="text/plain")

# Route για το αρχείο με μόνο επίθετα
@app.route("/lastnames.txt")
def get_lastnames():
    return send_from_directory(".", "lastnames.txt", mimetype="text/plain")

# Έξυπνη ποσοστιαία ανάλυση 
@app.route("/analyze", methods=["POST"])
def analyze_file():

    try:
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400

        file = request.files["file"]
        filter_names = request.form.get("filter_names", "false").lower() == "true"  # ✅ flag από frontend
        fuzzy_threshold = int(request.form.get("fuzzy_threshold", 79)) 

        file_path = os.path.join(app.config["UPLOAD_FOLDER"], file.filename)
        file.save(file_path)

        try:
            if file.filename.lower().endswith(".pdf"):
                text = read_pdf(file_path, filter_names=filter_names)
            elif file.filename.lower().endswith((".xls", ".xlsx")):
                text = read_excel(file_path, filter_names=filter_names)
            else:
                return jsonify({"error": "Unsupported file type"}), 400

            results = search_text_advanced(text, filters, fuzzy_threshold)

            # Fallback με lastnames.txt αν δεν βρέθηκε τίποτα
            fallback_used = False
            if not results:
                lastnames_list = load_filters(LASTNAMES)
                results = search_text_advanced(text, lastnames_list, fuzzy_threshold)
                fallback_used = True

        finally:
            # διαγράφουμε το προσωρινό αρχείο ανεξαρτήτως αποτελέσματος
            if os.path.exists(file_path):
                os.remove(file_path)

        return jsonify({"results": results, "fallback": fallback_used})
    
    except Exception as e:
        import traceback
        traceback.print_exc()  # για debug στο console
        return jsonify({"error": str(e)}), 400

if __name__ == "__main__":
    app.run(debug=True)
