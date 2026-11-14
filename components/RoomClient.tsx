'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import VideoGrid from './VideoGrid'
import ChatPanel from './ChatPanel'
import Controls from './Controls'
import ParticipantsList from './ParticipantsList'
import { useRoom } from '@/lib/hooks/useRoom'

interface RoomClientProps {
  roomId: string
}

export default function RoomClient({ roomId }: RoomClientProps) {
  const [showChat, setShowChat] = useState(false)
  const [showParticipants, setShowParticipants] = useState(false)

  const {
    localStream,
    remoteStreams,
    isScreenSharing,
    screenStream,
    isMuted,
    isCameraOff,
    messages,
    participants,
    reactions,
    isConnected,
    localName,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    sendReaction,
    leaveRoom,
  } = useRoom(roomId)

  const sidebarOpen = showChat || showParticipants

  const closeSidebar = () => {
    setShowChat(false)
    setShowParticipants(false)
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-[#070b14] overflow-hidden select-none">
      {/* ── Top Bar ─────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-3 sm:px-5 py-2 sm:py-2.5 border-b border-white/5 bg-[#0a0f1e]/80 backdrop-blur-md z-20">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <div className="shrink-0 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-glow-sm">
            <span className="text-xs font-bold text-white">W</span>
          </div>
          <span className="shrink-0 font-heading font-semibold text-white text-xs sm:text-sm tracking-wide">WebStreamer</span>
          <span className="hidden sm:block text-slate-600 text-xs">·</span>
          <span className="hidden sm:block text-slate-400 text-xs font-mono bg-white/5 px-2 py-0.5 rounded max-w-[140px] md:max-w-[200px] truncate">
            {roomId}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Connection status */}
          <span className={`flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs font-medium ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            <span className="hidden xs:inline">{isConnected ? 'Connected' : 'Connecting…'}</span>
          </span>
          <button
            onClick={() => {
              if (typeof window !== 'undefined') {
                navigator.clipboard.writeText(window.location.href)
              }
            }}
            className="glass px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-medium text-sky-400 hover:text-sky-300 hover:bg-white/10 rounded-lg transition-colors"
          >
            Copy link
          </button>
        </div>
      </header>

      {/* ── Main Area ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Video Stage — takes full width on mobile, shrinks on desktop when sidebar is open */}
        <div className="flex-1 relative overflow-hidden">
          <VideoGrid
            localStream={localStream}
            screenStream={screenStream}
            remoteStreams={remoteStreams}
            participants={participants}
            reactions={reactions}
            localName={localName}
            isMuted={isMuted}
            isCameraOff={isCameraOff}
            isScreenSharing={isScreenSharing}
          />
        </div>

        {/* ── Desktop Sidebar (md+): slide in from right ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              key="desktop-sidebar"
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 300, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="hidden md:flex shrink-0 flex-col border-l border-white/5 bg-[#0a0f1e]/95 backdrop-blur-xl overflow-hidden z-30"
              style={{ width: 300 }}
            >
              {/* Tab switcher */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => { setShowParticipants(true); setShowChat(false) }}
                  className={`flex-1 py-3 text-xs font-semibold tracking-wide transition-colors ${
                    showParticipants
                      ? 'text-sky-400 border-b-2 border-sky-500 bg-white/[0.02]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  People ({participants.length + 1})
                </button>
                <button
                  onClick={() => { setShowChat(true); setShowParticipants(false) }}
                  className={`flex-1 py-3 text-xs font-semibold tracking-wide transition-colors ${
                    showChat
                      ? 'text-sky-400 border-b-2 border-sky-500 bg-white/[0.02]'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Chat ({messages.length})
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showParticipants && (
                  <ParticipantsList participants={participants} localName={localName} />
                )}
                {showChat && (
                  <ChatPanel messages={messages} onSend={sendMessage} localName={localName} />
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ── Mobile Sidebar: full-screen overlay ── */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              key="mobile-sidebar"
              initial={{ opacity: 0, y: '100%' }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: '100%' }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="md:hidden absolute inset-0 z-40 flex flex-col bg-[#0a0f1e]/98 backdrop-blur-xl"
            >
              {/* Mobile sidebar header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                <div className="flex gap-4">
                  <button
                    onClick={() => { setShowParticipants(true); setShowChat(false) }}
                    className={`text-sm font-semibold pb-1 transition-colors ${
                      showParticipants ? 'text-sky-400 border-b-2 border-sky-500' : 'text-slate-400'
                    }`}
                  >
                    People ({participants.length + 1})
                  </button>
                  <button
                    onClick={() => { setShowChat(true); setShowParticipants(false) }}
                    className={`text-sm font-semibold pb-1 transition-colors ${
                      showChat ? 'text-sky-400 border-b-2 border-sky-500' : 'text-slate-400'
                    }`}
                  >
                    Chat ({messages.length})
                  </button>
                </div>
                <button
                  onClick={closeSidebar}
                  className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
                  aria-label="Close panel"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                {showParticipants && (
                  <ParticipantsList participants={participants} localName={localName} />
                )}
                {showChat && (
                  <ChatPanel messages={messages} onSend={sendMessage} localName={localName} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls Bar ─────────────────────────────────────────────── */}
      <div className="shrink-0 flex justify-center items-center py-2 sm:py-3 px-2 sm:px-6 border-t border-white/5 bg-[#080d1a]/85 backdrop-blur-md z-20">
        <Controls
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          showChat={showChat}
          showParticipants={showParticipants}
          onToggleMic={toggleMic}
          onToggleCamera={toggleCamera}
          onToggleScreenShare={() =>
            isScreenSharing ? stopScreenShare() : startScreenShare()
          }
          onToggleChat={() => { setShowChat((v) => !v); setShowParticipants(false) }}
          onToggleParticipants={() => { setShowParticipants((v) => !v); setShowChat(false) }}
          onSendReaction={sendReaction}
          onLeave={leaveRoom}
        />
      </div>
    </div>
  )
}
