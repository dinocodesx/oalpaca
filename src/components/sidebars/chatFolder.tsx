import { useState, useRef, useEffect } from "react";
import {
  ChevronRightIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
  ChatBubbleIcon,
} from "@radix-ui/react-icons";
import type { FolderMeta } from "../../types/folder";
import type { ChatMeta } from "../../types/chat";
import "./chatFolder.css";

interface ChatFolderProps {
  folder: FolderMeta;
  chats: ChatMeta[];
  currentChatId: string | null;
  onLoadChat: (chatId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
  // Folder membership
  allFolders?: FolderMeta[];
  onMoveToFolder?: (chatId: string, folderId: string) => void;
  onRemoveChatFromFolder?: (chatId: string) => void;
}

export default function ChatFolder({
  folder,
  chats,
  currentChatId,
  onLoadChat,
  onRenameFolder,
  onDeleteFolder,
  onRenameChat,
  onDeleteChat,
  allFolders = [],
  onMoveToFolder,
  onRemoveChatFromFolder,
}: ChatFolderProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [chatRenameValue, setChatRenameValue] = useState("");
  const [contextMenu, setContextMenu] = useState<{
    type: "folder" | "chat";
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [contextFolderExpanded, setContextFolderExpanded] = useState(false);

  // Drag-and-drop state
  const [isDragOver, setIsDragOver] = useState(false);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const chatRenameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Auto-expand if any chat inside is active
  useEffect(() => {
    if (chats.some((c) => c.id === currentChatId)) {
      setIsExpanded(true);
    }
  }, [currentChatId, chats]);

  // Auto-focus rename inputs
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  useEffect(() => {
    if (renamingChatId && chatRenameInputRef.current) {
      chatRenameInputRef.current.focus();
      chatRenameInputRef.current.select();
    }
  }, [renamingChatId]);

  // Close context menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
        setContextFolderExpanded(false);
      }
    }
    if (contextMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  const handleFolderRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) {
      onRenameFolder(folder.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleChatRename = (chatId: string) => {
    const trimmed = chatRenameValue.trim();
    if (trimmed) {
      onRenameChat(chatId, trimmed);
    }
    setRenamingChatId(null);
    setChatRenameValue("");
  };

  const handleContextMenu = (
    e: React.MouseEvent,
    type: "folder" | "chat",
    id: string,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setContextFolderExpanded(false);
    setContextMenu({ type, id, x: e.clientX, y: e.clientY });
  };

  const handleContextAction = (action: "rename" | "delete") => {
    if (!contextMenu) return;

    if (contextMenu.type === "folder") {
      if (action === "rename") {
        setRenameValue(folder.name);
        setIsRenaming(true);
      } else {
        onDeleteFolder(folder.id);
      }
    } else {
      if (action === "rename") {
        const chat = chats.find((c) => c.id === contextMenu.id);
        if (chat) {
          setChatRenameValue(chat.chat_title);
          setRenamingChatId(contextMenu.id);
        }
      } else {
        onDeleteChat(contextMenu.id);
      }
    }

    setContextMenu(null);
  };

  // ── Drag-and-drop: folder as DROP TARGET ────────────────────────
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear when the pointer truly leaves the drop-zone div,
    // not when it moves between child elements inside it.
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);

    const chatId = e.dataTransfer.getData("text/plain");
    if (!chatId) return;

    // Don't move if it's already in this folder
    const isAlreadyHere = chats.some((c) => c.id === chatId);
    if (isAlreadyHere) return;

    onMoveToFolder?.(chatId, folder.id);
    // Expand folder so the user can see the moved chat
    setIsExpanded(true);
  };

  // ── Drag-and-drop: chat items as DRAG SOURCES ───────────────────
  const handleChatDragStart = (e: React.DragEvent, chatId: string) => {
    e.dataTransfer.setData("text/plain", chatId);
    e.dataTransfer.effectAllowed = "move";
  };

  // ── Context menu: move chat to another folder ───────────────────
  const handleMoveToFolder = (chatId: string, targetFolderId: string) => {
    onMoveToFolder?.(chatId, targetFolderId);
    setContextMenu(null);
    setContextFolderExpanded(false);
  };

  const handleRemoveChatFromFolder = (chatId: string) => {
    onRemoveChatFromFolder?.(chatId);
    setContextMenu(null);
  };

  // Other folders this chat could move to (excluding the current folder)
  const otherFolders = allFolders.filter((f) => f.id !== folder.id);

