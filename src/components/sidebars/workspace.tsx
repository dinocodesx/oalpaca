import { useState, useRef, useEffect } from "react";
import {
  Pencil2Icon,
  ChevronDownIcon,
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
  CheckIcon,
  Cross2Icon,
} from "@radix-ui/react-icons";
import type { WorkspaceMeta } from "../../types/workspace";
import "./workspace.css";

interface WorkspaceDropdownProps {
  workspaces: WorkspaceMeta[];
  activeWorkspace: WorkspaceMeta | null;
  onSwitch: (workspaceId: string) => void;
  onCreate: (name: string) => void;
  onRename: (workspaceId: string, newName: string) => void;
  onDelete: (workspaceId: string) => void;
}

export default function WorkspaceDropdown({
  workspaces,
  activeWorkspace,
  onSwitch,
  onCreate,
  onRename,
  onDelete,
}: WorkspaceDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [createName, setCreateName] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
  const renameInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
        setIsCreating(false);
        setRenamingId(null);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Auto-focus inputs
  useEffect(() => {
    if (isCreating && createInputRef.current) {
      createInputRef.current.focus();
    }
  }, [isCreating]);

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingId]);

  const handleCreate = () => {
    const trimmed = createName.trim();
    if (trimmed) {
      onCreate(trimmed);
      setCreateName("");
      setIsCreating(false);
      setIsOpen(false);
    }
  };

  const handleRename = (id: string) => {
    const trimmed = renameValue.trim();
    if (trimmed) {
      onRename(id, trimmed);
      setRenamingId(null);
      setRenameValue("");
    }
  };

  const handleDelete = (id: string) => {
    onDelete(id);
    setIsOpen(false);
  };

  const startRename = (ws: WorkspaceMeta, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingId(ws.id);
    setRenameValue(ws.name);
  };

  const displayName = activeWorkspace?.name || "Workspace";

  return (
    <div className="workspace-dropdown-wrapper" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        className="workspace-trigger"
        onClick={() => setIsOpen(!isOpen)}
        title="Switch workspace"
      >
        <span className="workspace-trigger-name">{displayName}</span>
        <ChevronDownIcon className="workspace-trigger-chevron" />
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="workspace-dropdown">
          {/* Workspace list */}
          <div className="workspace-dropdown-list">
            {workspaces.map((ws) => (
              <div
                key={ws.id}
                className={`workspace-dropdown-item ${ws.id === activeWorkspace?.id ? "workspace-dropdown-item-active" : ""}`}
              >
                {renamingId === ws.id ? (
                  <div className="workspace-rename-row">
                    <input
                      ref={renameInputRef}
                      className="workspace-inline-input"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleRename(ws.id);
                        if (e.key === "Escape") setRenamingId(null);
                      }}
                      placeholder="Workspace name"
                    />
                    <button
                      className="workspace-inline-btn workspace-inline-confirm"
                      onClick={() => handleRename(ws.id)}
                      title="Confirm"
                    >
                      <CheckIcon width={12} height={12} />
                    </button>
                    <button
                      className="workspace-inline-btn workspace-inline-cancel"
                      onClick={() => setRenamingId(null)}
                      title="Cancel"
                    >
                      <Cross2Icon width={12} height={12} />
                    </button>
                  </div>
                ) : (
                  <button
                    className="workspace-dropdown-item-btn"
                    onClick={() => {
                      onSwitch(ws.id);
                      setIsOpen(false);
                    }}
                  >
                    <span className="workspace-dropdown-item-name">
                      {ws.name}
                    </span>
                  </button>
                )}
                {renamingId !== ws.id && (
                  <div className="workspace-dropdown-item-actions">
                    <button
                      className="workspace-action-btn"
                      onClick={(e) => startRename(ws, e)}
                      title="Rename workspace"
                    >
                      <Pencil1Icon width={12} height={12} />
                    </button>
                    {workspaces.length > 1 && (
                      <button
                        className="workspace-action-btn workspace-action-btn-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(ws.id);
                        }}
                        title="Delete workspace"
                      >
                        <TrashIcon width={12} height={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Separator */}
          <div className="workspace-dropdown-separator" />

          {/* Create new workspace */}
          {isCreating ? (
            <div className="workspace-create-form">
              <input
                ref={createInputRef}
                className="workspace-inline-input"
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") {
                    setIsCreating(false);
                    setCreateName("");
                  }
                }}
                placeholder="Workspace name..."
              />
              <button
                className="workspace-inline-btn workspace-inline-confirm"
                onClick={handleCreate}
                title="Create"
              >
                <CheckIcon width={12} height={12} />
              </button>
              <button
                className="workspace-inline-btn workspace-inline-cancel"
                onClick={() => {
                  setIsCreating(false);
                  setCreateName("");
                }}
                title="Cancel"
              >
                <Cross2Icon width={12} height={12} />
              </button>
            </div>
          ) : (
            <button
              className="workspace-dropdown-create-btn"
              onClick={() => setIsCreating(true)}
            >
              <Pencil2Icon width={14} height={14} />
              <span>New Workspace</span>
              <PlusIcon
                width={14}
                height={14}
                className="workspace-create-plus"
              />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
