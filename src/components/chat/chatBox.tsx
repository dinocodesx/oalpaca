import { useRef } from "react";
import type { Model } from "../../types/model";
import SelectModel from "./selectModel";
import "./chatBox.css";

// Props for the ChatBox component
interface ChatBoxProps {
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  models: Model[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  isStreaming: boolean;
}

// Main chat input component with textarea, model selector, and send button. Handles input changes, keyboard shortcuts, and sending messages.
export default function ChatBox({
  inputValue,
  onInputChange,
  onSend,
  models,
  selectedModel,
  onModelChange,
  isStreaming,
}: ChatBoxProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Handles Enter key to send message, Shift+Enter for new line
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  // Updates input value and auto-resizes textarea height up to 180px
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onInputChange(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 180) + "px";
  };

  /// Sends the message and resets textarea height
  const handleSendClick = () => {
    onSend();
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.focus();
    }
  };

  // Determines if send button should be enabled (non-empty input, not streaming, model selected)
  const canSend =
    inputValue.trim().length > 0 && !isStreaming && !!selectedModel;

  return (
    <div className="chatbox-wrapper">
      <div className="chatbox-container">
        <textarea
          ref={textareaRef}
          className="chatbox-textarea"
          placeholder="Ask anything..."
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={isStreaming}
          rows={1}
        />
        <div className="chatbox-controls">
          <SelectModel
            models={models}
            selectedModel={selectedModel}
            onChange={onModelChange}
            disabled={isStreaming}
          />
          <div className="chatbox-controls-right">
            <button
              className="chatbox-send-btn"
              onClick={handleSendClick}
              disabled={!canSend}
              title="Send message"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      <div className="chatbox-hint">
        Press <kbd>Enter</kbd> to send, <kbd>Shift+Enter</kbd> for new line
      </div>
    </div>
  );
}
