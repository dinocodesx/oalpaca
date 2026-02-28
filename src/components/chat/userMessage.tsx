import type { ChatMessage } from "../../types/chat";
import "./userMessage.css";

// Props for the UserMessage component
interface UserMessageProps {
  message: ChatMessage;
  isFirst: boolean;
}

// Renders a user message. Displays as heading if it's the first message in chat, otherwise as regular follow-up text.
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
