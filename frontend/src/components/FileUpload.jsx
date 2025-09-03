import { useState } from "react";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FaFilePdf, FaFileExcel, FaFileWord, FaFilter } from "react-icons/fa";


export default function FileUpload({ setResults, loading, setLoading }) {
  const [file, setFile] = useState(null);
  // state for manual extract of numbers
  const [fileType, setFileType] = useState(null);
  const [filterText, setFilterText] = useState(null);
  const [filterType,setFilterType] = useState(null);
  const [fuzzyThreshold,setFuzzyThreshold] = useState(82); //default threshold
  const [filterMode, setFilterMode] = useState("plates"); // default: filters.txt
  const resetStates = () => {
    setFile(null);
    setFilterText(null);
    setFileType(null);
    setFilterType(null);
    setFuzzyThreshold(82); // reset στο default
    setResults({ Names: [], Plates: [] }); // καθαρισμός αποτελεσμάτων
  }; 

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    setFile(selectedFile);

    if (selectedFile) {
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      setFileType(extension);
    }
  };

  const handleFilterChange = (e) => {
    const selectedFile = e.target.files[0];

    // Καθαρισμός του παλιού filter
    setFilterText(null);
    setFilterType(null);

    if (selectedFile) {
      setFilterText(selectedFile);
      const extension = selectedFile.name.split('.').pop().toLowerCase();
      setFilterType(extension);
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
    if (filterText) {
      formData.append("filter_file", filterText);
    }
    formData.append("filter_names", filterMode === "names");
    formData.append("fuzzy_threshold", fuzzyThreshold)
    formData.append("filter_mode", filterMode);

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
            <div className="input-filetype">
              <label htmlFor="fileInput" className="upload-label">
                {file ? (
                    <>
                        <span className="file-label-text">Επιλέξατε:</span>{" "}
                        <span
                        className={`file-name-text ${fileType}`}
                        >
                        {file.name}
                        </span>
                    </>
                    ) : (
                    <span className="select-file-text">Επιλέξτε Αρχείο:</span>
                    )} 
              </label> 
              <div className="relative w-full max-w-[300px]">     
                <input
                  id="fileInput"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.xls,.xlsx,.doc,.docx"
                  className="upload-input"
                />

                {file && (
                    <span
                      className="close-btn"
                      onClick={() => {
                        setFileType(null);
                        setFile(null);
                       }}
                    >
                      ❌
                    </span>
                )}

              </div> 
              
              {/* Προεπισκόπηση αρχείου με icon */}
                {fileType && (
                  <div className="file-preview">
                      {fileType === "pdf" && <FaFilePdf color="red" size={30} />}
                      {(fileType === "xlsx" || fileType === "xls") && <FaFileExcel color="green" size={30} />}
                      {(fileType === "docx" || fileType === "doc") && <FaFileWord color="blue" size={30} />}
                  </div>
                )}
            </div>
          </div>

        </div>
          {/* Input for filter text */}  
          <div className="input-filter-text">
            <div className="input-first-inner">
              <div className="input-filetype">
              <label htmlFor="filterInput" className="upload-label filter-text">
                {filterText ? (
                    <>
                        <span className="file-label-text">Επιλέξατε:</span>{" "}
                        <span
                        className={`file-name-text ${filterType}`}
                        >
                        {filterText.name}
                        </span>
                    </>
                    ) : (
                    <span className="select-file-text">Επιλέξτε Φίλτρο:</span>
                    )} 
              </label> 
              <div className="relative w-full max-w-[300px]">
              <input
                id="filterInput"
                type="file"
                onChange={handleFilterChange}
                accept=".txt"
                className="upload-input"
                onClick={(e) => (e.target.value = null)} // καθαρίζει την προηγούμενη επιλογή
              />
              {filterText && (
                <span
                  className="close-btn"
                  onClick={() => {
                    setFilterText(null);
                    setFilterType(null);
                    setFilterMode("plates"); // επαναφορά default
                  }}
                >
                  ❌
                </span>
              )}
              </div>

              {/* Προεπισκόπηση αρχείου με icon */}
              {filterType && (
                <div className="file-preview">
                    {filterType === "txt" && <FaFilter color="grey" size={20} />}                      
                </div>
              )}
            </div>   
          </div>

            {/* ✅ Checkbox επιλογής ΠΙΝΑΚΙΔΕΣ ή ΜΟΝΟ ΟΝΟΜΑΤΑ */}
            <div className="filters-settings">

              <div className="middle">
                  <div className="filters-settings-inner">
                    <label >
                      <input
                        type="radio"
                        name="filterMode"
                        checked={filterMode === "plates"}
                         onChange={(e) => {
                          setFilterMode("plates");
                        }}
                        disabled={!!filterText}
                      />                 
                      <span className="info-text plates">Πινακίδες & Επίθετα</span>
                    </label>
                  </div>
                  <div className="filters-settings-inner">
                    <label>
                      <input
                        type="radio"
                        name="filterMode"
                        checked={filterMode === "names"}
                        onChange={(e) => {
                          setFilterMode("names");
                        }}
                        disabled={!!filterText}
                      /> 
                      <span className="info-text">Μόνο Ονόματα</span>
                    </label>
                  </div>
              </div>

              {/* Range slider για fuzzy threshold */}
              <div className="filters-settings-inner right">
                <label>
                    Ποσοστό Ταύτισης:{" "}
                    <span style={{ color: "orange" }}>{fuzzyThreshold}%</span>
                  <input
                    type="range"
                    min={65}
                    max={100}
                    step={1}
                    value={fuzzyThreshold}
                    onChange={(e) => setFuzzyThreshold(Number(e.target.value))}
                    style={{ width: "80%", marginTop: "4px", 
                      background: `linear-gradient(to right, #4cc9f0 ${((fuzzyThreshold - 65) / 35) * 100}%, 
                      #f2f2f2 ${((fuzzyThreshold - 65) / 35) * 100}%)`
                    }}
                    className="custom-slider"
                  />
                </label>
              </div>
            </div> 
          </div>

          <div className="upload-buttons-line">       
            <button className="upload-button" onClick={handleUpload} disabled={loading}>
              {loading ? "Φόρτωση δεδομένων..." : "Ανάλυση / Αναζήτηση"}
            </button>

            <button 
              className="reset-button"
              onClick={resetStates}
              >
                🗑️ <span className="reset-text">Καθαρισμός</span>
            </button>
          </div>           
      </div>
    </div>
  );
}
