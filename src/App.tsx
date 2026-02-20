import { useState } from "react";
import reactLogo from "./assets/react.svg";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";
import ListOfModels from "./screens/settings/models/listModels";

interface ModelDetails {
  format: string;
  family: string;
  families: string[];
  parameter_size: string;
  quantization_level: string;
}

interface Model {
  name: string;
  model: string;
  modified_at: string;
  size: number;
  digest: string;
  details: ModelDetails;
}

function App() {
  const [greetMsg, setGreetMsg] = useState("");
  const [name, setName] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [showModels, setShowModels] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function greet() {
    // Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
    setGreetMsg(await invoke("greet", { name }));
  }

  async function fetchModels() {
    setLoading(true);
    setError("");
    try {
      const result = await invoke<Model[]>("list_ollama_models");
      setModels(result);
      setShowModels(true);
    } catch (err) {
      setError(err as string);
      console.error("Failed to fetch models:", err);
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setShowModels(false);
  }

  if (showModels) {
    return <ListOfModels models={models} onBack={goBack} />;
  }

  return (
    <main className="container">
      <h1>Welcome to Tauri + React</h1>

      <div className="row">
        <a href="https://vite.dev" target="_blank">
          <img src="/vite.svg" className="logo vite" alt="Vite logo" />
        </a>
        <a href="https://tauri.app" target="_blank">
          <img src="/tauri.svg" className="logo tauri" alt="Tauri logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <p>Click on the Tauri, Vite, and React logos to learn more.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          greet();
        }}
      >
        <input
          id="greet-input"
          onChange={(e) => setName(e.currentTarget.value)}
          placeholder="Enter a name..."
        />
        <button type="submit">Greet</button>
      </form>
      <p>{greetMsg}</p>

      <div className="row" style={{ marginTop: "20px" }}>
        <button
          onClick={fetchModels}
          disabled={loading}
          style={{
            padding: "10px 20px",
            backgroundColor: "#0078d4",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: loading ? "not-allowed" : "pointer",
            fontSize: "16px",
          }}
        >
          {loading ? "Loading..." : "Show Ollama Models"}
        </button>
      </div>

      {error && (
        <div style={{ color: "red", marginTop: "10px" }}>
          <p>Error: {error}</p>
          <p>Make sure Ollama is running on localhost:11434</p>
        </div>
      )}
    </main>
  );
}

export default App;
