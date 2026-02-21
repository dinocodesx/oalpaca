import { useState, useRef, useEffect } from "react";
import {
  ChatBubbleIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import type { ChatMeta } from "../../types/chat";
import type { FolderMeta } from "../../types/folder";
import "./chatTilte.css";

interface ChatTitleProps {
  chat: ChatMeta;
  isActive: boolean;
  onClick: () => void;
  onRename: (chatId: string, newTitle: string) => void;
  onDelete: (chatId: string) => void;
  folders?: FolderMeta[];
  onMoveToFolder?: (chatId: string, folderId: string) => void;
  onRemoveFromFolder?: (chatId: string) => void;
}

export default function ChatTitle({
  chat,
  isActive,
  onClick,
  onRename,
  onDelete,
  folders = [],
  onMoveToFolder,
  onRemoveFromFolder,
}: ChatTitleProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.chat_title);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [contextFolderExpanded, setContextFolderExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const folderPickerRef = useRef<HTMLDivElement>(null);
  const folderBtnRef = useRef<HTMLButtonElement>(null);

  // Auto-focus rename input
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

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

  // Close folder picker on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        folderPickerRef.current &&
        !folderPickerRef.current.contains(e.target as Node) &&
        folderBtnRef.current &&
        !folderBtnRef.current.contains(e.target as Node)
      ) {
        setShowFolderPicker(false);
      }
    }
    if (showFolderPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFolderPicker]);

  const handleRename = () => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== chat.chat_title) {
      onRename(chat.id, trimmed);
    }
    setIsRenaming(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFolderPicker(false);
    setContextFolderExpanded(false);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const startRename = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRenameValue(chat.chat_title);
    setIsRenaming(true);
    setContextMenu(null);
  };

  const handleDelete = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onDelete(chat.id);
    setContextMenu(null);
  };

  // ── Drag handlers ──────────────────────────────
  const handleDragStart = (e: React.DragEvent) => {
    // Use text/plain for maximum WebView compatibility
    e.dataTransfer.setData("text/plain", chat.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // ── Folder picker (from hover button) ──────────
  const handleFolderBtnClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    setShowFolderPicker((prev) => !prev);
  };

  const handleMoveToFolder = (folderId: string) => {
    onMoveToFolder?.(chat.id, folderId);
    setShowFolderPicker(false);
    setContextMenu(null);
    setContextFolderExpanded(false);
  };

  const handleRemoveFromFolder = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onRemoveFromFolder?.(chat.id);
    setContextMenu(null);
  };

  if (isRenaming) {
    return (
      <div className="chat-title-rename-row">
        <input
          ref={renameInputRef}
          className="chat-title-rename-input"
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRename();
            if (e.key === "Escape") setIsRenaming(false);
          }}
          onBlur={handleRename}
          placeholder="Chat title"
        />
        <button
          className="chat-title-rename-btn chat-title-rename-confirm"
          onClick={handleRename}
          title="Confirm"
        >
          <CheckIcon width={12} height={12} />
        </button>
        <button
          className="chat-title-rename-btn chat-title-rename-cancel"
          onClick={() => setIsRenaming(false)}
          title="Cancel"
        >
          <Cross2Icon width={12} height={12} />
        </button>
      </div>
    );
  }

  const hasFolders = folders.length > 0;
  const isInFolder = !!chat.folder_id;

  return (
    <div
      className={`chat-title-wrapper ${isDragging ? "chat-title-wrapper-dragging" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <button
        className={`chat-title-item ${isActive ? "chat-title-active" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        title={chat.chat_title}
      >
        <ChatBubbleIcon className="chat-title-icon" width={14} height={14} />
        <span className="chat-title-text">{chat.chat_title}</span>

        <div className="chat-title-actions">
          {/* Move to folder button */}
          {(hasFolders || isInFolder) && (
            <button
              ref={folderBtnRef}
              className={`chat-title-action-btn ${showFolderPicker ? "chat-title-action-btn-active" : ""}`}
              onClick={handleFolderBtnClick}
              title={isInFolder ? "Move to another folder" : "Add to folder"}
            >
              {/* Folder icon SVG */}
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
            </button>
          )}

          <button
            className="chat-title-action-btn"
            onClick={(e) => startRename(e)}
            title="Rename chat"
          >
            <Pencil1Icon width={12} height={12} />
          </button>
          <button
            className="chat-title-action-btn chat-title-action-btn-danger"
            onClick={(e) => handleDelete(e)}
            title="Delete chat"
          >
            <TrashIcon width={12} height={12} />
          </button>
        </div>
      </button>

      {/* Inline folder picker dropdown (from hover button) */}
      {showFolderPicker && (
        <div ref={folderPickerRef} className="chat-title-folder-picker">
          <div className="chat-title-folder-picker-header">Move to folder</div>
          {isInFolder && (
            <button
              className="chat-title-folder-picker-item chat-title-folder-picker-remove"
              onClick={() => handleRemoveFromFolder()}
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
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              Remove from folder
            </button>
          )}
          {folders
            .filter((f) => f.id !== chat.folder_id)
            .map((folder) => (
              <button
                key={folder.id}
                className="chat-title-folder-picker-item"
                onClick={() => handleMoveToFolder(folder.id)}
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
                {folder.name}
              </button>
            ))}
          {folders.filter((f) => f.id !== chat.folder_id).length === 0 &&
            !isInFolder && (
              <div className="chat-title-folder-picker-empty">
                No folders available
              </div>
            )}
        </div>
      )}

      {/* Context menu (right-click) */}
      {contextMenu && (
        <div
          ref={contextMenuRef}
          className="chat-title-context-menu"
          style={{
            position: "fixed",
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 9999,
          }}
        >
          <button
            className="chat-title-context-item"
            onClick={() => startRename()}
          >
            <Pencil1Icon width={13} height={13} />
            <span>Rename</span>
          </button>

          {/* Move to folder section */}
          {(hasFolders || isInFolder) && (
            <>
              <div className="chat-title-context-divider" />
              {isInFolder && (
                <button
                  className="chat-title-context-item"
                  onClick={() => handleRemoveFromFolder()}
                >
                  {/* Folder minus icon */}
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
              )}
              {hasFolders && (
                <button
                  className={`chat-title-context-item chat-title-context-item-expandable ${contextFolderExpanded ? "chat-title-context-item-expanded" : ""}`}
                  onClick={() => setContextFolderExpanded((prev) => !prev)}
                >
                  {/* Folder plus icon */}
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
                    className="chat-title-context-expand-arrow"
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
              )}
              {contextFolderExpanded && (
                <div className="chat-title-context-folder-list">
                  {folders
                    .filter((f) => f.id !== chat.folder_id)
                    .map((folder) => (
                      <button
                        key={folder.id}
                        className="chat-title-context-item chat-title-context-folder-option"
                        onClick={() => handleMoveToFolder(folder.id)}
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
                        <span>{folder.name}</span>
                      </button>
                    ))}
                  {folders.filter((f) => f.id !== chat.folder_id).length ===
                    0 && (
                    <div className="chat-title-context-folder-empty">
                      No other folders
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <div className="chat-title-context-divider" />
          <button
            className="chat-title-context-item chat-title-context-item-danger"
            onClick={() => handleDelete()}
          >
            <TrashIcon width={13} height={13} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
