import { useState } from "react";
import FileUpload from "./components/FileUpload";
import Results from "./components/Results";
import ViewerPanel from "./components/ViewerPanel";
import { ToastContainer } from "react-toastify";
import "./App.css";

export default function App() {
  const [results, setResults] = useState({ Names: [], Plates: [] });
  const [mode, setMode] = useState("smart"); // "smart" | "viewer"
  const [loading, setLoading] = useState(false);

  return (
    <div className="root-bg">
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">🔍 PDF/Excel Search Tool</h1>

          <div className="mode-switch">
            <button
              className={`mode-card ${mode === "smart" ? "active" : ""}`}
              onClick={() => setMode("smart")}
              aria-pressed={mode === "smart"}
            >
              <div className="mode-icon">🔎</div>
              <div className="mode-texts">
                <div className="mode-title">Έξυπνη Ανάλυση</div>
                <div className="mode-sub">Αναζήτηση & ποσοστιαία ανάλυση</div>
              </div>
            </button>

            <button
              className={`mode-card ${mode === "viewer" ? "active" : ""}`}
              onClick={() => setMode("viewer")}
              aria-pressed={mode === "viewer"}
            >
              <div className="mode-icon">⚡</div>
              <div className="mode-texts">
                <div className="mode-title">Άμεση Προβολή</div>
                <div className="mode-sub">Απλή Αναζήτηση browser-like (Ctrl+F)</div>
              </div>
            </button>
          </div>
        </header>

        <main className="content">
          {mode === "smart" ? (
            <section className="panel viewer-panel">
             
              <div className="viewer-placeholder">
                <div className="viewer-dash">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>

                <div className="viewer-body"> 
                  <FileUpload setResults={setResults} loading={loading} setLoading={setLoading}/>
                  <div className="results-box panel" style={{ marginTop: "16px" }}>
                  <Results results={results} loading={loading}/>
                  </div>
                  <ToastContainer position="top-right" autoClose={3000} />
                </div>
              </div>
            </section>
          ) : (
            <section className="panel viewer-panel">
             
              <div className="viewer-placeholder">
                <div className="viewer-dash">
                  <span className="dot" />
                  <span className="dot" />
                  <span className="dot" />
                </div>

                <div className="viewer-body">
                    <ViewerPanel />
                    <ToastContainer position="top-right" autoClose={3000} />
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
