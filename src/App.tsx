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
    sidebarOpen,
    hasMessages,

    // Workspace
    workspaces,
    activeWorkspace,

    // Folders
    folders,
    looseChats,
    chatsByFolder,

    // Search
    searchQuery,
    searchResults,

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

    // Workspace actions
    switchWorkspace,
    createNewWorkspace,
    renameWorkspaceAction,
    deleteWorkspaceAction,

    // Folder actions
    createNewFolder,
    renameFolderAction,
    deleteFolderAction,
    moveChatToFolderAction,
    removeChatFromFolderAction,

    // Search actions
    searchChats,
    clearSearch,
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
        currentChatId={currentChatId}
        onNewChat={startNewChat}
        onLoadChat={loadChat}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        // Workspace
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSwitchWorkspace={switchWorkspace}
        onCreateWorkspace={createNewWorkspace}
        onRenameWorkspace={renameWorkspaceAction}
        onDeleteWorkspace={deleteWorkspaceAction}
        // Folders
        folders={folders}
        looseChats={looseChats}
        chatsByFolder={chatsByFolder}
        onCreateFolder={createNewFolder}
        onRenameFolder={renameFolderAction}
        onDeleteFolder={deleteFolderAction}
        onMoveToFolder={moveChatToFolderAction}
        onRemoveChatFromFolder={removeChatFromFolderAction}
        // Chat CRUD
        onRenameChat={renameChatAction}
        onDeleteChat={deleteChatAction}
        // Search
        searchQuery={searchQuery}
        searchResults={searchResults}
        onSearch={searchChats}
        onClearSearch={clearSearch}
        // Models (for settings)
        models={models}
      />

      {/* Main content */}
      <main className="main-content">
        {/* Top bar */}
        <div className="top-bar">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
            {/* Sidebar panel icon */}
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
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
