'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import VideoGrid from './VideoGrid'
import ScreenShareView from './ScreenShareView'
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
    isConnected,
    localName,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    leaveRoom,
  } = useRoom(roomId)

  const sidebarOpen = showChat || showParticipants

  return (
    <div className="flex flex-col h-screen bg-dark-900 overflow-hidden select-none">
      {/* ── Top bar ─────────────────────────────────── */}
      <header className="shrink-0 flex items-center justify-between px-5 py-3 border-b border-white/5 bg-dark-800/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-glow-sm">
            <span className="text-xs font-bold text-white">W</span>
          </div>
          <span className="font-heading font-semibold text-white text-sm">WebStreamer</span>
          <span className="hidden md:block text-slate-600 text-xs">·</span>
          <span className="hidden md:block text-slate-500 text-xs font-mono truncate max-w-[180px]">{roomId}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* connection indicator */}
          <span className={`flex items-center gap-1.5 text-xs ${isConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`} />
            {isConnected ? 'Connected' : 'Connecting…'}
          </span>
          <button
            onClick={() => { navigator.clipboard.writeText(window.location.href) }}
            className="glass px-3 py-1 text-xs text-sky-400 hover:text-sky-300 hover:bg-white/10 transition-colors"
          >
            Copy link
          </button>
        </div>
      </header>

      {/* ── Main area ───────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video / Screen area */}
        <div className="flex-1 relative overflow-hidden">
          {isScreenSharing && screenStream ? (
            <ScreenShareView stream={screenStream} />
          ) : (
            <VideoGrid
              localStream={localStream}
              remoteStreams={remoteStreams}
              participants={participants}
              localName={localName}
              isMuted={isMuted}
              isCameraOff={isCameraOff}
            />
          )}
        </div>

        {/* Right sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="shrink-0 flex flex-col border-l border-white/5 bg-dark-800/90 backdrop-blur-xl overflow-hidden"
              style={{ width: 320 }}
            >
              {/* Tab switcher */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => { setShowParticipants(true); setShowChat(false) }}
                  className={`flex-1 py-3 text-xs font-medium transition-colors ${
                    showParticipants
                      ? 'text-sky-400 border-b-2 border-sky-500'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Participants ({participants.length + 1})
                </button>
                <button
                  onClick={() => { setShowChat(true); setShowParticipants(false) }}
                  className={`flex-1 py-3 text-xs font-medium transition-colors ${
                    showChat
                      ? 'text-sky-400 border-b-2 border-sky-500'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  Chat
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                {showParticipants && (
                  <ParticipantsList
                    participants={participants}
                    localName={localName}
                  />
                )}
                {showChat && (
                  <ChatPanel
                    messages={messages}
                    onSend={sendMessage}
                    localName={localName}
                  />
                )}
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* ── Controls ────────────────────────────────── */}
      <div className="shrink-0 flex justify-center items-center py-4 px-6 border-t border-white/5 bg-dark-800/80 backdrop-blur-sm z-20">
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
          onLeave={leaveRoom}
        />
      </div>
    </div>
  )
}
