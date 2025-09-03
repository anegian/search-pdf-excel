from rapidfuzz import fuzz
import re
import io, sys
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

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

def alpha_tokens(text):
    """Κρατάει μόνο tokens που περιέχουν γράμματα"""
    return [t for t in text.split() if any(c.isalpha() for c in t)]

def bump_type(curr, new):
    order = {
        "exact": 7,
        "exact-reversed": 6,
        "partial-reversed": 5,
        "partial": 4,
        "fuzzy": 3,
        "fuzzy-reversed": 2,
        "surname-only": 1,
    }
    if curr is None:
        return new
    return new if order[new] > order[curr] else curr

def search_text_advanced(text, filters, fuzzy_threshold):
    """
    Αναζήτηση ονομάτων και πινακίδων στο κείμενο με fuzzy matching.
    - text: το κείμενο για ανάλυση
    - filters: dict με φίλτρα {"Names": [...], "Plates": [...]}
    - fuzzy_threshold: όριο για fuzzy match
    Επιστρέφει dict {"Names": {...}, "Plates": {...}}
    """
    results = {"Names": {}, "Plates": {}}
    lines = text.splitlines()
    name_tokens = []
    plate_tokens = []
    
    # --- Δημιουργία tokens ---
    for line_idx, line in enumerate(lines, start=1):
        #print(f"\nLINE {line_idx}: '{line}'")
        
        # Κρατάμε μόνο λέξεις που περιέχουν γράμματα
        tokens = [tok for tok in line.split() if any(c.isalpha() for c in tok)]
        if not tokens:
            continue

        # Ολόκληρη η γραμμή σαν normalized group
        norm_group = " ".join(tokens)
        norm_group_clean = normalize_text(norm_group)
        name_tokens.append((line_idx, norm_group, norm_group_clean))

        # --- Names ---
        for name in tokens:
            token_normalized = normalize_text(name)
            #print(f"    Name token: '{name}' -> '{token_normalized}'")
            name_tokens.append((line_idx, name, token_normalized))

        # --- Plates ---
        for tok in tokens:
            # Διαχωρίζουμε πινακίδες αν υπάρχει "/"
            for part in tok.split("/"):
                plate_tokens.append((line_idx, part, normalize_text(part)))

    # --- Names matching ---
    for name in filters["Names"]:
        name_norm = normalize_text(name)
        parts = name_norm.split()
        reversed_name_norm = " ".join(parts[::-1]) if len(parts) > 1 else name_norm

        surname = parts[0]
        firstname = " ".join(parts[1:]) if len(parts) > 1 else ""
        surname_norm = normalize_text(surname)
        firstname_norm = normalize_text(firstname)

        # κρατάμε μόνο το ισχυρότερο match ανά γραμμή
        line_best_match = {}

        for line_idx, orig, norm in name_tokens:
            # Full string ratios
            #r_normal = fuzz.ratio(name_norm, norm)
            #r_reversed = fuzz.ratio(reversed_name_norm, norm) if reversed_name_norm != name_norm else 0
            
            r_normal = 0
            normal_valid = False
            score_surname = 0

            # normalize τη γραμμή split σε λέξεις
            words = norm.split()
            if len(words) >= 1:
                # τσεκάρουμε αν το πρώτο token ταιριάζει με το surname
                score_surname = fuzz.ratio(surname_norm, words[0])
                r_normal = fuzz.partial_ratio(name_norm, norm)
                if score_surname == 100:  # threshold για έγκυρο normal match
                    normal_valid = True
            
            # ---- Reversed έλεγχος με υψηλό surname ----
            r_reversed = 0
            reversed_valid = False
            score_surname_rev = 0
            if len(parts) > 1:
                # normalize τη γραμμή split σε λέξεις
                words = norm.split()
                if len(words) >= 2:
                    # ελέγχουμε αν το τελευταίο token της γραμμής ταιριάζει με το surname
                    score_surname_rev = fuzz.ratio(surname_norm, words[-1])
                    r_reversed = fuzz.ratio(reversed_name_norm, norm)
                    if score_surname_rev >= 86:  # threshold για έγκυρο reversed
                        reversed_valid = True

            # Weighted fuzzy
            score_firstname = fuzz.partial_ratio(firstname_norm, norm)

            r_weighted = fuzz.ratio(name_norm, norm)

            # Weighted reversed
            r_weighted_rev = fuzz.ratio(reversed_name_norm, norm)
            
            # Αρχικά δεν υπάρχει match
            best_type = None
            best_score = 0
            display_orig = orig

            # ---- Απόφαση τύπου match ----
            # Exact
            if norm == name_norm:
                best_type, best_score = "exact", 100
            # Exact reversed
            elif norm == reversed_name_norm:
                best_type, best_score = "exact-reversed", 100
            # Partial
            elif name_norm in norm:
                best_type, best_score = "partial", 100
            # Partial reversed
            elif score_surname_rev == 100 and r_reversed >= fuzzy_threshold:
                best_type, best_score = "partial-reversed", int(round(r_reversed))
            # Fuzzy normal
            elif r_weighted >= fuzzy_threshold:
               best_type, best_score = "fuzzy", int(round(r_weighted))
            # Fuzzy reversed
            elif r_weighted_rev >= fuzzy_threshold and reversed_valid:
                best_type, best_score = "fuzzy-reversed", int(round(r_weighted_rev))

            if not best_type:
                continue

            # Κρατάμε μόνο το ισχυρότερο match ανά γραμμή
            if line_idx not in line_best_match or best_score > line_best_match[line_idx][1]:
                line_best_match[line_idx] = (best_type, best_score, display_orig)

            # Debug print
            #print("\n=== ΤΕΛΙΚΑ MATCHED NAMES ===")
            #print(f"   ✅ MATCH ({best_type}, {best_score}) -> {display_orig}")
            #print(f"   ✅ Score Surname: ({score_surname}, R_weighted: {r_weighted}) -> {display_orig}")
                        

         # --- Δημιουργία τελικών αποτελεσμάτων για το όνομα ---
        matched_words = []
        ratios = []
        match_type = None
        match_types_per_line = []
        for line_idx, (t, s, orig) in line_best_match.items():
            matched_words.append(f"{line_idx}. {orig}")
            ratios.append(s)
            match_type = bump_type(match_type, t)
            match_types_per_line.append(t)

        if matched_words:
            results["Names"][name] = {
                "count": len(matched_words),
                "type": match_type,
                "types_per_line": match_types_per_line,
                "matched_words": matched_words,
                "ratios": ratios
            }

    # Προσθέτουμε μετά τη δημιουργία name_tokens
    line_to_name = {}
    for line_idx, orig, norm in name_tokens:

        if line_idx not in line_to_name:
          line_to_name[line_idx] = orig

    
    # --- Plates matching ---  
    for plate in filters["Plates"]:
        plate_norm = normalize_text(plate)
        match_type = None
        matched_words = []
        ratios = []
        types_per_line = [] 

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
            # Βρίσκουμε το όνομα στην ίδια γραμμή, αν υπάρχει
            associated_name = line_to_name.get(line_idx)
            # Προσθέτουμε στο matched_words το ονομα
            matched_words.append(f"{line_idx}. {orig} -> {associated_name}")
            ratios.append(int(round(score)))
            types_per_line.append(new_type) 
            
            # Debug print
            #print("\n=== ΤΕΛΙΚΑ MATCHED PLATES ===")
            #print(f"   ✅ MATCH ({new_type}, {int(round(score))}) -> {orig} -> {associated_name}")

        if matched_words:
            results["Plates"][plate] = {
                "count": len(matched_words),
                "types_per_line": types_per_line,
                "matched_words": matched_words,
                "ratios": ratios
            }

    return results