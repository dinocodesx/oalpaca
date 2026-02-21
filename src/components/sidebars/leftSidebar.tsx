import { useState, useRef, useEffect } from "react";
import {
  MagnifyingGlassIcon,
  GearIcon,
  PlusIcon,
  Cross2Icon,
  ChevronDownIcon,
  CheckIcon,
} from "@radix-ui/react-icons";
import type { ChatMeta } from "../../types/chat";
import type { FolderMeta } from "../../types/folder";
import type { Model } from "../../types/model";
import type { WorkspaceMeta } from "../../types/workspace";
import WorkspaceDropdown from "./workspace";
import ChatFolder from "./chatFolder";
import ChatTitle from "./chatTilte";
import UserProfile from "./userProfile";
import "./leftSidebar.css";

interface LeftSidebarProps {
  isOpen: boolean;
  currentChatId: string | null;
  onNewChat: () => void;
  onLoadChat: (chatId: string) => void;
  onToggle: () => void;

  // Workspace
  workspaces: WorkspaceMeta[];
  activeWorkspace: WorkspaceMeta | null;
  onSwitchWorkspace: (workspaceId: string) => void;
  onCreateWorkspace: (name: string) => void;
  onRenameWorkspace: (workspaceId: string, newName: string) => void;
  onDeleteWorkspace: (workspaceId: string) => void;

  // Folders
  folders: FolderMeta[];
  looseChats: ChatMeta[];
  chatsByFolder: (folderId: string) => ChatMeta[];
  onCreateFolder: (name: string) => void;
  onRenameFolder: (folderId: string, newName: string) => void;
  onDeleteFolder: (folderId: string) => void;

  // Folder membership
  onMoveToFolder: (chatId: string, folderId: string) => void;
  onRemoveChatFromFolder: (chatId: string) => void;

  // Chat CRUD
  onRenameChat: (chatId: string, newTitle: string) => void;
  onDeleteChat: (chatId: string) => void;

  // Search
  searchQuery: string;
  searchResults: ChatMeta[] | null;
  onSearch: (query: string) => void;
  onClearSearch: () => void;

  // Models (for settings)
  models: Model[];
}

