import { useState } from "react";
import { Worker, Viewer } from "@react-pdf-viewer/core";
import { searchPlugin } from "@react-pdf-viewer/search";
import "@react-pdf-viewer/core/lib/styles/index.css";
import "@react-pdf-viewer/search/lib/styles/index.css";

export default function ViewerPanel() {
    const [file, setFile] = useState(null);
    const [pdfUrl, setPdfUrl] = useState(null);
    const [filters, setFilters] = useState([]);

    const searchPluginInstance = searchPlugin();

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSearch = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("http://localhost:5000/viewer-search", {
        method: "POST",
        body: formData,
    });

    const data = await res.json();

    // Παίρνουμε **ολόκληρα matched strings** για highlight
    const allMatches = [];
    Object.values(data.results || {}).forEach(arr => {
        allMatches.push(...arr);
    });
    setFilters(allMatches);

    setPdfUrl(URL.createObjectURL(file));
};

const highlightFilters = () => {
    filters.forEach((text) => {
        searchPluginInstance.highlight({ keyword: text });
    });
};


    return (
        <div className="panel viewer-panel">
            <h2>Άμεση Προβολή</h2>
            <input type="file" onChange={handleFileChange} />
            <button onClick={handleSearch}>Αναζήτηση</button>

            {pdfUrl && (
                <div style={{ height: "80vh", border: "1px solid #ccc", marginTop: "1rem" }}>
                    <Worker workerUrl="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js">
                        <Viewer
                            fileUrl={pdfUrl}
                            plugins={[searchPluginInstance]}
                            onDocumentLoad={highlightFilters}
                        />
                    </Worker>
                </div>
            )}
        </div>
    );
}