  return (
    <div className="chat-folder">
      {/* Drop-zone wrapper div — more reliable than a button as a drop target */}
      {isRenaming ? (
        <div className="chat-folder-rename-row">
          <input
            ref={renameInputRef}
            className="chat-folder-rename-input"
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleFolderRename();
              if (e.key === "Escape") setIsRenaming(false);
            }}
            onBlur={handleFolderRename}
            placeholder="Folder name"
          />
          <button
            className="chat-folder-rename-btn chat-folder-rename-confirm"
            onClick={handleFolderRename}
            title="Confirm"
          >
            <CheckIcon width={12} height={12} />
          </button>
          <button
            className="chat-folder-rename-btn chat-folder-rename-cancel"
            onClick={() => setIsRenaming(false)}
            title="Cancel"
          >
            <Cross2Icon width={12} height={12} />
          </button>
        </div>
      ) : (
        <div
          className={`chat-folder-drop-zone ${isDragOver ? "chat-folder-header-drag-over" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <button
            className="chat-folder-header"
            onClick={() => setIsExpanded(!isExpanded)}
            onContextMenu={(e) => handleContextMenu(e, "folder", folder.id)}
          >
            <ChevronRightIcon
              className={`chat-folder-chevron ${isExpanded ? "chat-folder-chevron-expanded" : ""}`}
              width={14}
              height={14}
            />
            <span className="chat-folder-name">{folder.name}</span>
            {isDragOver ? (
              <span className="chat-folder-drop-hint">Drop here</span>
            ) : (
              <span className="chat-folder-count">{chats.length}</span>
            )}
            <div className="chat-folder-actions">
              <button
                className="chat-folder-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setRenameValue(folder.name);
                  setIsRenaming(true);
                }}
                title="Rename folder"
              >
                <Pencil1Icon width={12} height={12} />
              </button>
              <button
                className="chat-folder-action-btn chat-folder-action-btn-danger"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteFolder(folder.id);
                }}
                title="Delete folder"
              >
                <TrashIcon width={12} height={12} />
              </button>
            </div>
          </button>
        </div>
      )}

      {/* Folder children (chats) */}
      {isExpanded && (
        <div className="chat-folder-children">
          {chats.length === 0 ? (
            <div className="chat-folder-empty">No chats in this folder</div>
          ) : (
            chats.map((chat) => (
              <div key={chat.id} className="chat-folder-chat-wrapper">
                {renamingChatId === chat.id ? (
                  <div className="chat-folder-chat-rename-row">
                    <input
                      ref={chatRenameInputRef}
                      className="chat-folder-rename-input"
                      value={chatRenameValue}
                      onChange={(e) => setChatRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleChatRename(chat.id);
                        if (e.key === "Escape") setRenamingChatId(null);
                      }}
                      onBlur={() => handleChatRename(chat.id)}
                      placeholder="Chat title"
                    />
                    <button
                      className="chat-folder-rename-btn chat-folder-rename-confirm"
                      onClick={() => handleChatRename(chat.id)}
                      title="Confirm"
                    >
                      <CheckIcon width={11} height={11} />
                    </button>
                    <button
                      className="chat-folder-rename-btn chat-folder-rename-cancel"
                      onClick={() => setRenamingChatId(null)}
                      title="Cancel"
                    >
                      <Cross2Icon width={11} height={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    className={`chat-folder-chat-item ${currentChatId === chat.id ? "chat-folder-chat-item-active" : ""}`}
                    onClick={() => onLoadChat(chat.id)}
                    onContextMenu={(e) => handleContextMenu(e, "chat", chat.id)}
                    title={chat.chat_title}
                    draggable
                    onDragStart={(e) => handleChatDragStart(e, chat.id)}
                  >
                    <ChatBubbleIcon
                      className="chat-folder-chat-icon"
                      width={13}
                      height={13}
                    />
                    <span className="chat-folder-chat-title">
                      {chat.chat_title}
                    </span>
                    <div className="chat-folder-chat-actions">
                      <button
                        className="chat-folder-action-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setChatRenameValue(chat.chat_title);
                          setRenamingChatId(chat.id);
                        }}
                        title="Rename chat"
                      >
                        <Pencil1Icon width={11} height={11} />
                      </button>
                      <button
                        className="chat-folder-action-btn chat-folder-action-btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteChat(chat.id);
                        }}
                        title="Delete chat"
                      >
                        <TrashIcon width={11} height={11} />
                      </button>
                    </div>
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="chat-folder-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
        >
          <button
            className="chat-folder-context-item"
            onClick={() => handleContextAction("rename")}
          >
            <Pencil1Icon width={13} height={13} />
            <span>Rename</span>
          </button>

          {/* For chat items: show folder membership options */}
          {contextMenu.type === "chat" && (
            <>
              <div className="chat-folder-context-divider" />

              {/* Remove from this folder */}
              <button
                className="chat-folder-context-item"
                onClick={() => handleRemoveChatFromFolder(contextMenu.id)}
              >
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                  <line x1="9" y1="14" x2="15" y2="14" />
                </svg>
                <span>Remove from folder</span>
              </button>

              {/* Move to another folder (only if other folders exist) */}
              {otherFolders.length > 0 && (
                <>
                  <button
                    className={`chat-folder-context-item chat-folder-context-item-expandable ${contextFolderExpanded ? "chat-folder-context-item-expanded" : ""}`}
                    onClick={() => setContextFolderExpanded((prev) => !prev)}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                      <line x1="12" y1="11" x2="12" y2="17" />
                      <line x1="9" y1="14" x2="15" y2="14" />
                    </svg>
                    <span>Move to folder</span>
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: contextFolderExpanded
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 0.15s ease",
                        marginLeft: "auto",
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>

                  {contextFolderExpanded && (
                    <div className="chat-folder-context-folder-list">
                      {otherFolders.map((f) => (
                        <button
                          key={f.id}
                          className="chat-folder-context-item chat-folder-context-folder-option"
                          onClick={() =>
                            handleMoveToFolder(contextMenu.id, f.id)
                          }
                        >
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          <span>{f.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="chat-folder-context-divider" />
            </>
          )}

          <button
            className="chat-folder-context-item chat-folder-context-item-danger"
            onClick={() => handleContextAction("delete")}
          >
            <TrashIcon width={13} height={13} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
