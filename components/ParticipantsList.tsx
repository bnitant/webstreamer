'use client'

import { MicOff, VideoOff, Wifi, WifiOff } from 'lucide-react'
import type { Participant } from '@/lib/hooks/useSocket'

const AVATAR_GRADIENTS = [
  'from-sky-500 to-blue-600',
  'from-indigo-500 to-purple-600',
  'from-cyan-500 to-sky-600',
  'from-blue-500 to-indigo-600',
  'from-teal-500 to-cyan-600',
  'from-violet-500 to-indigo-600',
]

function getGradient(index: number) {
  return AVATAR_GRADIENTS[index % AVATAR_GRADIENTS.length]
}

function qualityColor(quality: Participant['quality']) {
  switch (quality) {
    case 'good': return 'text-emerald-400'
    case 'fair': return 'text-amber-400'
    case 'poor': return 'text-red-400'
    default:     return 'text-slate-500'
  }
}

interface ParticipantsListProps {
  participants: Participant[]
  localName:    string
}

export default function ParticipantsList({ participants, localName }: ParticipantsListProps) {
  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)

  const all = [
    { name: localName, peerId: 'local', isMuted: false, isCameraOff: false, quality: 'good' as const },
    ...participants,
  ]

  return (
    <div className="p-4 space-y-2 overflow-y-auto h-full">
      <p className="text-xs text-slate-600 uppercase tracking-wider mb-3 font-medium">
        {all.length} participant{all.length !== 1 ? 's' : ''}
      </p>
      {all.map((p, i) => (
        <div
          key={p.peerId}
          className="flex items-center gap-3 glass px-3 py-2.5 rounded-xl"
        >
          {/* Avatar */}
          <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${getGradient(i)} flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-glow-sm`}>
            {initials(p.name)}
          </div>

          {/* Name */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {p.name}
              {p.peerId === 'local' && (
                <span className="ml-1 text-xs text-sky-400">(You)</span>
              )}
            </p>
            <p className={`text-xs capitalize ${qualityColor(p.quality)}`}>
              {p.quality === 'good' ? 'Connected' : p.quality === 'fair' ? 'Fair connection' : 'Poor connection'}
            </p>
          </div>

          {/* Status icons */}
          <div className="flex gap-1.5 shrink-0">
            {p.isMuted && (
              <MicOff className="w-3.5 h-3.5 text-red-400" />
            )}
            {p.isCameraOff && (
              <VideoOff className="w-3.5 h-3.5 text-slate-500" />
            )}
            {p.quality === 'poor'
              ? <WifiOff className="w-3.5 h-3.5 text-red-400" />
              : <Wifi className={`w-3.5 h-3.5 ${qualityColor(p.quality)}`} />
            }
          </div>
        </div>
      ))}
    </div>
  )
}
