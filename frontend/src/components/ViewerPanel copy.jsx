import { useState, useRef, useEffect } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";
import * as pdfjsLib from "pdfjs-dist/build/pdf";
import { toast } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { FaFilePdf, FaFileExcel, FaFileWord } from "react-icons/fa";
import * as XLSX from 'xlsx';

export default function ViewerPanel() {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [filters, setFilters] = useState([]);
    const [foundKeywords, setFoundKeywords] = useState([]);
    const [loading, setLoading] = useState(false);
    const [fileType, setFileType] = useState(null)
    const [excelContent, setExcelContent] = useState("");

    // Buffer για keywords που βρίσκονται
    const resultsRef = useRef(new Set());

    const searchPluginInstance = useRef(
        searchPlugin({
            onHighlightKeyword: (props) => {
                const kw = String(props.keyword).replace(/^\/|\/[gimsuy]*$/g, '');
                resultsRef.current.add(kw);
            }
        })
    ).current;

    // Φόρτωμα filters.txt από backend μόλις ανοίξει το component
    useEffect(() => {
        fetch("http://localhost:5000/lastnames.txt")
            .then(res => res.text())
            .then(text => {
                const words = text.split(/\r?\n/).filter(line => line && !line.startsWith("["));

                setFilters(words);
            })
            .catch((err) => console.error("Σφάλμα φόρτωσης lastnames.txt:", err));
    }, []);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const extension = file.name.split('.').pop().toLowerCase();
        setFileType(extension);
        setFoundKeywords([]);
        resultsRef.current.clear();

        if (extension === "xls" || extension === "xlsx") {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // array of arrays
            setExcelContent(rows);
        }

        if (extension === "pdf") {
          setPdfUrl(URL.createObjectURL(file));
        }

    };

    const handleSearch = async () => {
    if (!excelContent && !pdfUrl ) {
        toast.error("Επίλεξε αρχείο πρώτα!");
        return;
    }
    if (filters.length === 0) {
        toast.error("Επίλεξε φίλτρα πρώτα!");
        return;
    }
    setFoundKeywords([]); // reset
    setLoading(true); // ξεκινάει το loading
    const allMatches = {}; // { keyword: [σελίδες] }

    // ---- Normalization helper ----
    const normalize = (str) => {
        return str
            .toUpperCase()
            .replace(/\s+/g, " ")    // πολλά κενά -> 1 κενό
            .replace(/\u00A0/g, " ") // non-breaking space -> space
            .trim();
    };
    const normalizedFilters = filters.map(f => normalize(f));


    // Αναζήτηση στο Excel
    if (excelContent) {
        excelContent.forEach((row, rowIndex) => {
            filters.forEach(word => {

                if (row.join(" ").includes(word)) {
                    if (!allMatches[word]) allMatches[word] = [];
                    allMatches[word].push(`Γραμμή ${rowIndex + 1}`);
                }
            });
        });
    }
    
    if (pdfUrl) {
        try {
            const loadingTask = pdfjsLib.getDocument(pdfUrl);
            const pdfDoc = await loadingTask.promise;
            const highlightsToDo = new Set();

            for (let i = 1; i <= pdfDoc.numPages; i++) {
                // δίνουμε χρόνο στο UI
                await new Promise(r => setTimeout(r, 0));

                const page = await pdfDoc.getPage(i);
                const textContent = await page.getTextContent();
                const pageText = textContent.items.map(item => normalize(item.str)).join(" ");
                const tokens = pageText.split(/[\s/]+/);

                normalizedFilters.forEach((fullName, idx) => {
                    const nameTokens = fullName.split(" ");
                    let found = false;
                    for (let j = 0; j <= tokens.length - nameTokens.length; j++) {
                        if (nameTokens.every((tok, k) => tokens[j + k] === tok)) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        if (!allMatches[fullName]) allMatches[fullName] = [];
                        allMatches[fullName].push(`Σελίδα ${i}`);

                        // προσθέτουμε στο highlight μετά
                        nameTokens.forEach(tok => highlightsToDo.add(tok));
                    }
                });
            }

            // Κάνουμε highlight **μετά** το parsing
            highlightsToDo.forEach(tok => searchPluginInstance.highlight({ keyword: tok }));

        } catch (error) {
            console.error("PDF load error:", error);
        }
    }

    const resultsArray = Object.entries(allMatches).map(([keyword, pages]) => ({
        keyword,
        pages
    }));

    setFoundKeywords(resultsArray);
    setLoading(false);
    toast.success("Η αναζήτηση ολοκληρώθηκε!");
};


    return (
        <div>
            <h2>Άμεση Προβολή</h2>

            <div className="upload-box">

                    
                <div className="input-with-icon">
                    <div className="input-first-inner">
                        <label htmlFor="fileInput" className="upload-label">
                            {file ? `Επιλέξατε: ${file.name}` : "Επιλέξτε Αρχείο:"}
                            </label>
                        <input 
                        id="fileInput"
                        type="file" 
                        onChange={handleFileChange} 
                        accept=".pdf,.xls,.xlsx,.doc,.docx"
                        className="upload-input"/>
                    

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
                                    backgroundColor: "#f9f9f9",
                                    marginLeft: "8px"
                                }}
                            >
                                {fileType === "pdf" && <FaFilePdf color="red" size={30} />}
                                {(fileType === "xlsx" || fileType === "xls") && <FaFileExcel color="green" size={30} />}
                                {(fileType === "docx" || fileType === "doc") && <FaFileWord color="blue" size={30} />}
                            </div>
                        )}
                   </div>
                </div>

                
                <button className="upload-button" onClick={handleSearch}>Αναζήτηση</button>
            </div>

            <div className="results-box panel" style={{ marginTop: "16px" }}>

                <div className="results-box">
                
                <h2>Αποτελέσματα</h2>
                {foundKeywords.length === 0 ? (
                    <p>Δεν βρέθηκαν αποτελέσματα.</p>
                
                ) : (
                    <ul>
                        {foundKeywords.map(({ keyword, pages }, index) => (
                            <li key={index}>
                                {keyword} : {pages.join(", ")}
                            </li>
                        ))}
                    </ul>
                )}

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
            </div>

            { fileType === "pdf" && pdfUrl && (
                <div style={{ 
                    height: "80vh", 
                    marginTop: "16px", 
                    border: "1px solid #ccc" }}>
                    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                        <Viewer fileUrl={pdfUrl} plugins={[searchPluginInstance]} />
                    </Worker>
                </div>
            )}

            {(fileType === "xls" || fileType === "xlsx") && excelContent.length > 0 && (
                <div className="excel-container">
                   <table className="excel-table">
                        <thead>
                        <tr>
                            <th className="row-num"></th>
                            {excelContent[0].map((_, j) => (
                            <th key={j}>{String.fromCharCode(65 + j)}</th>
                            ))}
                        </tr>
                        </thead>
                        <tbody>
                        {excelContent.map((row, i) => (
                            <tr key={i}>
                            <td className="row-num">{i + 1}</td>
                            {row.map((cell, j) => (
                                <td key={j}>{cell}</td>
                            ))}
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                )}


            {(fileType === "docx") && excelContent.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                    {excelContent.map((p, i) => (
                        <p key={i}>{p}</p>
                    ))}
                </div>
            )}

            </div>
        </div>
    );
}
