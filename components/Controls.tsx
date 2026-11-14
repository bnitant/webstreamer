'use client'

import {
  Mic, MicOff,
  Video, VideoOff,
  Monitor, MonitorOff,
  MessageSquare,
  Users,
  PhoneOff,
} from 'lucide-react'
import { motion } from 'framer-motion'

interface ControlsProps {
  isMuted:            boolean
  isCameraOff:        boolean
  isScreenSharing:    boolean
  showChat:           boolean
  showParticipants:   boolean
  onToggleMic:        () => void
  onToggleCamera:     () => void
  onToggleScreenShare:() => void
  onToggleChat:       () => void
  onToggleParticipants:() => void
  onLeave:            () => void
}

interface CtrlBtnProps {
  onClick:    () => void
  active?:    boolean
  danger?:    boolean
  title:      string
  children:   React.ReactNode
  activeLabel?:string
  inactiveLabel?:string
  label?:     string
}

function CtrlBtn({ onClick, active, danger, title, children, label }: CtrlBtnProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.93 }}
      onClick={onClick}
      title={title}
      className={`flex flex-col items-center gap-1.5 group`}
    >
      <span
        className={`ctrl-btn
          ${active ? 'ctrl-btn-active' : ''}
          ${danger ? 'ctrl-btn-danger' : ''}
        `}
      >
        {children}
      </span>
      {label && (
        <span className={`text-[10px] font-medium transition-colors ${
          active ? 'text-sky-400' : danger ? 'text-red-400' : 'text-slate-500 group-hover:text-slate-300'
        }`}>
          {label}
        </span>
      )}
    </motion.button>
  )
}

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
  onLeave,
}: ControlsProps) {
  return (
    <div className="glass px-6 py-3 rounded-2xl flex items-center gap-4 md:gap-6 shadow-glow-sm">
      {/* Mic */}
      <CtrlBtn
        onClick={onToggleMic}
        active={!isMuted}
        title={isMuted ? 'Unmute' : 'Mute'}
        label={isMuted ? 'Unmute' : 'Mute'}
      >
        {isMuted
          ? <MicOff className="w-5 h-5 text-red-400" />
          : <Mic    className="w-5 h-5" />}
      </CtrlBtn>

      {/* Camera */}
      <CtrlBtn
        onClick={onToggleCamera}
        active={!isCameraOff}
        title={isCameraOff ? 'Start camera' : 'Stop camera'}
        label={isCameraOff ? 'Start cam' : 'Stop cam'}
      >
        {isCameraOff
          ? <VideoOff className="w-5 h-5 text-red-400" />
          : <Video    className="w-5 h-5" />}
      </CtrlBtn>

      {/* Screen share */}
      <CtrlBtn
        onClick={onToggleScreenShare}
        active={isScreenSharing}
        title={isScreenSharing ? 'Stop sharing' : 'Share screen'}
        label={isScreenSharing ? 'Stop share' : 'Share'}
      >
        {isScreenSharing
          ? <MonitorOff className="w-5 h-5 text-sky-400" />
          : <Monitor    className="w-5 h-5" />}
      </CtrlBtn>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Chat */}
      <CtrlBtn
        onClick={onToggleChat}
        active={showChat}
        title="Chat"
        label="Chat"
      >
        <MessageSquare className="w-5 h-5" />
      </CtrlBtn>

      {/* Participants */}
      <CtrlBtn
        onClick={onToggleParticipants}
        active={showParticipants}
        title="Participants"
        label="People"
      >
        <Users className="w-5 h-5" />
      </CtrlBtn>

      {/* Divider */}
      <div className="w-px h-8 bg-white/10 mx-1" />

      {/* Leave */}
      <CtrlBtn
        onClick={onLeave}
        danger={true}
        title="Leave room"
        label="Leave"
      >
        <PhoneOff className="w-5 h-5" />
      </CtrlBtn>
    </div>
  )
}
