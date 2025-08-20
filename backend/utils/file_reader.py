import PyPDF2
import pandas as pd
import re

DEBUG_FILE = "debug_output.txt"  # Αρχείο για έλεγχο

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
        text = extract_names(text)
    
    # Αποθήκευση του κειμένου σε debug αρχείο
    with open(DEBUG_FILE, "w", encoding="utf-8") as debug_f:
        debug_f.write(text)

    return text

def extract_names(text, max_tokens=2):
    """
    Κρατάει τα πρώτα tokens που είναι μόνο γράμματα (αγνοεί αριθμούς/πινακίδες).
    max_tokens: πόσα tokens να κρατήσουμε (π.χ. επώνυμο + όνομα)
    """
    lines = text.splitlines()
    cleaned = []

    for line in lines:
        tokens = line.strip().split()
        # Κρατάμε μόνο tokens που είναι γράμματα
        name_tokens = [t for t in tokens if t.isalpha()]
        if name_tokens:
            # Παίρνουμε μέχρι max_tokens tokens
            cleaned.append(" ".join(name_tokens[:max_tokens]))

    return "\n".join(cleaned)

def read_excel(file_path, filter_names=False):
    try:
        if file_path.lower().endswith(".xls"):
            # Για παλιά Excel αρχεία .xls
            df = pd.read_excel(file_path, engine="xlrd")
        else:
            # Για νέα .xlsx
            df = pd.read_excel(file_path, engine="openpyxl")

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise ValueError(f"Excel read error: {str(e)}")

    # Μετατροπή όλων των τιμών σε string και flatten
    text = "\n".join(df.astype(str).fillna("").values.flatten())

    # Αν ζητηθεί -> κρατάμε μόνο τα ονόματα
    if filter_names:
        text = extract_names(text)

    # Αποθήκευση του κειμένου σε debug αρχείο
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
