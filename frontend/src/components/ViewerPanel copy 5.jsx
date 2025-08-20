import { useState, useRef, useEffect } from "react";
import { Viewer, Worker } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";
import * as pdfjsLib from "pdfjs-dist/build/pdf";

export default function ViewerPanel() {
    const [pdfUrl, setPdfUrl] = useState(null);
    const [filters, setFilters] = useState([]);
    const [foundKeywords, setFoundKeywords] = useState([]);

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
        fetch("http://localhost:5000/filters.txt")
            .then(res => res.text())
            .then(text => {
                const words = text.split(/\r?\n/).filter(Boolean);
                setFilters(words);
            })
            .catch((err) => console.error("Σφάλμα φόρτωσης filters.txt:", err));
    }, []);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setPdfUrl(URL.createObjectURL(file));
        setFoundKeywords([]);
        resultsRef.current.clear();
    };

    const handleSearch = async () => {
    if (!pdfUrl || filters.length === 0) return;
    setFoundKeywords([]); // reset

    const loadingTask = pdfjsLib.getDocument(pdfUrl);
    const pdfDoc = await loadingTask.promise;

    const allMatches = {}; // { keyword: [σελίδες] }

    for (let i = 1; i <= pdfDoc.numPages; i++) {
        const page = await pdfDoc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");

        // Βρίσκουμε όλα τα matches σε κάθε σελίδα
        filters.forEach(word => {
            if (pageText.includes(word)) {
                if (!allMatches[word]) allMatches[word] = [];
                allMatches[word].push(i); // αποθηκεύουμε σελίδα
            }
        });
    }

    // Highlight όλων των keywords μαζί μέσω plugin
    filters.forEach(word => searchPluginInstance.highlight({ keyword: word }));

    // Μετατρέπουμε σε array για render
    const resultsArray = Object.entries(allMatches).map(([keyword, pages]) => ({
        keyword,
        pages
    }));

    setFoundKeywords(resultsArray);
};


    return (
        <div>
            <h2>Άμεση Προβολή</h2>

            <div className="upload-box">
             <label className="upload-label">
                    Επιλέξτε PDF:
                    <input type="file" 
                    onChange={handleFileChange} 
                    accept="application/pdf" 
                    className="upload-input"/>
                </label>
                
                <button className="upload-button" onClick={handleSearch}>Αναζήτηση</button>
            </div>

            <div className="results-box panel"  
                style={{
                    marginTop: "16px",
                    display: "flex",
                    flexDirection: "column",
                    maxHeight: "300px", // ύψος που θες
                    overflowY: "auto",
                    padding: "8px",
                }}>

                <h2>Αποτελέσματα</h2>
                {foundKeywords.length === 0 ? (
                    <p>Δεν βρέθηκαν αποτελέσματα.</p>
                ) : (
                    <ul>
                        {foundKeywords.map((kw, index) => (
                            <li key={index}>{kw}</li>
                        ))}
                    </ul>
                )}
            </div>

            {pdfUrl && (
                <div style={{ height: "80vh", marginTop: "16px", border: "1px solid #ccc" }}>
                    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                        <Viewer fileUrl={pdfUrl} plugins={[searchPluginInstance]} />
                    </Worker>
                </div>
            )}

            
        </div>
    );
}
