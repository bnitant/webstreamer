'use client'

import { useRef, useEffect } from 'react'
import { MicOff, VideoOff } from 'lucide-react'
import type { Participant } from '@/lib/hooks/useSocket'

interface RemoteStreamEntry {
  peerId: string
  stream: MediaStream
  name: string
}

interface VideoGridProps {
  localStream:   MediaStream | null
  remoteStreams: RemoteStreamEntry[]
  participants:  Participant[]
  localName:     string
  isMuted:       boolean
  isCameraOff:   boolean
}

function VideoTile({
  stream,
  name,
  isMuted,
  isCameraOff,
  isLocal,
  isActiveSpeaker,
}: {
  stream:          MediaStream | null
  name:            string
  isMuted:         boolean
  isCameraOff:     boolean
  isLocal:         boolean
  isActiveSpeaker: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div
      className={`video-tile aspect-video ${
        isActiveSpeaker ? 'video-tile-glow' : ''
      }`}
    >
      {stream && !isCameraOff ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={isLocal}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-dark-800">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-heading font-bold text-xl shadow-glow">
            {initials}
          </div>
        </div>
      )}

      {/* Name + status overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      <div className="absolute bottom-2 left-3 flex items-center gap-1.5">
        <span className="text-xs font-medium text-white drop-shadow-md">
          {name}
          {isLocal ? ' (You)' : ''}
        </span>
      </div>

      {/* Mute indicator */}
      <div className="absolute top-2 right-2 flex gap-1.5">
        {isMuted && (
          <span className="w-6 h-6 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center">
            <MicOff className="w-3 h-3 text-white" />
          </span>
        )}
        {isCameraOff && (
          <span className="w-6 h-6 rounded-full bg-slate-700/80 backdrop-blur-sm flex items-center justify-center">
            <VideoOff className="w-3 h-3 text-white" />
          </span>
        )}
      </div>

      {/* Active speaker glow ring */}
      {isActiveSpeaker && (
        <div className="absolute inset-0 rounded-xl ring-2 ring-sky-400 pointer-events-none animate-pulse-glow" />
      )}
    </div>
  )
}

const gridCols: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-2',
  4: 'grid-cols-2',
  5: 'grid-cols-3',
  6: 'grid-cols-3',
  7: 'grid-cols-3',
  8: 'grid-cols-3',
  9: 'grid-cols-3',
}

export default function VideoGrid({
  localStream,
  remoteStreams,
  participants,
  localName,
  isMuted,
  isCameraOff,
}: VideoGridProps) {
  const total = 1 + remoteStreams.length
  const cols  = gridCols[Math.min(total, 9)] ?? 'grid-cols-3'

  return (
    <div className={`h-full w-full p-4 grid ${cols} gap-3 auto-rows-fr`}>
      {/* Local tile */}
      <VideoTile
        stream={localStream}
        name={localName}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        isLocal={true}
        isActiveSpeaker={false}
      />

      {/* Remote tiles */}
      {remoteStreams.map((entry) => {
        const participant = participants.find((p) => p.peerId === entry.peerId)
        return (
          <VideoTile
            key={entry.peerId}
            stream={entry.stream}
            name={entry.name || participant?.name || 'Guest'}
            isMuted={participant?.isMuted ?? false}
            isCameraOff={participant?.isCameraOff ?? false}
            isLocal={false}
            isActiveSpeaker={false}
          />
        )
      })}
    </div>
  )
}
