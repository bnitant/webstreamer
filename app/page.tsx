'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { v4 as uuidv4 } from 'uuid'
import { motion } from 'framer-motion'
import {
  Monitor,
  Video,
  Mic,
  MessageSquare,
  ArrowRight,
  Zap,
  Shield,
  Globe,
} from 'lucide-react'

const featureCards = [
  {
    icon: Monitor,
    title: 'Screen Share',
    description: 'Share your screen at up to 60fps with 8Mbps quality. Anti-lag optimizations built in.',
    color: 'from-sky-500/20 to-blue-600/10',
    border: 'border-sky-500/30',
    iconColor: 'text-sky-400',
  },
  {
    icon: Video,
    title: 'Video Call',
    description: 'HD video calling with adaptive bitrate. Connect with up to 9 participants simultaneously.',
    color: 'from-blue-500/20 to-indigo-600/10',
    border: 'border-blue-500/30',
    iconColor: 'text-blue-400',
  },
  {
    icon: Mic,
    title: 'Voice Call',
    description: 'Crystal-clear voice calls with noise suppression and echo cancellation.',
    color: 'from-indigo-500/20 to-purple-600/10',
    border: 'border-indigo-500/30',
    iconColor: 'text-indigo-400',
  },
  {
    icon: MessageSquare,
    title: 'Live Chat',
    description: 'Real-time chat alongside your call. Share links, messages, and reactions instantly.',
    color: 'from-cyan-500/20 to-sky-600/10',
    border: 'border-cyan-500/30',
    iconColor: 'text-cyan-400',
  },
]

const highlights = [
  { icon: Zap, label: 'Ultra low latency' },
  { icon: Shield, label: 'P2P encrypted' },
  { icon: Globe, label: 'No install needed' },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  },
}

