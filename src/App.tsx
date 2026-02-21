import { useEffect, useRef, useCallback } from "react";
import { useChat } from "./hooks/useChat";
import LeftSidebar from "./components/sidebars/leftSidebar";
import UserMessage from "./components/chat/userMessage";
import AssistantMessage from "./components/chat/assistantMessage";
import ChatBox from "./components/chat/chatBox";
import "./App.css";

function App() {
  const {
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

    setInputValue,
    setSelectedModel,
    setError,
    setSidebarOpen,

    sendMessage,
    startNewChat,
    loadChat,
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  const handleSend = () => {
    sendMessage(inputValue);
  };

  // Build the interleaved message list: user messages shown as headings,
  // assistant messages rendered with markdown
  let userIndex = 0;
  const renderedMessages = messages.map((msg, idx) => {
    if (msg.role === "user") {
      const isFirst = userIndex === 0;
      userIndex++;
      return <UserMessage key={idx} message={msg} isFirst={isFirst} />;
    }
    return <AssistantMessage key={idx} content={msg.content} />;
  });

  return (
    <div className="app-container">
      {/* Left sidebar */}
      <LeftSidebar
        isOpen={sidebarOpen}
        chatHistory={chatHistory}
        currentChatId={currentChatId}
        onNewChat={startNewChat}
        onLoadChat={loadChat}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main content */}
      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title="Toggle sidebar"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <div className="top-bar-spacer" />
        </div>

        {/* Chat area */}
        <div className="chat-area">
          {!hasMessages ? (
            <div className="welcome-container">
              <h1 className="welcome-heading">Welcome Back</h1>
              <p className="welcome-subtext">
                Start a conversation with your local AI model.
              </p>
            </div>
          ) : (
            <div className="messages-container">
              {renderedMessages}

              {/* Streaming assistant message */}
              {isStreaming && (
                <AssistantMessage
                  content={streamingContent}
                  isStreaming={true}
                />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error display */}
        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

        {/* Chat input */}
        <ChatBox
          inputValue={inputValue}
          onInputChange={setInputValue}
          onSend={handleSend}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          isStreaming={isStreaming}
        />
      </main>
    </div>
  );
}

export default App;
