import "../App.css";
import { FaCheckCircle } from "react-icons/fa"; // ✅ Προσθήκη icon

function Results({ results, loading }) {
  const names = results?.Names || {};
  const plates = results?.Plates || {};

  const typeMapping = {
    exact: "Ακριβής",
    partial: "Μερική",
    fuzzy: "Πιθανή"
  };

  const renderTable = (obj, isPlate = false) => {
    const seenKeys = new Set();

    return Object.entries(obj)
      .filter(([key]) => {
        if (seenKeys.has(key)) return false;
        seenKeys.add(key);
        return true;
      })
      .map(([key, value], idx) => {
        const displayKey = isPlate ? key.replace(/\//g, " ") : key;

        const uniqueMatches = [];
        const uniqueRatios = [];
        if (value.matched_words?.length > 0) {
          value.matched_words.forEach((word, i) => {
            if (!uniqueMatches.includes(word)) {
              uniqueMatches.push(
                isPlate ? word.replace(/\//g, " - ") : word
              );
              uniqueRatios.push(Math.round(value.ratios[i]));
            }
          });
        }
        
        return (
          <tr key={idx}>
            <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "left" }}>
              {displayKey}
            </td>
            <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>
              {value.count}
            </td>
            <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>
              {typeMapping[value.type] || value.type}
            </td>
            <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>
              {uniqueMatches.join(", ")}
            </td>
            <td style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>
              {uniqueRatios.map(r => r + "%").join(", ")}
            </td>
          </tr>
        );
      });
  };

  // Έλεγχος αν υπάρχουν αποτελέσματα
  const hasResults = Object.keys(names).length > 0 || Object.keys(plates).length > 0;

  return (
    <div className="results-box">
      <h2>Αποτελέσματα
        {hasResults && (
          <FaCheckCircle 
            color="#ffb100" 
            size={24} 
            style={{ marginLeft: "8px" }} 
          />
        )}</h2>

      {loading && (
              <div style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  margin: "16px 0"
              }}>
                  <div className="spinner"></div>
              </div>
          )}

      { !loading && Object.keys(names).length === 0 && Object.keys(plates).length === 0 ? (
        <p>Δεν βρέθηκαν αποτελέσματα.</p>

        
      ) : (
        <table style={{ borderCollapse: "collapse", width: "100%", lineHeight: "1.8" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: "10px", textAlign: "left" }}>Όνομα / Πινακίδα</th>
              <th style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>Φορές</th>
              <th style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>Τύπος Ταύτισης</th>
              <th style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>Ευρήματα</th>
              <th style={{ border: "1px solid #ccc", padding: "10px", textAlign: "center" }}>Ποσοστά</th>
            </tr>
          </thead>
          <tbody>
            {renderTable(names)}
            {renderTable(plates, true)}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default Results;
