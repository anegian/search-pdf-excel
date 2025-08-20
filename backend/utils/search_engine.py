from rapidfuzz import fuzz
import re

def load_filters(txt_path):
    filters = {"Names": [], "Plates": []}
    current_category = None
    with open(txt_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            if line.startswith("[") and line.endswith("]"):
                current_category = line.strip("[]")
            elif current_category in filters:
                filters[current_category].append(line)
    return filters

def normalize_text(text):
    text = text.lower()
    # κρατάει όλα τα γράμματα (Unicode) και αριθμούς
    text = re.sub(r"[^\w]", " ", text, flags=re.UNICODE)
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def bump_type(curr, new):
    order = {"exact": 3, "partial": 2, "fuzzy": 1}
    if curr is None:
        return new
    return new if order[new] > order[curr] else curr

def search_text_advanced(text, filters, fuzzy_threshold):
    results = {"Names": {}, "Plates": {}}

    lines = text.splitlines()
    name_tokens = []
    plate_tokens = []

    for line_idx, line in enumerate(lines, start=1):
        norm_line = normalize_text(line)

        tokens = line.split()
        for tok in tokens:
            # Διαχωρίζουμε πινακίδες αν υπάρχει "/"
            plate_parts = tok.split("/")
            for part in plate_parts:
                norm_part = normalize_text(part)
                plate_tokens.append((line_idx, part, norm_part))

            # Όλες οι λέξεις που δεν είναι καθαρά αριθμοί ως μέρος των ονομάτων   
            if not tok.isdigit():
                norm_tok = normalize_text(tok)
                name_tokens.append((line_idx, tok, norm_tok))

        # Προσθέτουμε και ολόκληρη τη γραμμή σαν token για αναζήτηση ονόματος
        name_tokens.append((line_idx, line, norm_line))

    # --- Names ---
    for name in filters["Names"]:
        name_norm = normalize_text(name)
        # δημιουργούμε αντίστροφη σειρά αν περιέχει περισσότερες από μία λέξη
        parts = name_norm.split()
        reversed_name_norm = " ".join(parts[::-1]) if len(parts) > 1 else name_norm
     
        match_type = None
        matched_words = []
        ratios = []

        for line_idx, orig, norm in name_tokens:

            r_normal = fuzz.ratio(name_norm, norm)
            r_reversed = fuzz.ratio(reversed_name_norm, norm) if reversed_name_norm != name_norm else 0
            r_best = max(r_normal, r_reversed)

            # καθορισμός τύπου match
            if norm == name_norm or norm == reversed_name_norm:
                new_type, score = "exact", 100
            elif name_norm in norm or reversed_name_norm in norm:
                new_type, score = "partial", r_best
            elif r_best >= fuzzy_threshold:
                new_type, score = "fuzzy", r_best
            else:
                continue

            match_type = bump_type(match_type, new_type)
            matched_words.append(f"{line_idx}. {orig}")
            #matched_words.append(f"{line_idx}. {lines[line_idx-1]}")
            ratios.append(int(round(score)))

        if matched_words:
            results["Names"][name] = {
                "count": len(matched_words),
                "type": match_type,
                "matched_words": matched_words,
                "ratios": ratios
            }

    # Προσθέτουμε μετά τη δημιουργία name_tokens
    line_to_name = {}
    for line_idx, orig, norm in name_tokens:
        # απλώς παίρνουμε την πρώτη λέξη που μοιάζει με όνομα για τη γραμμή
        line_to_name[line_idx] = orig

    # --- Plates ---
    for plate in filters["Plates"]:
        plate_norm = normalize_text(plate)
        match_type = None
        matched_words = []
        ratios = []

        for line_idx, orig, norm in plate_tokens:
            r = fuzz.ratio(plate_norm, norm)
            if norm == plate_norm:
                new_type, score = "exact", 100
            elif plate_norm in norm:
                new_type, score = "partial", r
            elif r >= fuzzy_threshold:
                new_type, score = "fuzzy", r
            else:
                continue

            match_type = bump_type(match_type, new_type)
            # Παίρνουμε την ολόκληρη γραμμή από το αρχικό κείμενο
            line_text = lines[line_idx - 1]

            # Βρίσκουμε το όνομα στην ίδια γραμμή, αν υπάρχει
            associated_name = line_to_name.get(line_idx)

            # Προσθέτουμε στο matched_words το ονομα
            matched_words.append(f"{line_idx}. {orig} -> {associated_name}")

            ratios.append(int(round(score)))

        if matched_words:
            results["Plates"][plate] = {
                "count": len(matched_words),
                "type": match_type,
                "matched_words": matched_words,
                "ratios": ratios
            }

    return results
