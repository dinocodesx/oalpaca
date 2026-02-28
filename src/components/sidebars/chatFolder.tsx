import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChevronRightIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
  ChatBubbleIcon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import type { FolderMeta } from "../../types/folder";
import type { ChatMeta } from "../../types/chat";
import "./chatFolder.css";

/** Reusable folder icon SVG for context menu and list. */
const FolderIcon = () => (
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
);

export interface ChatFolderProps {
  folder: FolderMeta;
  chats: ChatMeta[];
  currentChatId: string | null;
  onLoadChat: (chatId: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;
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
  // ——— State ———
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(folder.name);
  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [chatRenameValue, setChatRenameValue] = useState("");
  /** Right-click context menu: { type: 'folder'|'chat', id, position }. */
  const [contextMenu, setContextMenu] = useState<{
    type: "folder" | "chat";
    id: string;
    x: number;
    y: number;
  } | null>(null);
  const [contextFolderExpanded, setContextFolderExpanded] = useState(false);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const chatRenameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Auto-expand folder when the active chat is inside it.
  useEffect(() => {
    if (chats.some((c) => c.id === currentChatId)) setIsExpanded(true);
  }, [currentChatId, chats]);

  // Keep local rename value in sync when folder name changes from outside.
  useEffect(() => {
    setRenameValue(folder.name);
  }, [folder.name]);

  // Focus folder rename input when entering folder rename mode.
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

  // Focus chat rename input when entering chat rename mode.
  useEffect(() => {
    if (renamingChatId && chatRenameInputRef.current) {
      chatRenameInputRef.current.focus();
      chatRenameInputRef.current.select();
    }
  }, [renamingChatId]);

  // Close context menu when clicking outside.
  useEffect(() => {
    if (!contextMenu) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenu(null);
        setContextFolderExpanded(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // Keep context menu within viewport when opened or when its content expands.
  useEffect(() => {
    if (!contextMenu) return;
    const el = contextMenuRef.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - margin - rect.width;
    const maxY = window.innerHeight - margin - rect.height;
    const nextX = Math.min(
      Math.max(contextMenu.x, margin),
      Math.max(margin, maxX),
    );
    const nextY = Math.min(
      Math.max(contextMenu.y, margin),
      Math.max(margin, maxY),
    );
    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu((prev) => (prev ? { ...prev, x: nextX, y: nextY } : prev));
    }
  }, [contextMenu, contextFolderExpanded]);

  // ——— Handlers ———
  const handleFolderRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== folder.name) onRenameFolder(folder.id, trimmed);
    setIsRenaming(false);
  }, [renameValue, folder.id, folder.name, onRenameFolder]);

  const handleChatRename = useCallback(
    (chatId: string) => {
      const trimmed = chatRenameValue.trim();
      if (trimmed) onRenameChat(chatId, trimmed);
      setRenamingChatId(null);
      setChatRenameValue("");
    },
    [chatRenameValue, onRenameChat],
  );

  /** Open context menu at cursor; type and id identify the right-clicked item. */
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, type: "folder" | "chat", id: string) => {
      e.preventDefault();
      e.stopPropagation();
      setContextFolderExpanded(false);
      setContextMenu({ type, id, x: e.clientX, y: e.clientY });
    },
    [],
  );

  /** Handle Rename or Delete from context menu (for either folder or chat). */
  const handleContextAction = useCallback(
    (action: "rename" | "delete") => {
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
    },
    [contextMenu, folder.id, folder.name, chats, onDeleteFolder, onDeleteChat],
  );

  const handleMoveToFolder = useCallback(
    (chatId: string, targetFolderId: string) => {
      onMoveToFolder?.(chatId, targetFolderId);
      setContextMenu(null);
      setContextFolderExpanded(false);
    },
    [onMoveToFolder],
  );

  const handleRemoveChatFromFolder = useCallback(
    (chatId: string) => {
      onRemoveChatFromFolder?.(chatId);
      setContextMenu(null);
    },
    [onRemoveChatFromFolder],
  );

  /** Other folders (excluding this one) for "Move to folder" in context menu. */
  const otherFolders = allFolders.filter((f) => f.id !== folder.id);

  return (
    <div className="chat-folder">
      {/* Folder header: either inline rename row or clickable header with drop zone */}
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
            type="button"
            className="chat-folder-rename-btn chat-folder-rename-confirm"
            onClick={handleFolderRename}
            title="Confirm"
          >
            <CheckIcon width={12} height={12} />
          </button>
          <button
            type="button"
            className="chat-folder-rename-btn chat-folder-rename-cancel"
            onClick={() => setIsRenaming(false)}
            title="Cancel"
          >
            <Cross2Icon width={12} height={12} />
          </button>
        </div>
      ) : (
        <div className="chat-folder-drop-zone">
          <button
            type="button"
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
            <span className="chat-folder-count">{chats.length}</span>
            <div className="chat-folder-actions">
              <button
                type="button"
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
                type="button"
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

      {/* Expanded: list of chats in this folder (or empty state) */}
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
                      type="button"
                      className="chat-folder-rename-btn chat-folder-rename-confirm"
                      onClick={() => handleChatRename(chat.id)}
                      title="Confirm"
                    >
                      <CheckIcon width={11} height={11} />
                    </button>
                    <button
                      type="button"
                      className="chat-folder-rename-btn chat-folder-rename-cancel"
                      onClick={() => setRenamingChatId(null)}
                      title="Cancel"
                    >
                      <Cross2Icon width={11} height={11} />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className={`chat-folder-chat-item ${currentChatId === chat.id ? "chat-folder-chat-item-active" : ""}`}
                    onClick={() => onLoadChat(chat.id)}
                    onContextMenu={(e) => handleContextMenu(e, "chat", chat.id)}
                    title={chat.chat_title}
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
                        type="button"
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
                        type="button"
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

      {/* Right-click context menu: Rename, Remove from folder, Move to folder, Delete */}
      {contextMenu &&
        createPortal(
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
              type="button"
              className="chat-folder-context-item"
              onClick={() => handleContextAction("rename")}
            >
              <Pencil1Icon width={13} height={13} />
              <span>Rename</span>
            </button>

            {contextMenu.type === "chat" && (
              <>
                <div className="chat-folder-context-divider" />
                <button
                  type="button"
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
                {otherFolders.length > 0 && (
                  <>
                    <button
                      type="button"
                      className={`chat-folder-context-item chat-folder-context-item-expandable ${contextFolderExpanded ? "chat-folder-context-item-expanded" : ""}`}
                      onClick={() => setContextFolderExpanded((p) => !p)}
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
                      <ChevronDownIcon
                        width={10}
                        height={10}
                        style={{
                          transform: contextFolderExpanded
                            ? "rotate(180deg)"
                            : "rotate(0deg)",
                          transition: "transform 0.15s ease",
                          marginLeft: "auto",
                        }}
                      />
                    </button>
                    {contextFolderExpanded && (
                      <div className="chat-folder-context-folder-list">
                        {otherFolders.map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            className="chat-folder-context-item chat-folder-context-folder-option"
                            onClick={() =>
                              handleMoveToFolder(contextMenu.id, f.id)
                            }
                          >
                            <FolderIcon />
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
              type="button"
              className="chat-folder-context-item chat-folder-context-item-danger"
              onClick={() => handleContextAction("delete")}
            >
              <TrashIcon width={13} height={13} />
              <span>Delete</span>
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
