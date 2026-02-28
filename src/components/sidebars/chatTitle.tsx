import { useState, useRef, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  ChatBubbleIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import type { ChatMeta } from "../../types/chat";
import type { FolderMeta } from "../../types/folder";
import "./chatTitle.css";

// ——— Icons ———
const FolderIcon = ({ size = 12 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
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

const FolderAddIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
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
);

const FolderRemoveIcon = ({ size = 13 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
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
);

// ——— Folder Modal ———
interface FolderModalProps {
  chatTitle: string;
  isInFolder: boolean;
  currentFolderId: string | null | undefined;
  folders: FolderMeta[];
  onMoveToFolder: (folderId: string) => void;
  onRemoveFromFolder: () => void;
  onClose: () => void;
}

function FolderModal({
  chatTitle,
  isInFolder,
  currentFolderId,
  folders,
  onMoveToFolder,
  onRemoveFromFolder,
  onClose,
}: FolderModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const otherFolders = folders.filter((f) => f.id !== currentFolderId);
  const heading = isInFolder ? "Move to folder" : "Add to folder";

  // Close on Escape.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Trap focus inside modal on open.
  useEffect(() => {
    modalRef.current?.focus();
  }, []);

  const handleBackdropMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose],
  );

  return createPortal(
    <div
      className="folder-modal-backdrop"
      onMouseDown={handleBackdropMouseDown}
      role="dialog"
      aria-modal="true"
      aria-label={heading}
    >
      <div ref={modalRef} className="folder-modal" tabIndex={-1}>
        {/* Header */}
        <div className="folder-modal-header">
          <div className="folder-modal-title-row">
            <FolderIcon size={14} />
            <span className="folder-modal-title">{heading}</span>
          </div>
          <button
            type="button"
            className="folder-modal-close-btn"
            onClick={onClose}
            title="Close"
          >
            <Cross2Icon width={13} height={13} />
          </button>
        </div>

        {/* Chat name hint */}
        <div className="folder-modal-chat-name" title={chatTitle}>
          {chatTitle}
        </div>

        {/* Body */}
        <div className="folder-modal-body">
          {isInFolder && (
            <>
              <button
                type="button"
                className="folder-modal-option folder-modal-option-remove"
                onClick={onRemoveFromFolder}
              >
                <FolderRemoveIcon />
                <span>Remove from current folder</span>
              </button>
              {otherFolders.length > 0 && (
                <div className="folder-modal-section-label">Move to</div>
              )}
            </>
          )}

          {otherFolders.length > 0 ? (
            <div className="folder-modal-list">
              {otherFolders.map((folder) => (
                <button
                  key={folder.id}
                  type="button"
                  className="folder-modal-option"
                  onClick={() => onMoveToFolder(folder.id)}
                >
                  <FolderIcon size={13} />
                  <span>{folder.name}</span>
                </button>
              ))}
            </div>
          ) : (
            !isInFolder && (
              <div className="folder-modal-empty">
                No folders available. Create a folder first.
              </div>
            )
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

// ——— Props ———

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

// ——— Component ———

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
  const [showFolderModal, setShowFolderModal] = useState(false);

  const renameInputRef = useRef<HTMLInputElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const hasFolders = folders.length > 0;
  const isInFolder = !!chat.folder_id;
  const showFolderButton = hasFolders || isInFolder;

  // Keep rename value in sync with external changes.
  useEffect(() => {
    setRenameValue(chat.chat_title);
  }, [chat.chat_title]);

  // Focus rename input when entering rename mode.
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
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [contextMenu]);

  // Clamp context menu within viewport bounds after render.
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
      setContextMenu({ x: nextX, y: nextY });
    }
  }, [contextMenu]);

  // ——— Handlers ———

  const handleRename = useCallback(() => {
    const trimmed = renameValue.trim();
    if (trimmed && trimmed !== chat.chat_title) onRename(chat.id, trimmed);
    setIsRenaming(false);
  }, [renameValue, chat.id, chat.chat_title, onRename]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const openFolderModal = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    setContextMenu(null);
    setShowFolderModal(true);
  }, []);

  const closeFolderModal = useCallback(() => {
    setShowFolderModal(false);
  }, []);

  const handleMoveToFolder = useCallback(
    (folderId: string) => {
      onMoveToFolder?.(chat.id, folderId);
      setShowFolderModal(false);
    },
    [chat.id, onMoveToFolder],
  );

  const handleRemoveFromFolder = useCallback(() => {
    onRemoveFromFolder?.(chat.id);
    setShowFolderModal(false);
  }, [chat.id, onRemoveFromFolder]);

  // ——— Rename mode ———

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
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setIsRenaming(false)}
          title="Cancel"
        >
          <Cross2Icon width={12} height={12} />
        </button>
      </div>
    );
  }

  // ——— Normal view ———

  return (
    <div className="chat-title-wrapper">
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
          {showFolderButton && (
            <button
              type="button"
              className={`chat-title-action-btn ${showFolderModal ? "chat-title-action-btn-active" : ""}`}
              onClick={openFolderModal}
              title={isInFolder ? "Move to another folder" : "Add to folder"}
            >
              <FolderIcon size={12} />
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

      {/* Right-click context menu */}
      {contextMenu &&
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

            {showFolderButton && (
              <>
                <div className="chat-title-context-divider" />
                {isInFolder && (
                  <button
                    type="button"
                    className="chat-title-context-item"
                    onClick={() => {
                      setContextMenu(null);
                      handleRemoveFromFolder();
                    }}
                  >
                    <FolderRemoveIcon />
                    <span>Remove from folder</span>
                  </button>
                )}
                <button
                  type="button"
                  className="chat-title-context-item"
                  onClick={() => openFolderModal()}
                >
                  <FolderAddIcon />
                  <span>{isInFolder ? "Move to folder" : "Add to folder"}</span>
                </button>
                <div className="chat-title-context-divider" />
              </>
            )}

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
        )}

      {/* Folder modal dialog */}
      {showFolderModal && (
        <FolderModal
          chatTitle={chat.chat_title}
          isInFolder={isInFolder}
          currentFolderId={chat.folder_id}
          folders={folders}
          onMoveToFolder={handleMoveToFolder}
          onRemoveFromFolder={handleRemoveFromFolder}
          onClose={closeFolderModal}
        />
      )}
    </div>
  );
}
