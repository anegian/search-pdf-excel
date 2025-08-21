import { useState } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FaFilePdf, FaFileExcel, FaFileWord } from "react-icons/fa";

export default function FileUpload({ setResults, loading, setLoading }) {
  const [file, setFile] = useState(null);
  // state for manual extract of numbers
  const [filterNames, setFilterNames] = useState(false);
  const [fileType, setFileType] = useState(null);
  const [fuzzyThreshold,setFuzzyThreshold] = useState(79); //default threshold
   

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      setFileType(extension);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast.error("Επίλεξε αρχείο πρώτα!");
      return;
    }
    setLoading(true); // ξεκινάει το spinner

    const formData = new FormData();
    formData.append("file", file);
    formData.append("filter_names", filterNames);
    formData.append("fuzzy_threshold", fuzzyThreshold)

     // ✅ Debug: δες τι στέλνει το FormData
    console.log("File object:", file);
    console.log("FormData entries:");
    for (let pair of formData.entries()) {
      console.log(pair[0], pair[1]);
    }

    try {
      const res = await fetch("http://127.0.0.1:5000/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Backend data:", data);

      setResults({
        Names: data.results?.Names || [],
        Plates: data.results?.Plates || [],
      });
      toast.success("Η ανάλυση ολοκληρώθηκε!");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Σφάλμα κατά την ανάλυση. Δες την κονσόλα.");
      setResults({ Names: [], Plates: [] });
    } finally {
      setLoading(false); // σταματάει το spinner
    }
  };

  return (
    <div >
      <h2>Έξυπνη Ανάλυση</h2>

      <div className="upload-box">

        <div className="input-with-icon">
          <div className="input-first-inner">
            <label htmlFor="fileInput" className="upload-label">
              Επιλέξτε Αρχείο:
            </label> 
            <input
              type="file"
              onChange={handleFileChange}
              accept=".pdf,.xls,.xlsx,.doc,.docx"
              className="upload-input"
            />

            {/* Προεπισκόπηση αρχείου με icon */}
            {fileType && (
              <div 
                    className="file-preview" 
                    style={{

                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: "40px",
                        height: "40px",
                        border: "1px solid #ccc",
                        borderRadius: "8px",
                        backgroundColor: "#f9f9f9"
                    }}
                >
                  {fileType === "pdf" && <FaFilePdf color="red" size={30} />}
                  {(fileType === "xlsx" || fileType === "xls") && <FaFileExcel color="green" size={30} />}
                  {(fileType === "docx" || fileType === "doc") && <FaFileWord color="blue" size={30} />}
              </div>
            )}
          </div>

          {/* ✅ Checkbox επιλογής */}
          <div className="filters-settings">
           <div className="filters-settings-inner">
            <label style={{ paddingLeft: "16px" }}>
              <input
                type="checkbox"
                checked={filterNames}
                onChange={(e) => setFilterNames(e.target.checked)}
              /> 
              
              <span className="info-text">Μόνο Ονόματα</span>
            </label>
           </div>

            {/* Range slider για fuzzy threshold */}
            <div className="filters-settings-inner">
              <label>
                  Ποσοστό Ταύτισης:{" "}
                  <span style={{ color: "orange" }}>{fuzzyThreshold}%</span>
                <input
                  type="range"
                  min={60}
                  max={100}
                  step={1}
                  value={fuzzyThreshold}
                  onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                  style={{ width: "80%", marginTop: "4px", 
                    background: `linear-gradient(to right, #4cc9f0 ${(fuzzyThreshold - 60) / 40 * 100}%, 
                    #f2f2f2 ${(fuzzyThreshold - 60) / 40 * 100}%)`
                   }}
                  className="custom-slider"
                />
              </label>
            </div>
          </div> 

        </div>

          <button className="upload-button" onClick={handleUpload} disabled={loading}>
            {loading ? "Ανάλυση..." : "Ανάλυση / Αναζήτηση"}
          </button>

      </div>
        
    </div>
  );
}
