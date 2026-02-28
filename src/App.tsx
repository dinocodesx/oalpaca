import { useEffect, useRef, useCallback } from "react";
import { useWorkspace } from "./hooks/useWorkspace";
import { useFolder } from "./hooks/useFolder";
import { useChat } from "./hooks/useChat";
import LeftSidebar from "./components/sidebars/leftSidebar";
import UserMessage from "./components/chat/userMessage";
import AssistantMessage from "./components/chat/assistantMessage";
import ChatBox from "./components/chat/chatBox";
import "./App.css";

// Main application component - root component that orchestrates workspace, folder, and chat state
function App() {
  // Initialize workspace hook - manages workspaces list, active workspace, and workspace actions
  const {
    workspaces,
    activeWorkspaceId,
    activeWorkspace,
    switchWorkspace,
    createNewWorkspace,
    renameWorkspaceAction,
    deleteWorkspaceAction,
  } = useWorkspace();

  // Initialize folder hook - manages folders for the active workspace
  const {
    folders,
    refreshFolders,
    createNewFolder,
    renameFolderAction,
    deleteFolderAction,
  } = useFolder(activeWorkspaceId);

  // Initialize chat hook - manages messages, models, chat history, search, and sidebar state
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
  } = useChat(activeWorkspaceId, { onChatListChange: refreshFolders });

  // Ref for auto-scrolling to bottom of chat messages
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scrolls the chat area to the bottom - used when new messages arrive
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Effect to auto-scroll when messages or streaming content changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Handler to send message - called by ChatBox when user submits input
  const handleSend = () => {
    sendMessage(inputValue);
  };

  // Handler to switch workspace - resets chat state after switching
  const handleSwitchWorkspace = useCallback(
    async (workspaceId: string) => {
      await switchWorkspace(workspaceId);
      resetChatState();
    },
    [switchWorkspace, resetChatState]
  );

  // Handler to create new workspace - resets chat state after creation
  const handleCreateNewWorkspace = useCallback(
    async (name: string) => {
      await createNewWorkspace(name);
      resetChatState();
    },
    [createNewWorkspace, resetChatState]
  );

  // Handler to delete workspace - refreshes folders and chat history for new active workspace
  const handleDeleteWorkspace = useCallback(
    async (workspaceId: string) => {
      const newWsId = await deleteWorkspaceAction(workspaceId);
      if (newWsId) {
        await refreshFolders(newWsId);
        await refreshChatHistory(newWsId);
      }
      resetChatState();
    },
    [deleteWorkspaceAction, refreshFolders, refreshChatHistory, resetChatState]
  );

  // Handler to delete folder - refreshes chat history after deletion
  const handleDeleteFolder = useCallback(
    async (folderId: string) => {
      await deleteFolderAction(folderId);
      await refreshChatHistory();
    },
    [deleteFolderAction, refreshChatHistory]
  );

  // Maps chat messages to UserMessage or AssistantMessage components for rendering
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
      <LeftSidebar
        isOpen={sidebarOpen}
        currentChatId={currentChatId}
        onNewChat={startNewChat}
        onLoadChat={loadChat}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        workspaces={workspaces}
        activeWorkspace={activeWorkspace}
        onSwitchWorkspace={handleSwitchWorkspace}
        onCreateWorkspace={handleCreateNewWorkspace}
        onRenameWorkspace={renameWorkspaceAction}
        onDeleteWorkspace={handleDeleteWorkspace}
        folders={folders}
        looseChats={looseChats}
        chatsByFolder={chatsByFolder}
        onCreateFolder={createNewFolder}
        onRenameFolder={renameFolderAction}
        onDeleteFolder={handleDeleteFolder}
        onMoveToFolder={moveChatToFolderAction}
        onRemoveChatFromFolder={removeChatFromFolderAction}
        onRenameChat={renameChatAction}
        onDeleteChat={deleteChatAction}
        searchQuery={searchQuery}
        searchResults={searchResults}
        onSearch={searchChats}
        onClearSearch={clearSearch}
        models={models}
      />

      <main className="main-content">
        <div className="top-bar">
          <button
            className="menu-btn"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
          >
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

        {error && (
          <div className="error-banner">
            <span>{error}</span>
            <button className="error-dismiss" onClick={() => setError(null)}>
              ✕
            </button>
          </div>
        )}

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
