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

export interface UseChatOptions {
  onChatListChange?: () => void;
}

/**
 * Custom hook for managing chat functionality in the frontend.
 * Handles chat messages, streaming responses, model selection, chat history,
 * sidebar state, and search. Provides all state and actions needed by the
 * chat interface components like message list, input field, and sidebar.
 *
 * @param activeWorkspaceId - The ID of the currently active workspace
 * @param options - Optional callbacks for chat list changes
 * @returns State and actions for chat management
 */
export function useChat(activeWorkspaceId: string, options?: UseChatOptions) {
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

  const streamingContentRef = useRef("");

  // Models
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

  /**
   * Fetches chat history for a workspace from the backend.
   * Called on initial load and after any chat operations (create, rename, delete, move).
   * Updates the chatHistory state used by the sidebar to display chat lists.
   *
   * @param wsId - Optional workspace ID; defaults to activeWorkspaceId if not provided
   */
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

  // Streaming listeners
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

  /**
   * Resets all chat-related state when starting a new chat or loading a different chat.
   * Clears messages, current chat ID, streaming content, search query, and search results.
   * Used by startNewChat and loadChat to prepare the UI for a fresh conversation.
   */
  const resetChatState = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    streamingContentRef.current = "";
    setStreamingContent("");
    setSearchQuery("");
    setSearchResults(null);
  }, []);

  /**
   * Sends a user message to the backend and initiates streaming response.
   * Adds user message to UI immediately, calls backend to send message,
   * and listens for streaming chunks to display AI responses in real-time.
   * Handles loading state and errors for the send action.
   *
   * @param text - The message text to send
   */
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

  /**
   * Initiates a new chat conversation.
   * Resets chat state, clears any current chat ID, and clears error state.
   * Called when user clicks the "new chat" button in the sidebar.
   */
  const startNewChat = useCallback(() => {
    resetChatState();
    setError(null);
    setIsStreaming(false);
  }, [resetChatState]);

  /**
   * Loads an existing chat by its ID from the backend.
   * Fetches all messages for the chat, sets them in state, and restores
   * the model that was used in that conversation. Used when clicking a chat
   * in the sidebar history to continue a previous conversation.
   *
   * @param chatId - The ID of the chat to load
   */
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

  /**
   * Renames a chat's title in the backend and refreshes the chat list.
   * Called from the sidebar when user edits a chat title via inline input.
   * Triggers the onChatListChange callback to update parent components.
   *
   * @param chatId - The ID of the chat to rename
   * @param newTitle - The new title for the chat
   */
  const renameChatAction = useCallback(
    async (chatId: string, newTitle: string) => {
      try {
        await invoke("rename_chat", { chatId, newTitle });
        await refreshChatHistory();
        options?.onChatListChange?.();
      } catch (err) {
        console.error("Failed to rename chat:", err);
        setError(String(err));
      }
    },
    [refreshChatHistory, options?.onChatListChange],
  );

  /**
   * Deletes a chat from the backend and updates the UI.
   * Removes the chat from history, clears current chat if it was the deleted one,
   * and triggers the onChatListChange callback. Called from sidebar context menu
   * or action button when user deletes a chat.
   *
   * @param chatId - The ID of the chat to delete
   */
  const deleteChatAction = useCallback(
    async (chatId: string) => {
      try {
        await invoke("delete_chat", { chatId });
        await refreshChatHistory();
        options?.onChatListChange?.();
        if (currentChatId === chatId) {
          setMessages([]);
          setCurrentChatId(null);
        }
      } catch (err) {
        console.error("Failed to delete chat:", err);
        setError(String(err));
      }
    },
    [refreshChatHistory, options?.onChatListChange, currentChatId],
  );

  /**
   * Moves a chat to a different folder or into a folder.
   * First removes the chat from its current folder (if any), then adds it
   * to the target folder. Refreshes chat history after the move completes.
   * Used by the sidebar folder picker and context menu to reorganize chats.
   *
   * @param chatId - The ID of the chat to move
   * @param newFolderId - The ID of the target folder
   */
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
        options?.onChatListChange?.();
      } catch (err) {
        console.error("Failed to move chat to folder:", err);
        setError(String(err));
      }
    },
    [chatHistory, refreshChatHistory, options?.onChatListChange],
  );

  /**
   * Removes a chat from its folder, making it a loose (ungrouped) chat.
   * Called when user drags a chat to the "Recent" section or uses the
   * "Remove from folder" option in context menu. The chat appears in the
   * loose chats list after removal.
   *
   * @param chatId - The ID of the chat to remove from its folder
   */
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
        options?.onChatListChange?.();
      } catch (err) {
        console.error("Failed to remove chat from folder:", err);
        setError(String(err));
      }
    },
    [chatHistory, refreshChatHistory, options?.onChatListChange],
  );

  /**
   * Searches chats within a workspace by query string.
   * Called as user types in the sidebar search input. Debouncing should be
   * handled by the calling component. Returns matching chats sorted by relevance.
   * Results are displayed in a dedicated search results section in the sidebar.
   *
   * @param query - The search query string
   */
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

  /**
   * Clears the current search and hides search results.
   * Called when user clicks the clear button (X) in the search input or presses Escape.
   * Returns the sidebar to showing the normal folders and chat history view.
   */
  const clearSearch = useCallback(() => {
    setSearchQuery("");
    setSearchResults(null);
  }, []);

  const hasMessages = messages.length > 0 || streamingContent.length > 0;
  const looseChats = chatHistory.filter((c) => !c.folder_id);
  const chatsByFolder = (folderId: string): ChatMeta[] =>
    chatHistory.filter((c) => c.folder_id === folderId);

  return {
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
    searchQuery,
    searchResults,
    looseChats,
    chatsByFolder,

    setInputValue,
    setSelectedModel,
    setError,
    setSidebarOpen,

    sendMessage,
    startNewChat,
    loadChat,
    renameChatAction,
    deleteChatAction,
    moveChatToFolderAction,
    removeChatFromFolderAction,
    refreshChatHistory,
    resetChatState,

    searchChats,
    clearSearch,
  };
}
