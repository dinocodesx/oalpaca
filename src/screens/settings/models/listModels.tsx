import React from "react";

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

interface ListOfModelsProps {
  models: Model[];
  onBack: () => void;
}

const ListOfModels: React.FC<ListOfModelsProps> = ({ models, onBack }) => {
  const formatSize = (bytes: number): string => {
    const sizes = ["B", "KB", "MB", "GB", "TB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round((bytes / Math.pow(1024, i)) * 100) / 100 + " " + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString();
    } catch {
      return dateString;
    }
  };

  return (
    <div
      className="container"
      style={{
        backgroundColor: "#0e0e0e",
        color: "white",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div style={{ marginBottom: "20px" }}>
        <button
          onClick={onBack}
          style={{
            padding: "8px 16px",
            backgroundColor: "#666",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
      </div>

      <h1>Ollama Models</h1>

      {models.length === 0 ? (
        <p>
          No models found. Make sure Ollama is running and has models installed.
        </p>
      ) : (
        <div style={{ display: "grid", gap: "16px" }}>
          {models.map((model) => (
            <div
              key={model.digest}
              style={{
                border: "1px solid #444",
                borderRadius: "8px",
                padding: "16px",
                backgroundColor: "#1a1a1a",
              }}
            >
              <h3 style={{ margin: "0 0 8px 0", color: "white" }}>
                {model.name}
              </h3>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "8px",
                  fontSize: "14px",
                }}
              >
                <div>
                  <strong>Family:</strong> {model.details.family}
                </div>
                <div>
                  <strong>Size:</strong> {formatSize(model.size)}
                </div>
                <div>
                  <strong>Parameters:</strong> {model.details.parameter_size}
                </div>
                <div>
                  <strong>Quantization:</strong>{" "}
                  {model.details.quantization_level}
                </div>
                <div>
                  <strong>Format:</strong> {model.details.format}
                </div>
                <div>
                  <strong>Modified:</strong> {formatDate(model.modified_at)}
                </div>
              </div>

              <details style={{ marginTop: "12px" }}>
                <summary
                  style={{
                    cursor: "pointer",
                    fontSize: "12px",
                    color: "#aaa",
                  }}
                >
                  More Details
                </summary>
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "12px",
                    color: "#ccc",
                  }}
                >
                  <div>
                    <strong>Model ID:</strong> {model.model}
                  </div>
                  <div>
                    <strong>Families:</strong>{" "}
                    {model.details.families.join(", ")}
                  </div>
                  <div>
                    <strong>Digest:</strong>{" "}
                    <code style={{ fontSize: "10px", color: "#ddd" }}>
                      {model.digest}
                    </code>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ListOfModels;
