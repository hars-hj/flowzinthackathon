import { useState } from 'react'
import { Header } from './components/Header'
import { InputArea } from './components/InputArea'
import { MessageList } from './components/MessageList'
import { Sidebar } from './components/Sidebar'
import { useAutoScroll } from './hooks/useAutoScroll'
import { useChat } from './hooks/useChat'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const {
    sessions,
    activeSessionId,
    messages,
    isLoading,
    inputValue,
    setInputValue,
    sendMessage,
    selectSession,
    newChat,
    clearConversation,
    formatRelativeTime,
  } = useChat()

  const bottomRef = useAutoScroll([messages, isLoading])

  const handleSuggestedSelect = (text: string) => {
    sendMessage(text)
  }

  return (
    <div className="grid h-full grid-cols-1 overflow-hidden md:grid-cols-[260px_1fr]">
      <Sidebar
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={selectSession}
        onNewChat={newChat}
        formatRelativeTime={formatRelativeTime}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <main className="flex min-w-0 flex-col overflow-hidden bg-background">
        <Header
          onClear={clearConversation}
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <MessageList
          messages={messages}
          isLoading={isLoading}
          onSuggestedSelect={handleSuggestedSelect}
          bottomRef={bottomRef}
        />
        <InputArea
          value={inputValue}
          onChange={setInputValue}
          onSend={sendMessage}
          isLoading={isLoading}
        />
      </main>
    </div>
  )
}

export default App
