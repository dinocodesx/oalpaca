import type { ChatMessage } from "../../types/chat";
import "./userMessage.css";

interface UserMessageProps {
  message: ChatMessage;
  isFirst: boolean;
}

export default function UserMessage({ message, isFirst }: UserMessageProps) {
  return (
    <div className="user-message">
      {isFirst ? (
        <h1 className="user-message-heading">{message.content}</h1>
      ) : (
        <p className="user-message-followup">{message.content}</p>
      )}
    </div>
  );
}
