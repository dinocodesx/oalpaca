import type { ChatMeta } from "../../types/chat";
import "./chatTilte.css";

interface ChatTitleProps {
  chat: ChatMeta;
  isActive: boolean;
  onClick: () => void;
}

export default function ChatTitle({ chat, isActive, onClick }: ChatTitleProps) {
  return (
    <button
      className={`chat-title-item ${isActive ? "chat-title-active" : ""}`}
      onClick={onClick}
      title={chat.chat_title}
    >
      <span className="chat-title-text">{chat.chat_title}</span>
    </button>
  );
}
