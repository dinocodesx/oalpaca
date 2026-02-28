import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChatBubbleIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
  ChevronDownIcon,
} from "@radix-ui/react-icons";
import type { ChatMeta } from "../../types/chat";
import type { FolderMeta } from "../../types/folder";
import "./chatTitle.css";

/** Reusable folder icon for folder picker and context menu. */
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

export interface ChatTitleProps {
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
  // ——— State ———
  const [isRenaming, setIsRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(chat.chat_title);
  /** Right-click context menu position (null means closed). */
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [contextFolderExpanded, setContextFolderExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  /** Portal-positioned folder picker coordinates (viewport). */
  const [folderPickerPos, setFolderPickerPos] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const folderPickerRef = useRef<HTMLDivElement>(null);
  const folderBtnRef = useRef<HTMLButtonElement>(null);

  // Keep rename value in sync when chat title changes from outside.
  useEffect(() => {
    setRenameValue(chat.chat_title);
  }, [chat.chat_title]);

  // Focus and select rename input when entering rename mode.
  useEffect(() => {
    if (isRenaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [isRenaming]);

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

  // Keep context menu within viewport when opened.
  useEffect(() => {
    if (!contextMenu) return;
    const el = contextMenuRef.current;
    if (!el) return;
    const margin = 8;
    const rect = el.getBoundingClientRect();
    const maxX = window.innerWidth - margin - rect.width;
    const maxY = window.innerHeight - margin - rect.height;
    const nextX = Math.min(Math.max(contextMenu.x, margin), Math.max(margin, maxX));
    const nextY = Math.min(Math.max(contextMenu.y, margin), Math.max(margin, maxY));
    if (nextX !== contextMenu.x || nextY !== contextMenu.y) {
      setContextMenu({ x: nextX, y: nextY });
    }
  }, [contextMenu]);

  // Close folder picker when clicking outside (excluding the folder button).
  useEffect(() => {
    if (!showFolderPicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        folderPickerRef.current &&
        !folderPickerRef.current.contains(e.target as Node) &&
        folderBtnRef.current &&
        !folderBtnRef.current.contains(e.target as Node)
      ) {
        setShowFolderPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showFolderPicker]);

  // Compute portal position for folder picker (anchor to folder button).
  useEffect(() => {
    if (!showFolderPicker) {
      setFolderPickerPos(null);
      return;
    }
    const btn = folderBtnRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    setFolderPickerPos({ x: rect.right, y: rect.bottom + 4 });
  }, [showFolderPicker]);

  // ——— Handlers ———
  const handleRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== chat.chat_title) onRename(chat.id, trimmed);
    setIsRenaming(false);
  }, [renameValue, chat.id, chat.chat_title, onRename]);

  /** Open context menu at cursor position; close folder picker. */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowFolderPicker(false);
    setContextFolderExpanded(false);
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const startRename = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setRenameValue(chat.chat_title);
      setIsRenaming(true);
      setContextMenu(null);
    },
    [chat.chat_title],
  );