const itemVariants = {
  hidden:   { opacity: 0, y: 24 },
  visible:  { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
}

export default function HomePage() {
  const router = useRouter()
  const [joinId, setJoinId] = useState('')
  const [joining, setJoining] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  const handleCreateRoom = async () => {
    setCreating(true)
    const id = uuidv4()
    router.push(`/room/${id}`)
  }

  const handleJoinRoom = () => {
    const trimmed = joinId.trim()
    if (!trimmed) {
      setError('Please enter a room ID or link.')
      return
    }
    setError('')
    setJoining(true)
    // Support pasting full URL or just an ID
    const match = trimmed.match(/([0-9a-f-]{36})/)
    const id = match ? match[1] : trimmed
    router.push(`/room/${id}`)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-dark-900 flex flex-col">
      {/* ── Background Orbs ─────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Large primary orb */}
        <div
          className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full animate-orb-pulse"
          style={{
            background: 'radial-gradient(circle, rgba(14,165,233,0.15) 0%, rgba(14,165,233,0.03) 60%, transparent 80%)',
            filter: 'blur(60px)',
          }}
        />
        {/* Secondary orb */}
        <div
          className="absolute top-1/3 -right-40 w-[500px] h-[500px] rounded-full animate-float"
          style={{
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0.03) 60%, transparent 80%)',
            filter: 'blur(60px)',
            animationDelay: '1s',
          }}
        />
        {/* Bottom orb */}
        <div
          className="absolute -bottom-32 left-1/3 w-[400px] h-[400px] rounded-full animate-float-reverse"
          style={{
            background: 'radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)',
            filter: 'blur(50px)',
            animationDelay: '2s',
          }}
        />
        {/* Floating particles */}
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              width:  `${4 + (i % 3) * 3}px`,
              height: `${4 + (i % 3) * 3}px`,
              background: ['#0ea5e9','#6366f1','#06b6d4','#38bdf8','#818cf8','#0284c7'][i],
              top:   `${10 + i * 15}%`,
              left:  `${5 + i * 16}%`,
              opacity: 0.4 + (i % 3) * 0.1,
              animation: `float ${6 + i}s ease-in-out infinite`,
              animationDelay: `${i * 0.8}s`,
              filter: 'blur(1px)',
            }}
          />
        ))}
      </div>

      {/* ── Header ──────────────────────────────────────────── */}
      <header className="relative z-10 flex items-center justify-between px-6 md:px-12 py-5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-glow-sm">
            <Monitor className="w-4 h-4 text-white" />
          </div>
          <span className="font-heading font-bold text-lg tracking-tight text-white">WebStreamer</span>
        </div>
        <div className="flex items-center gap-3 text-sm text-slate-400">
          {highlights.map(({ icon: Icon, label }) => (
            <span key={label} className="hidden md:flex items-center gap-1.5">
              <Icon className="w-3.5 h-3.5 text-sky-400" />
              {label}
            </span>
          ))}
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 py-16 md:py-24">
        <motion.div
          className="text-center max-w-3xl mx-auto"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Badge */}
          <motion.div variants={itemVariants} className="mb-6 inline-flex">
            <span className="glass px-4 py-1.5 text-xs font-medium text-sky-400 tracking-widest uppercase rounded-full border border-sky-500/30">
              ✦ WebRTC · Socket.io · Next.js 14
            </span>
          </motion.div>

          {/* Title */}
          <motion.h1
            variants={itemVariants}
            className="font-heading text-5xl md:text-7xl font-bold tracking-tight leading-tight mb-6"
          >
            <span className="gradient-text">WebStreamer</span>
          </motion.h1>

          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="text-lg md:text-xl text-slate-400 max-w-xl mx-auto mb-10 leading-relaxed"
          >
            Screen share, video call, voice call and chat&nbsp;—&nbsp;
            <span className="text-sky-400 font-medium">all in one place.</span>
          </motion.p>

          {/* CTA Buttons */}
          <motion.div
            variants={itemVariants}
            className="flex flex-col sm:flex-row items-center gap-4 justify-center mb-6"
          >
            <button
              onClick={handleCreateRoom}
              disabled={creating}
              className="btn-primary flex items-center gap-2 text-base w-full sm:w-auto"
            >
              {creating ? (
                <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Zap className="w-5 h-5" />
              )}
              {creating ? 'Creating room…' : 'Create Room'}
            </button>
          </motion.div>

          {/* Join Room */}
          <motion.div variants={itemVariants} className="max-w-md mx-auto">
            <div className="glass p-4 rounded-2xl">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-3 font-medium">
                Or join an existing room
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={joinId}
                  onChange={(e) => { setJoinId(e.target.value); setError('') }}
                  onKeyDown={(e) => e.key === 'Enter' && handleJoinRoom()}
                  placeholder="Room ID or link…"
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5
                             text-white placeholder-slate-500 text-sm
                             focus:outline-none focus:border-sky-500/50 focus:bg-white/8
                             transition-colors"
                />
                <button
                  onClick={handleJoinRoom}
                  disabled={joining}
                  className="btn-primary px-4 py-2.5 text-sm flex items-center gap-1.5"
                >
                  {joining ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  Join
                </button>
              </div>
              {error && (
                <p className="text-red-400 text-xs mt-2">{error}</p>
              )}
            </div>
          </motion.div>
        </motion.div>

        {/* ── Feature Cards ──────────────────────────────────── */}
        <motion.div
          className="mt-20 w-full max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 px-2"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-80px' }}
        >
          {featureCards.map((card) => {
            const Icon = card.icon
            return (
              <motion.div
                key={card.title}
                variants={itemVariants}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className={`glass-card bg-gradient-to-br ${card.color} border ${card.border} p-6`}
              >
                <div className={`w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mb-4 ${card.iconColor}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-semibold text-white mb-2">{card.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{card.description}</p>
              </motion.div>
            )
          })}
        </motion.div>
      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-8 text-slate-600 text-sm border-t border-white/5">
        <p>
          Built with{' '}
          <span className="text-sky-500">Next.js</span>,{' '}
          <span className="text-indigo-400">WebRTC</span> &amp;{' '}
          <span className="text-cyan-500">Socket.io</span>
          {' '}— WebStreamer &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  )
}