export default function LeftSidebar({
  isOpen,
  currentChatId,
  onNewChat,
  onLoadChat,

  // Workspace
  workspaces,
  activeWorkspace,
  onSwitchWorkspace,
  onCreateWorkspace,
  onRenameWorkspace,
  onDeleteWorkspace,

  // Folders
  folders,
  looseChats,
  chatsByFolder,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,

  // Folder membership
  onMoveToFolder,
  onRemoveChatFromFolder,

  // Chat CRUD
  onRenameChat,
  onDeleteChat,

  // Search
  searchQuery,
  searchResults,
  onSearch,
  onClearSearch,

  // Models
  models,
}: LeftSidebarProps) {
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  // Drag-and-drop state for the "Recent" section (acts as "remove from folder" drop zone)
  const [isRecentDragOver, setIsRecentDragOver] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const recentLooseChats = [...looseChats].reverse();
  const isSearching = searchQuery.trim().length > 0;

  // Auto-focus folder name input
  useEffect(() => {
    if (isCreatingFolder && newFolderInputRef.current) {
      newFolderInputRef.current.focus();
    }
  }, [isCreatingFolder]);

  const handleCreateFolder = () => {
    const trimmed = newFolderName.trim();
    if (trimmed) {
      onCreateFolder(trimmed);
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      onClearSearch();
      searchInputRef.current?.blur();
    }
  };

  // ── Recent section: drop target (removing a chat from its folder) ──
  const handleRecentDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRecentDragOver(true);
  };

  const handleRecentDragLeave = (e: React.DragEvent) => {
    // Only clear when the pointer truly leaves this section, not its children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsRecentDragOver(false);
    }
  };

  const handleRecentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleRecentDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsRecentDragOver(false);

    const chatId = e.dataTransfer.getData("text/plain");
    if (!chatId) return;

    // Only do something if the chat is currently in a folder
    onRemoveChatFromFolder(chatId);
  };

  return (
    <aside className={`left-sidebar ${isOpen ? "left-sidebar-open" : ""}`}>
      {/* ──────────────────────────────────────── */}
      {/*  Workspace Header                       */}
      {/* ──────────────────────────────────────── */}
      <div className="sidebar-workspace-header">
        <WorkspaceDropdown
          workspaces={workspaces}
          activeWorkspace={activeWorkspace}
          onSwitch={onSwitchWorkspace}
          onCreate={onCreateWorkspace}
          onRename={onRenameWorkspace}
          onDelete={onDeleteWorkspace}
        />

        {/* New chat button (pencil) */}
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

      {/* ──────────────────────────────────────── */}
      {/*  Search                                 */}
      {/* ──────────────────────────────────────── */}
      <div className="sidebar-search">
        <div
          className={`sidebar-search-container ${isSearchFocused ? "sidebar-search-container-focused" : ""}`}
        >
          <MagnifyingGlassIcon
            className="sidebar-search-icon"
            width={14}
            height={14}
          />
          <input
            ref={searchInputRef}
            className="sidebar-search-input"
            type="text"
            placeholder="Search Chat"
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
          />
          {isSearching && (
            <button
              className="sidebar-search-clear"
              onClick={() => {
                onClearSearch();
                searchInputRef.current?.focus();
              }}
              title="Clear search"
            >
              <Cross2Icon width={12} height={12} />
            </button>
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────── */}
      {/*  Content Area (folders + chats)          */}
      {/* ──────────────────────────────────────── */}
      <div className="sidebar-content">
        {isSearching ? (
          /* ── Search Results ── */
          <div className="sidebar-section">
            <div className="sidebar-section-header">
              <span className="sidebar-section-label">
                Search Results
                {searchResults !== null && (
                  <span className="sidebar-section-count">
                    {" "}
                    ({searchResults.length})
                  </span>
                )}
              </span>
            </div>
            <div className="sidebar-section-list">
              {searchResults && searchResults.length === 0 ? (
                <div className="sidebar-empty">No chats found</div>
              ) : searchResults ? (
                searchResults.map((chat) => (
                  <ChatTitle
                    key={chat.id}
                    chat={chat}
                    isActive={currentChatId === chat.id}
                    onClick={() => onLoadChat(chat.id)}
                    onRename={onRenameChat}
                    onDelete={onDeleteChat}
                    folders={folders}
                    onMoveToFolder={onMoveToFolder}
                    onRemoveFromFolder={onRemoveChatFromFolder}
                  />
                ))
              ) : null}
            </div>
          </div>
        ) : (
          <>
            {/* ── Folders Section ── */}
            {(folders.length > 0 || isCreatingFolder) && (
              <div className="sidebar-section">
                <div className="sidebar-section-header">
                  <span className="sidebar-section-label">Folders</span>
                  <button
                    className="sidebar-section-action"
                    onClick={() => setIsCreatingFolder(true)}
                    title="New folder"
                  >
                    <PlusIcon width={13} height={13} />
                  </button>
                </div>
                <div className="sidebar-section-list">
                  {/* Create folder inline input */}
                  {isCreatingFolder && (
                    <div className="sidebar-create-folder-row">
                      <input
                        ref={newFolderInputRef}
                        className="sidebar-create-folder-input"
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleCreateFolder();
                          if (e.key === "Escape") {
                            setIsCreatingFolder(false);
                            setNewFolderName("");
                          }
                        }}
                        placeholder="Folder name..."
                      />
                      <button
                        className="sidebar-create-folder-btn sidebar-create-folder-confirm"
                        onClick={handleCreateFolder}
                        title="Create"
                      >
                        <CheckIcon width={12} height={12} />
                      </button>
                      <button
                        className="sidebar-create-folder-btn sidebar-create-folder-cancel"
                        onClick={() => {
                          setIsCreatingFolder(false);
                          setNewFolderName("");
                        }}
                        title="Cancel"
                      >
                        <Cross2Icon width={12} height={12} />
                      </button>
                    </div>
                  )}

                  {folders.map((folder) => (
                    <ChatFolder
                      key={folder.id}
                      folder={folder}
                      chats={chatsByFolder(folder.id)}
                      currentChatId={currentChatId}
                      onLoadChat={onLoadChat}
                      onRenameFolder={onRenameFolder}
                      onDeleteFolder={onDeleteFolder}
                      onRenameChat={onRenameChat}
                      onDeleteChat={onDeleteChat}
                      allFolders={folders}
                      onMoveToFolder={onMoveToFolder}
                      onRemoveChatFromFolder={onRemoveChatFromFolder}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* ── Recent Chats Section (loose chats, not in any folder) ── */}
            {/*    Also serves as the drop-zone for removing chats from folders */}
            <div
              className={`sidebar-section ${isRecentDragOver ? "sidebar-section-drag-over" : ""}`}
              onDragEnter={handleRecentDragEnter}
              onDragLeave={handleRecentDragLeave}
              onDragOver={handleRecentDragOver}
              onDrop={handleRecentDrop}
            >
              <div className="sidebar-section-header">
                <span className="sidebar-section-label">
                  {isRecentDragOver ? (
                    <span className="sidebar-section-drop-hint">
                      Drop to remove from folder
                    </span>
                  ) : (
                    "Recent"
                  )}
                </span>
                {folders.length === 0 && !isCreatingFolder && (
                  <button
                    className="sidebar-section-action"
                    onClick={() => setIsCreatingFolder(true)}
                    title="New folder"
                  >
                    <PlusIcon width={13} height={13} />
                  </button>
                )}
              </div>
              <div className="sidebar-section-list">
                {recentLooseChats.length === 0 ? (
                  <div
                    className={`sidebar-empty ${isRecentDragOver ? "sidebar-empty-drag-over" : ""}`}
                  >
                    {isRecentDragOver
                      ? "Release to ungroup this chat"
                      : "No conversations yet"}
                  </div>
                ) : (
                  recentLooseChats.map((chat) => (
                    <ChatTitle
                      key={chat.id}
                      chat={chat}
                      isActive={currentChatId === chat.id}
                      onClick={() => onLoadChat(chat.id)}
                      onRename={onRenameChat}
                      onDelete={onDeleteChat}
                      folders={folders}
                      onMoveToFolder={onMoveToFolder}
                      onRemoveFromFolder={onRemoveChatFromFolder}
                    />
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* ──────────────────────────────────────── */}
      {/*  Bottom Section: Settings + Profile     */}
      {/* ──────────────────────────────────────── */}
      <div className="sidebar-bottom">
        {/* Settings toggle */}
        <button
          className={`sidebar-settings-btn ${showSettings ? "sidebar-settings-btn-active" : ""}`}
          onClick={() => setShowSettings(!showSettings)}
        >
          <GearIcon width={15} height={15} />
          <span>Settings</span>
          <ChevronDownIcon
            className={`sidebar-settings-chevron ${showSettings ? "sidebar-settings-chevron-open" : ""}`}
            width={14}
            height={14}
          />
        </button>

        {/* Settings content: model list */}
        {showSettings && (
          <div className="sidebar-settings-panel">
            <div className="sidebar-settings-panel-header">
              <span className="sidebar-settings-panel-label">
                Available Models
              </span>
            </div>
            <div className="sidebar-settings-model-list">
              {models.length === 0 ? (
                <div className="sidebar-settings-empty">
                  No models available. Is Ollama running?
                </div>
              ) : (
                models.map((model) => (
                  <div
                    key={model.digest}
                    className="sidebar-settings-model-item"
                  >
                    <span className="sidebar-settings-model-name">
                      {model.name}
                    </span>
                    <span className="sidebar-settings-model-size">
                      {model.details.parameter_size}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Profile */}
        <UserProfile
          avatarUrl="https://github.com/dinocodesx.png"
          username="Debarshee Chakraborty"
        />
      </div>
    </aside>
  );
}