  const handleDelete = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onDelete(chat.id);
      setContextMenu(null);
    },
    [chat.id, onDelete],
  );

  /** Set drag data so drop targets (folders / Recent) can identify this chat. */
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      e.dataTransfer.setData("text/plain", chat.id);
      e.dataTransfer.effectAllowed = "move";
      setIsDragging(true);
    },
    [chat.id],
  );

  const handleDragEnd = useCallback(() => setIsDragging(false), []);

  const handleFolderBtnClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setContextMenu(null);
    setShowFolderPicker((prev) => !prev);
  }, []);

  const handleMoveToFolder = useCallback(
    (folderId: string) => {
      onMoveToFolder?.(chat.id, folderId);
      setShowFolderPicker(false);
      setContextMenu(null);
      setContextFolderExpanded(false);
    },
    [chat.id, onMoveToFolder],
  );

  const handleRemoveFromFolder = useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      onRemoveFromFolder?.(chat.id);
      setContextMenu(null);
    },
    [chat.id, onRemoveFromFolder],
  );

  const hasFolders = folders.length > 0;
  const isInFolder = !!chat.folder_id;
  /** Folders this chat can be moved to (excluding its current folder). */
  const otherFolders = folders.filter((f) => f.id !== chat.folder_id);

  // Inline rename mode: single row with input + confirm/cancel.
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
          type="button"
          className="chat-title-rename-btn chat-title-rename-confirm"
          onClick={handleRename}
          title="Confirm"
        >
          <CheckIcon width={12} height={12} />
        </button>
        <button
          type="button"
          className="chat-title-rename-btn chat-title-rename-cancel"
          onClick={() => setIsRenaming(false)}
          title="Cancel"
        >
          <Cross2Icon width={12} height={12} />
        </button>
      </div>
    );
  }

  // Normal view: clickable row + optional folder picker and context menu.
  return (
    <div
      className={`chat-title-wrapper ${isDragging ? "chat-title-wrapper-dragging" : ""}`}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <button
        type="button"
        className={`chat-title-item ${isActive ? "chat-title-active" : ""}`}
        onClick={onClick}
        onContextMenu={handleContextMenu}
        title={chat.chat_title}
      >
        <ChatBubbleIcon className="chat-title-icon" width={14} height={14} />
        <span className="chat-title-text">{chat.chat_title}</span>
        <div className="chat-title-actions">
          {(hasFolders || isInFolder) && (
            <button
              ref={folderBtnRef}
              type="button"
              className={`chat-title-action-btn ${showFolderPicker ? "chat-title-action-btn-active" : ""}`}
              onClick={handleFolderBtnClick}
              title={isInFolder ? "Move to another folder" : "Add to folder"}
            >
              <FolderIcon />
            </button>
          )}
          <button
            type="button"
            className="chat-title-action-btn"
            onClick={startRename}
            title="Rename chat"
          >
            <Pencil1Icon width={12} height={12} />
          </button>
          <button
            type="button"
            className="chat-title-action-btn chat-title-action-btn-danger"
            onClick={handleDelete}
            title="Delete chat"
          >
            <TrashIcon width={12} height={12} />
          </button>
        </div>
      </button>

      {/* Folder picker dropdown (opened from hover folder button) */}
      {showFolderPicker && (
        createPortal(
          <div
            ref={folderPickerRef}
            className="chat-title-folder-picker"
            style={
              folderPickerPos
                ? {
                    position: "fixed",
                    top: folderPickerPos.y,
                    left: folderPickerPos.x,
                    transform: "translateX(-100%)",
                    zIndex: 9999,
                  }
                : undefined
            }
          >
            <div className="chat-title-folder-picker-header">Move to folder</div>
            {isInFolder && (
              <button
                type="button"
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
            {otherFolders.map((folder) => (
              <button
                key={folder.id}
                type="button"
                className="chat-title-folder-picker-item"
                onClick={() => handleMoveToFolder(folder.id)}
              >
                <FolderIcon />
                {folder.name}
              </button>
            ))}
            {otherFolders.length === 0 && !isInFolder && (
              <div className="chat-title-folder-picker-empty">
                No folders available
              </div>
            )}
          </div>,
          document.body,
        )
      )}

      {/* Right-click context menu: Rename, Remove from folder, Move to folder, Delete */}
      {contextMenu && (
        createPortal(
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
              type="button"
              className="chat-title-context-item"
              onClick={() => startRename()}
            >
              <Pencil1Icon width={13} height={13} />
              <span>Rename</span>
            </button>

            {(hasFolders || isInFolder) && (
              <>
                <div className="chat-title-context-divider" />
                {isInFolder && (
                  <button
                    type="button"
                    className="chat-title-context-item"
                    onClick={() => handleRemoveFromFolder()}
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
                )}
                {hasFolders && (
                  <>
                    <button
                      type="button"
                      className={`chat-title-context-item chat-title-context-item-expandable ${contextFolderExpanded ? "chat-title-context-item-expanded" : ""}`}
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
                        className="chat-title-context-expand-arrow"
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
                      <div className="chat-title-context-folder-list">
                        {otherFolders.map((folder) => (
                          <button
                            key={folder.id}
                            type="button"
                            className="chat-title-context-item chat-title-context-folder-option"
                            onClick={() => handleMoveToFolder(folder.id)}
                          >
                            <FolderIcon />
                            <span>{folder.name}</span>
                          </button>
                        ))}
                        {otherFolders.length === 0 && (
                          <div className="chat-title-context-folder-empty">
                            No other folders
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
                <div className="chat-title-context-divider" />
              </>
            )}

            <div className="chat-title-context-divider" />
            <button
              type="button"
              className="chat-title-context-item chat-title-context-item-danger"
              onClick={() => handleDelete()}
            >
              <TrashIcon width={13} height={13} />
              <span>Delete</span>
            </button>
          </div>,
          document.body,
        )
      )}
    </div>
  );
}
