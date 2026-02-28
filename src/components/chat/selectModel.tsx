import type { Model } from "../../types/model";
import "./selectModel.css";

// Props for the SelectModel component
interface SelectModelProps {
  models: Model[];
  selectedModel: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

// Dropdown component for selecting an Ollama model. Displays list of available models from Ollama API.
export default function SelectModel({
  models,
  selectedModel,
  onChange,
  disabled = false,
}: SelectModelProps) {
  return (
    <div className="select-model">
      <select
        className="select-model-native"
        value={selectedModel}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      >
        {models.length === 0 && <option value="">No models</option>}
        {models.map((m) => (
          <option key={m.digest} value={m.name}>
            {m.name}
          </option>
        ))}
      </select>
      <svg
        className="select-model-chevron"
        width="10"
        height="10"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <polyline points="6 9 12 15 18 9" />
      </svg>
    </div>
  );
}
