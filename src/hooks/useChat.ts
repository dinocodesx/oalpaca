import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type {
  ChatMessage,
  Model,
  ChatStreamEvent,
  ChatStreamError,
  ChatMeta,
} from "../types/chat";

export function useChat() {
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

  // Use a ref to accumulate streaming content to avoid
  // the state-within-state-setter anti-pattern that caused duplications
  const streamingContentRef = useRef("");

  // Fetch available models on mount
  useEffect(() => {
    async function fetchModels() {
      try {
        const result = await invoke<Model[]>("list_models");
        setModels(result);
        if (result.length > 0) {
          setSelectedModel(result[0].name);
        }
      } catch (err) {
        console.error("Failed to fetch models:", err);
        setError(String(err));
      }
    }
    fetchModels();
  }, []);

  // Fetch chat history
  const refreshChatHistory = useCallback(async () => {
    try {
      const result = await invoke<ChatMeta[]>("get_all_chats");
      setChatHistory(result);
    } catch (err) {
      console.error("Failed to fetch chat history:", err);
    }
  }, []);

  useEffect(() => {
    refreshChatHistory();
  }, [refreshChatHistory]);

  // Set up event listeners for streaming
  // FIX: Use a cancelled flag to properly handle StrictMode double-mount.
  // The previous approach stored unlisten fns in refs, but since listen()
  // is async, the cleanup function ran before the promise resolved,
  // leaving unlistenRef.current as null. This caused TWO listeners to be
  // active simultaneously, doubling every streamed token.
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
            // Finalize: append the complete assistant message
            const finalContent = streamingContentRef.current + content;
            setMessages((msgs) => [
              ...msgs,
              { role: "assistant", content: finalContent },
            ]);
            streamingContentRef.current = "";
            setStreamingContent("");
            setIsStreaming(false);

            // Refresh chat history
            invoke<ChatMeta[]>("get_all_chats")
              .then((chats) => {
                if (!cancelled) setChatHistory(chats);
              })
              .catch(console.error);
          }
        }
      );

      unlistenError = await listen<ChatStreamError>(
        "chat-stream-error",
        (event) => {
          if (cancelled) return;
          setError(event.payload.error);
          setIsStreaming(false);
          streamingContentRef.current = "";
          setStreamingContent("");
        }
      );

      // If the effect was cleaned up while we were awaiting,
      // immediately unlisten to prevent leaked listeners
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

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isStreaming || !selectedModel) return;

      setError(null);
      setIsStreaming(true);
      streamingContentRef.current = "";
      setStreamingContent("");

      const userMessage: ChatMessage = { role: "user", content: trimmed };
      setMessages((prev) => [...prev, userMessage]);
      setInputValue("");

      try {
        const chatId = await invoke<string>("send_chat_message", {
          chatId: currentChatId,
          model: selectedModel,
          message: trimmed,
        });
        setCurrentChatId(chatId);
      } catch (err) {
        setError(String(err));
        setIsStreaming(false);
      }
    },
    [isStreaming, selectedModel, currentChatId]
  );

  const startNewChat = useCallback(() => {
    setMessages([]);
    setCurrentChatId(null);
    streamingContentRef.current = "";
    setStreamingContent("");
    setError(null);
    setIsStreaming(false);
  }, []);

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

        // Find the model used for this chat
        const meta = chatHistory.find((c) => c.id === chatId);
        if (meta) {
          setSelectedModel(meta.model_used);
        }
        setSidebarOpen(false);
      } catch (err) {
        console.error("Failed to load chat:", err);
        setError(String(err));
      }
    },
    [chatHistory]
  );

  const hasMessages = messages.length > 0 || streamingContent.length > 0;

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

    // Setters
    setInputValue,
    setSelectedModel,
    setError,
    setSidebarOpen,

    // Actions
    sendMessage,
    startNewChat,
    loadChat,
    refreshChatHistory,
  };
}
