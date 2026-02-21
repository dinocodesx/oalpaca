import type { ChatMeta } from "../../types/chat";
import ChatTitle from "./chatTilte";
import "./leftSidebar.css";

interface LeftSidebarProps {
  isOpen: boolean;
  chatHistory: ChatMeta[];
  currentChatId: string | null;
  onNewChat: () => void;
  onLoadChat: (chatId: string) => void;
  onToggle: () => void;
}

export default function LeftSidebar({
  isOpen,
  chatHistory,
  currentChatId,
  onNewChat,
  onLoadChat,
  onToggle,
}: LeftSidebarProps) {
  const recentChats = [...chatHistory].reverse();

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && <div className="sidebar-overlay" onClick={onToggle} />}

      <aside className={`left-sidebar ${isOpen ? "left-sidebar-open" : ""}`}>
        {/* Workspace header */}
        <div className="sidebar-workspace">
          <div className="workspace-info">
            <div className="workspace-icon">
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                <line x1="9" y1="9" x2="9.01" y2="9" />
                <line x1="15" y1="9" x2="15.01" y2="9" />
              </svg>
            </div>
            <span className="workspace-name">Oalpaca</span>
          </div>
          <button
            className="sidebar-new-chat-btn"
            onClick={onNewChat}
            title="New chat"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h9" />
              <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </button>
        </div>

        {/* Navigation */}
        <nav className="sidebar-nav">
          <button className="sidebar-nav-item" onClick={onNewChat}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Home</span>
          </button>
        </nav>

        {/* Recent chats */}
        <div className="sidebar-section">
          <div className="sidebar-section-header">
            <span className="sidebar-section-label">Recent</span>
          </div>
          <div className="sidebar-section-list">
            {recentChats.length === 0 ? (
              <div className="sidebar-empty">No conversations yet</div>
            ) : (
              recentChats.map((chat) => (
                <ChatTitle
                  key={chat.id}
                  chat={chat}
                  isActive={currentChatId === chat.id}
                  onClick={() => onLoadChat(chat.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Bottom spacer */}
        <div className="sidebar-spacer" />
      </aside>
    </>
  );
}
