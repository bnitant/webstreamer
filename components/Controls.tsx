'use client'

import { useState } from 'react'
import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
  Smile,
  Hand,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ControlsProps {
  isMuted:             boolean
  isCameraOff:         boolean
  isScreenSharing:     boolean
  showChat:            boolean
  showParticipants:    boolean
  onToggleMic:         () => void
  onToggleCamera:      () => void
  onToggleScreenShare: () => void
  onToggleChat:        () => void
  onToggleParticipants:() => void
  onSendReaction?:     (emoji: string) => void
  onLeave:             () => void
}

interface CtrlBtnProps {
  onClick:   () => void
  active?:   boolean
  danger?:   boolean
  title:     string
  children:  React.ReactNode
  label?:    string
}

function CtrlBtn({ onClick, active, danger, title, children, label }: CtrlBtnProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      title={title}
      aria-label={title}
      className="flex flex-col items-center gap-0.5 group relative"
    >
      <span
        className={`ctrl-btn ${active ? 'ctrl-btn-active' : ''} ${danger ? 'ctrl-btn-danger' : ''}`}
      >
        {children}
      </span>
      {label && (
        <span
          className={`hidden sm:block text-[9px] sm:text-[10px] font-medium transition-colors leading-none ${
            active
              ? 'text-sky-400'
              : danger
              ? 'text-red-400'
              : 'text-slate-500 group-hover:text-slate-300'
          }`}
        >
          {label}
        </span>
      )}
    </motion.button>
  )
}

const EMOJIS = ['💖', '👍', '👏', '🎉', '😂', '🔥', '🙌', '✨']

export default function Controls({
  isMuted,
  isCameraOff,
  isScreenSharing,
  showChat,
  showParticipants,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleChat,
  onToggleParticipants,
  onSendReaction,
  onLeave,
}: ControlsProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isHandRaised, setIsHandRaised] = useState(false)

  const handleEmojiClick = (emoji: string) => {
    onSendReaction?.(emoji)
    setShowEmojiPicker(false)
  }

  const handleRaiseHand = () => {
    setIsHandRaised((prev) => !prev)
    onSendReaction?.(isHandRaised ? ' lowered hand' : '✋')
  }

  return (
    <div className="relative glass px-2 sm:px-4 md:px-6 py-2 sm:py-2.5 rounded-2xl flex items-center gap-1.5 sm:gap-3 md:gap-5 shadow-[0_10px_35px_rgba(0,0,0,0.5)] border border-white/10 bg-dark-800/90 backdrop-blur-xl max-w-full">
      {/* Mic */}
      <CtrlBtn
        onClick={onToggleMic}
        active={!isMuted}
        title={isMuted ? 'Unmute microphone' : 'Mute microphone'}
        label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
      </CtrlBtn>

      {/* Camera */}
      <CtrlBtn
        onClick={onToggleCamera}
        active={!isCameraOff}
        title={isCameraOff ? 'Start camera' : 'Stop camera'}
        label={isCameraOff ? 'Start cam' : 'Stop cam'}
      >
        {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
      </CtrlBtn>

      {/* Screen share — hidden on very small phones */}
      <CtrlBtn
        onClick={onToggleScreenShare}
        active={isScreenSharing}
        title={isScreenSharing ? 'Stop screen share' : 'Share screen'}
        label={isScreenSharing ? 'Stop' : 'Share'}
      >
        {isScreenSharing ? (
          <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
        ) : (
          <Monitor className="w-4 h-4 sm:w-5 sm:h-5" />
        )}
      </CtrlBtn>

      {/* Emoji Reactions */}
      <div className="relative">
        <CtrlBtn
          onClick={() => setShowEmojiPicker((prev) => !prev)}
          active={showEmojiPicker}
          title="Send reaction"
          label="React"
        >
          <Smile className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
        </CtrlBtn>

        {/* Emoji Popover */}
        <AnimatePresence>
          {showEmojiPicker && (
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: -8 }}
              exit={{ opacity: 0, scale: 0.85, y: 10 }}
              transition={{ duration: 0.15 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 bg-dark-800/95 border border-white/10 rounded-2xl p-1.5 sm:p-2 flex items-center gap-1 sm:gap-1.5 shadow-[0_15px_35px_rgba(0,0,0,0.6)] backdrop-blur-xl z-50"
            >
              {EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => handleEmojiClick(emoji)}
                  className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl hover:bg-white/10 text-xl sm:text-2xl flex items-center justify-center transition-transform hover:scale-125 active:scale-95"
                  title={`React with ${emoji}`}
                >
                  {emoji}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Raise Hand */}
      <CtrlBtn
        onClick={handleRaiseHand}
        active={isHandRaised}
        title={isHandRaised ? 'Lower hand' : 'Raise hand'}
        label={isHandRaised ? 'Lower' : 'Raise'}
      >
        <Hand className={`w-4 h-4 sm:w-5 sm:h-5 ${isHandRaised ? 'text-amber-400' : ''}`} />
      </CtrlBtn>

      {/* Divider */}
      <div className="w-px h-6 sm:h-8 bg-white/10 mx-0 sm:mx-0.5" />

      {/* Chat */}
      <CtrlBtn
        onClick={onToggleChat}
        active={showChat}
        title="Chat panel"
        label="Chat"
      >
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
      </CtrlBtn>

      {/* Participants */}
      <CtrlBtn
        onClick={onToggleParticipants}
        active={showParticipants}
        title="People in room"
        label="People"
      >
        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
      </CtrlBtn>

      {/* Divider */}
      <div className="w-px h-6 sm:h-8 bg-white/10 mx-0 sm:mx-0.5" />

      {/* Leave */}
      <CtrlBtn
        onClick={onLeave}
        danger={true}
        title="Leave call"
        label="Leave"
      >
        <PhoneOff className="w-4 h-4 sm:w-5 sm:h-5" />
      </CtrlBtn>
    </div>
  )
}
