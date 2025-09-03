import PyPDF2
import pandas as pd
import re

DEBUG_FILE = "debug_output.txt"  # Αρχείο για έλεγχο
IGNORE_WORDS = {"AL","BG","IT","GR","DE","TR","Passport","No","male","M","MALE","F","female","FEMALE","GREECE","AD","T","PAS","PASS","NO"}


def read_pdf(file_path, filter_names=False):
    text = ""
    with open(file_path, "rb") as f:
        reader = PyPDF2.PdfReader(f)
        for i, page in enumerate(reader.pages):
            page_text = page.extract_text() or ""
            text += page_text + "\n"

    # Καθαρισμός: αφαιρεί την πρώτη στήλη/αριθμό (α/α) αν υπάρχει
    text = clean_first_column(text)

    # Αν ζητηθεί -> κρατάμε μόνο τα ονόματα
    if filter_names:
        text = extract_tokens(text)
    
    # Αποθήκευση του κειμένου σε debug αρχείο
    with open(DEBUG_FILE, "w", encoding="utf-8") as debug_f:
        debug_f.write(text)

    return text

def extract_tokens(text):
    """
    Εξάγει ονόματα από το κείμενο, διατηρώντας τα groups που χωρίζονται με "/".
    Κάθε group διαχωρίζεται σε λέξεις, κρατάμε μόνο λέξεις με γράμματα.
    Επιστρέφει καθαρό κείμενο με ένα όνομα/group ανά γραμμή.
    """

    lines = text.splitlines()  # χωρίζουμε το κείμενο σε γραμμές
    cleaned_lines = []         # αποθηκεύουμε τα καθαρά groups εδώ

    for line in lines:
        # Κάθε γραμμή μπορεί να έχει πολλά groups χωρισμένα με "/"
        groups = line.strip().split("/")

        for group in groups:
            # Κρατάμε μόνο τα tokens που είναι λέξεις (γράμματα)
            tokens = []
            for word in group.split():
                if word.isalpha() and word not in IGNORE_WORDS:   # απορρίπτουμε αριθμούς ή πινακίδες
                    tokens.append(word)

            if tokens:
                # Συγκεντρώνουμε όλη την πληροφορία του group
                cleaned_group = " ".join(tokens)
                cleaned_lines.append(cleaned_group)

    # Επιστρέφουμε κάθε καθαρό group σε ξεχωριστή γραμμή
    return "\n".join(cleaned_lines)

def read_excel(file_path, filter_names=False):
    try:
        if file_path.lower().endswith(".xls"):
            df = pd.read_excel(file_path, engine="xlrd")
        else:
            df = pd.read_excel(file_path, engine="openpyxl")
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise ValueError(f"Excel read error: {str(e)}")

    print("Columns:", df.columns.tolist())
    print("Πρώτες γραμμές:\n", df.head())  # Δες τα πρώτα 5 rows


    # Καθαρισμός δεδομένων
    df = df.fillna("").astype(str)
    df = df.applymap(lambda x: x.replace("\xa0", " ").strip())

    # Αν υπάρχουν οι στήλες Family name + Given names -> κρατάμε μόνο αυτές
    if "Family name" in df.columns and "Given names" in df.columns:
        df["FullName"] = df["Family name"].str.strip() + " " + df["Given names"].str.strip()
        rows_as_text = df["FullName"].tolist()
    else:
        # fallback: παίρνουμε όλο το row αν δεν υπάρχουν τα σωστά headers
        rows_as_text = df.apply(lambda row: " ".join(v for v in row if v), axis=1).tolist()

    print("Πρώτες γραμμές ως text:\n", rows_as_text[:5])

    text = "\n".join(rows_as_text)

    if filter_names:
        text = extract_tokens(text)

    with open(DEBUG_FILE, "w", encoding="utf-8") as debug_f:
        debug_f.write(text)

    return text


def clean_first_column(text):
    """
    Αφαιρεί το αρχικό α/α (πρώτο ψηφίο/αριθμό) από κάθε γραμμή του PDF
    """
    lines = text.splitlines()
    cleaned_lines = []
    for line in lines:
        # Αν ξεκινάει με αριθμό και πιθανό κενό, τον αφαιρούμε
        new_line = re.sub(r"^\d+\s*", "", line)
        cleaned_lines.append(new_line)
    return "\n".join(cleaned_lines)

