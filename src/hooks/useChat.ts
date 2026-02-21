import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ChatMessage,
  ChatStreamEvent,
  ChatStreamError,
  ChatMeta,
} from "../types/chat";
import type { Model } from "../types/model";
import type { WorkspacesIndex } from "../types/workspace";
import { useWorkspace } from "./useWorkspace";
import { useFolder } from "./useFolder";

export function useChat() {
  // ── State ──────────────────────────────────────────────────────────────────
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [chatHistory, setChatHistory] = useState<ChatMeta[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatMeta[] | null>(null);

  // Accumulates streaming chunks without causing re-renders on every append
  const streamingContentRef = useRef("");

  // ── Sub-hooks ──────────────────────────────────────────────────────────────
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    switchWorkspace: switchWorkspaceBase,
    createNewWorkspace: createNewWorkspaceBase,
    renameWorkspaceAction: renameWorkspaceBase,
    deleteWorkspaceAction: deleteWorkspaceBase,
  } = useWorkspace();

  const {
    folders,
    refreshFolders,
    createNewFolder: createNewFolderBase,
    renameFolderAction: renameFolderBase,
    deleteFolderAction: deleteFolderBase,
  } = useFolder(activeWorkspaceId);

  // ── Models ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    invoke<Model[]>("list_models")
      .then((result) => {
        setModels(result);
        if (result.length > 0) setSelectedModel(result[0].name);
      })
      .catch((err) => {
        console.error("Failed to fetch models:", err);
        setError(String(err));
      });
  }, []);

  // ── Chat history ───────────────────────────────────────────────────────────
  const refreshChatHistory = useCallback(
    async (wsId?: string) => {
      const id = wsId ?? activeWorkspaceId;
      if (!id) return;
      try {
        const chats = await invoke<ChatMeta[]>("get_chats_for_workspace", {
          workspaceId: id,
        });
        setChatHistory(chats);
      } catch (err) {
        console.error("Failed to fetch chat history:", err);
      }
    },
    [activeWorkspaceId],
  );

  useEffect(() => {
    if (activeWorkspaceId) refreshChatHistory(activeWorkspaceId);
  }, [activeWorkspaceId, refreshChatHistory]);

  // ── Streaming event listeners ──────────────────────────────────────────────
  // Uses a `cancelled` flag to safely handle React StrictMode double-mount.
  useEffect(() => {
    let cancelled = false;
    let unlistenChunk: UnlistenFn | null = null;
    let unlistenError: UnlistenFn | null = null;

    async function setup() {
      unlistenChunk = await listen<ChatStreamEvent>(
        "chat-stream-chunk",
        (event) => {
          if (cancelled) return;
          const { content, done } = event.payload;

          if (!done) {
            streamingContentRef.current += content;
            setStreamingContent(streamingContentRef.current);
          } else {
            const finalContent = streamingContentRef.current + content;
            setMessages((prev) => [
              ...prev,
              { role: "assistant", content: finalContent },
            ]);
            streamingContentRef.current = "";
            setStreamingContent("");
            setIsStreaming(false);

            // Fetch a fresh workspace ID to avoid a stale closure, then refresh history
            invoke<WorkspacesIndex>("get_all_workspaces")
              .then((ws) =>
                !cancelled
                  ? invoke<ChatMeta[]>("get_chats_for_workspace", {
                      workspaceId: ws.active_workspace_id,
                    })
                  : Promise.resolve([]),
              )
              .then((chats) => {
                if (!cancelled) setChatHistory(chats);
              })
              .catch(console.error);
          }
        },
      );

      unlistenError = await listen<ChatStreamError>(
        "chat-stream-error",
        (event) => {
          if (cancelled) return;
          setError(event.payload.error);
          setIsStreaming(false);
          streamingContentRef.current = "";
          setStreamingContent("");
        },
      );

      // Cleaned up while awaiting — unlisten immediately to avoid leaks
      if (cancelled) {
        unlistenChunk?.();
        unlistenError?.();
      }
    }

    setup();
    return () => {
      cancelled = true;
      unlistenChunk?.();
      unlistenError?.();
    };
  }, []);

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Clears all transient chat UI state (switching / deleting workspaces). */
  const resetChatState = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    streamingContentRef.current = "";
    setStreamingContent("");
    setSearchQuery("");
    setSearchResults(null);
  }, []);

  // ── Chat actions ───────────────────────────────────────────────────────────

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !selectedModel) return;

      setError(null);
      setIsStreaming(true);
      streamingContentRef.current = "";
      setStreamingContent("");
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setInputValue("");

      try {
        const chatId = await invoke<string>("send_chat_message", {
          chatId: currentChatId,
          model: selectedModel,
          message: trimmed,
          workspaceId: activeWorkspaceId || null,
        });
        setCurrentChatId(chatId);
      } catch (err) {
        setError(String(err));
        setIsStreaming(false);
      }
    },
    [isStreaming, selectedModel, currentChatId, activeWorkspaceId],
  );

  const startNewChat = useCallback(() => {
    resetChatState();
    setError(null);
    setIsStreaming(false);
  }, [resetChatState]);

  const loadChat = useCallback(
    async (chatId: string) => {
      try {
        const chatMessages = await invoke<ChatMessage[]>("get_chat_messages", {
          chatId,
        });
        setMessages(chatMessages);
        setCurrentChatId(chatId);
        streamingContentRef.current = "";
        setStreamingContent("");
        setError(null);
        const meta = chatHistory.find((c) => c.id === chatId);
        if (meta) setSelectedModel(meta.model_used);
      } catch (err) {
        console.error("Failed to load chat:", err);
        setError(String(err));
      }
    },
    [chatHistory],
  );

  const renameChatAction = useCallback(
    async (chatId: string, newTitle: string) => {
      try {
        await invoke("rename_chat", { chatId, newTitle });
        await refreshChatHistory();
      } catch (err) {
        console.error("Failed to rename chat:", err);
        setError(String(err));
      }
    },
    [refreshChatHistory],
  );

  const deleteChatAction = useCallback(
    async (chatId: string) => {
      try {
        await invoke("delete_chat", { chatId });
        await refreshChatHistory();
        await refreshFolders();
        if (currentChatId === chatId) {
          setMessages([]);
          setCurrentChatId(null);
        }
      } catch (err) {
        console.error("Failed to delete chat:", err);
        setError(String(err));
      }
    },
    [refreshChatHistory, refreshFolders, currentChatId],
  );

  const moveChatToFolderAction = useCallback(
    async (chatId: string, newFolderId: string) => {
      try {
        const chat = chatHistory.find((c) => c.id === chatId);
        if (!chat) return;
        if (chat.folder_id) {
          await invoke("remove_chat_from_folder_cmd", {
            folderId: chat.folder_id,
            chatId,
          });
        }
        await invoke("add_chat_to_folder", { folderId: newFolderId, chatId });
        await refreshChatHistory();
        await refreshFolders();
      } catch (err) {
        console.error("Failed to move chat to folder:", err);
        setError(String(err));
      }
    },
    [chatHistory, refreshChatHistory, refreshFolders],
  );

  const removeChatFromFolderAction = useCallback(
    async (chatId: string) => {
      try {
        const chat = chatHistory.find((c) => c.id === chatId);
        if (!chat?.folder_id) return;
        await invoke("remove_chat_from_folder_cmd", {
          folderId: chat.folder_id,
          chatId,
        });
        await refreshChatHistory();
        await refreshFolders();
      } catch (err) {
        console.error("Failed to remove chat from folder:", err);
        setError(String(err));
      }
    },
    [chatHistory, refreshChatHistory, refreshFolders],
  );

  // ── Workspace actions ──────────────────────────────────────────────────────

  const switchWorkspace = useCallback(
    async (workspaceId: string) => {
      try {
        await switchWorkspaceBase(workspaceId);
        resetChatState();
      } catch (err) {
        console.error("Failed to switch workspace:", err);
        setError(String(err));
      }
    },
    [switchWorkspaceBase, resetChatState],
  );

  const createNewWorkspace = useCallback(
    async (name: string) => {
      try {
        await createNewWorkspaceBase(name);
        resetChatState();
      } catch (err) {
        console.error("Failed to create workspace:", err);
        setError(String(err));
      }
    },
    [createNewWorkspaceBase, resetChatState],
  );

  const renameWorkspaceAction = useCallback(
    async (workspaceId: string, newName: string) => {
      try {
        await renameWorkspaceBase(workspaceId, newName);
      } catch (err) {
        console.error("Failed to rename workspace:", err);
        setError(String(err));
      }
    },
    [renameWorkspaceBase],
  );

  const deleteWorkspaceAction = useCallback(
    async (workspaceId: string) => {
      try {
        const newWsId = await deleteWorkspaceBase(workspaceId);
        if (newWsId) {
          await refreshFolders(newWsId);
          await refreshChatHistory(newWsId);
        }
        resetChatState();
      } catch (err) {
        console.error("Failed to delete workspace:", err);
        setError(String(err));
      }
    },
    [deleteWorkspaceBase, refreshFolders, refreshChatHistory, resetChatState],
  );

  // ── Folder actions ─────────────────────────────────────────────────────────

  const createNewFolder = useCallback(
    async (name: string) => {
      try {
        await createNewFolderBase(name);
      } catch (err) {
        console.error("Failed to create folder:", err);
        setError(String(err));
      }
    },
    [createNewFolderBase],
  );

  const renameFolderAction = useCallback(
    async (folderId: string, newName: string) => {
      try {
        await renameFolderBase(folderId, newName);
      } catch (err) {
        console.error("Failed to rename folder:", err);
        setError(String(err));
      }
    },
    [renameFolderBase],
  );

  const deleteFolderAction = useCallback(
    async (folderId: string) => {
      try {
        await deleteFolderBase(folderId);
        // Folder deletion may unlink chats, so also refresh history
        await refreshChatHistory();
      } catch (err) {
        console.error("Failed to delete folder:", err);
        setError(String(err));
      }
    },
    [deleteFolderBase, refreshChatHistory],
  );

  // ── Search ─────────────────────────────────────────────────────────────────

  const searchChats = useCallback(
    async (query: string) => {
      setSearchQuery(query);
      if (!activeWorkspaceId || !query.trim()) {
        setSearchResults(null);
        return;
      }
      try {
        const results = await invoke<ChatMeta[]>("search_chats", {
          workspaceId: activeWorkspaceId,
          query,
        });
        setSearchResults(results);
      } catch (err) {
        console.error("Failed to search chats:", err);
        setSearchResults(null);
      }
    },
    [activeWorkspaceId],
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const hasMessages = messages.length > 0 || streamingContent.length > 0;
  const looseChats = chatHistory.filter((c) => !c.folder_id);
  const chatsByFolder = (folderId: string): ChatMeta[] =>
    chatHistory.filter((c) => c.folder_id === folderId);

  // ── Return ─────────────────────────────────────────────────────────────────
  return {
    // State
    messages,
    inputValue,
    models,
    selectedModel,
    isStreaming,
    currentChatId,
    streamingContent,
    error,
    chatHistory,
    sidebarOpen,
    hasMessages,

    // Workspace state
    workspaces,
    activeWorkspaceId,
    activeWorkspace,

    // Folder state
    folders,

    // Search state
    searchQuery,
    searchResults,

    // Derived
    looseChats,
    chatsByFolder,

    // Setters
    setInputValue,
    setSelectedModel,
    setError,
    setSidebarOpen,

    // Chat actions
    sendMessage,
    startNewChat,
    loadChat,
    renameChatAction,
    deleteChatAction,
    moveChatToFolderAction,
    removeChatFromFolderAction,
    refreshChatHistory,

    // Workspace actions
    switchWorkspace,
    createNewWorkspace,
    renameWorkspaceAction,
    deleteWorkspaceAction,

    // Folder actions
    createNewFolder,
    renameFolderAction,
    deleteFolderAction,

    // Search actions
    searchChats,
    clearSearch,
  };
}
