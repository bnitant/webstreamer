'use client'

/**
 * useSocket — PeerJS-based signaling + chat
 *
 * Replaces the original Socket.io version which broke on Vercel (serverless
 * functions don't support persistent WebSocket connections).
 *
 * PeerJS uses its own hosted cloud broker (peerjs.com) for signaling so we
 * need zero server infrastructure.  Peers connect to each other via WebRTC
 * DataChannels for chat and MediaConnections for audio/video.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import Peer, { DataConnection } from 'peerjs'

export interface ChatMessage {
  name:      string
  text:      string
  timestamp: number
}

export interface Participant {
  peerId:      string
  name:        string
  isMuted:     boolean
  isCameraOff: boolean
  quality:     'good' | 'fair' | 'poor'
}

// ── Types for data-channel messages ──────────────────────────────────────────
type DCPayload =
  | { type: 'chat';    msg:  ChatMessage }
  | { type: 'join';    name: string }
  | { type: 'leave' }
  | { type: 'offer';        to: string; from: string; offer:     RTCSessionDescriptionInit }
  | { type: 'answer';       to: string; from: string; answer:    RTCSessionDescriptionInit }
  | { type: 'ice-candidate';to: string; from: string; candidate: RTCIceCandidateInit }

// ── Shared broker namespace ───────────────────────────────────────────────────
// We derive a stable peer ID from the room + user slot so joining the same
// room connects the same namespace.  Format: ws-<roomId>-<index>
// But PeerJS IDs must be globally unique, so we append a short random suffix.
function makePeerId(roomId: string): string {
  const safe  = roomId.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20)
  const rand  = Math.random().toString(36).slice(2, 8)
  return `ws-${safe}-${rand}`
}

// The "room coordinator" ID is deterministic so everyone can find each other.
// Realistically in a P2P mesh every peer just broadcasts to all known peers.
// We use a simple approach: when you join, you announce yourself to all
// existing peers stored in sessionStorage.
const PEER_LIST_KEY = (roomId: string) => `webstreamer-peers-${roomId}`

function getKnownPeers(roomId: string): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(sessionStorage.getItem(PEER_LIST_KEY(roomId)) || '[]')
  } catch { return [] }
}

function addKnownPeer(roomId: string, peerId: string) {
  if (typeof window === 'undefined') return
  const list = getKnownPeers(roomId)
  if (!list.includes(peerId)) {
    sessionStorage.setItem(PEER_LIST_KEY(roomId), JSON.stringify([...list, peerId]))
  }
}

function removeKnownPeer(roomId: string, peerId: string) {
  if (typeof window === 'undefined') return
  const list = getKnownPeers(roomId).filter(id => id !== peerId)
  sessionStorage.setItem(PEER_LIST_KEY(roomId), JSON.stringify(list))
}

// ── Hook interface ────────────────────────────────────────────────────────────
interface UseSocketReturn {
  peer:         Peer | null
  myPeerId:     string
  messages:     ChatMessage[]
  participants: Participant[]
  isConnected:  boolean
  sendMessage:  (text: string) => void
  emitOffer:    (to: string, offer: RTCSessionDescriptionInit) => void
  emitAnswer:   (to: string, answer: RTCSessionDescriptionInit) => void
  emitIceCandidate: (to: string, candidate: RTCIceCandidateInit) => void
  onOffer:      (cb: (from: string, offer: RTCSessionDescriptionInit) => void) => void
  onAnswer:     (cb: (from: string, answer: RTCSessionDescriptionInit) => void) => void
  onIceCandidate:(cb:(from: string, candidate: RTCIceCandidateInit) => void) => void
  onUserJoined: (cb: (user: { socketId: string; name: string }) => void) => void
  onUserLeft:   (cb: (socketId: string) => void) => void
}

export function useSocket(roomId: string, name: string): UseSocketReturn {
  const [peer,         setPeer]         = useState<Peer | null>(null)
  const [myPeerId,     setMyPeerId]     = useState('')
  const [messages,     setMessages]     = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isConnected,  setIsConnected]  = useState(false)

  // Ref mirrors for use inside callbacks without stale closures
  const peerRef        = useRef<Peer | null>(null)
  const dataConnsRef   = useRef<Map<string, DataConnection>>(new Map())

  // Callback refs — set once so we can call them from inside PeerJS events
  const onOfferCbRef        = useRef<((from: string, offer: RTCSessionDescriptionInit) => void) | null>(null)
  const onAnswerCbRef       = useRef<((from: string, answer: RTCSessionDescriptionInit) => void) | null>(null)
  const onIceCbRef          = useRef<((from: string, candidate: RTCIceCandidateInit) => void) | null>(null)
  const onUserJoinedCbRef   = useRef<((user: { socketId: string; name: string }) => void) | null>(null)
  const onUserLeftCbRef     = useRef<((socketId: string) => void) | null>(null)

  // ── Handle incoming DataConnection ────────────────────────────────────────
  const handleConn = useCallback((conn: DataConnection) => {
    conn.on('open', () => {
      dataConnsRef.current.set(conn.peer, conn)
      addKnownPeer(roomId, conn.peer)
    })

    conn.on('data', (raw) => {
      const payload = raw as DCPayload
      switch (payload.type) {
        case 'chat':
          setMessages(prev => [...prev, payload.msg])
          break
        case 'join':
          setParticipants(prev => {
            if (prev.find(p => p.peerId === conn.peer)) return prev
            return [...prev, { peerId: conn.peer, name: payload.name, isMuted: false, isCameraOff: false, quality: 'good' }]
          })
          onUserJoinedCbRef.current?.({ socketId: conn.peer, name: payload.name })
          // Reply so they know we exist too
          conn.send({ type: 'join', name } satisfies DCPayload)
          break
        case 'leave':
          setParticipants(prev => prev.filter(p => p.peerId !== conn.peer))
          onUserLeftCbRef.current?.(conn.peer)
          dataConnsRef.current.delete(conn.peer)
          removeKnownPeer(roomId, conn.peer)
          break
        case 'offer':
          if (payload.to === peerRef.current?.id) {
            onOfferCbRef.current?.(payload.from, payload.offer)
          }
          break
        case 'answer':
          if (payload.to === peerRef.current?.id) {
            onAnswerCbRef.current?.(payload.from, payload.answer)
          }
          break
        case 'ice-candidate':
          if (payload.to === peerRef.current?.id) {
            onIceCbRef.current?.(payload.from, payload.candidate)
          }
          break
      }
    })

    conn.on('close', () => {
      setParticipants(prev => prev.filter(p => p.peerId !== conn.peer))
      onUserLeftCbRef.current?.(conn.peer)
      dataConnsRef.current.delete(conn.peer)
      removeKnownPeer(roomId, conn.peer)
    })

    conn.on('error', (err) => {
      console.warn('[useSocket] DataConnection error:', err)
    })
  }, [roomId, name])

  // ── Bootstrap PeerJS ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!roomId || !name) return

    // Dynamically import PeerJS (browser-only)
    const myId = makePeerId(roomId)
    const p = new Peer(myId, {
      // Use the free PeerJS cloud — no server required
      host:   '0.peerjs.com',
      port:   443,
      secure: true,
      path:   '/',
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    })

    peerRef.current = p
    setPeer(p)

    p.on('open', (id) => {
      setMyPeerId(id)
      setIsConnected(true)
      addKnownPeer(roomId, id)

      // Connect to all previously known peers in this room
      const known = getKnownPeers(roomId).filter(pid => pid !== id)
      known.forEach(pid => {
        if (dataConnsRef.current.has(pid)) return
        const conn = p.connect(pid, { reliable: true })
        handleConn(conn)
        conn.on('open', () => {
          conn.send({ type: 'join', name } satisfies DCPayload)
        })
      })
    })

    p.on('connection', (conn) => {
      handleConn(conn)
    })

    p.on('disconnected', () => {
      setIsConnected(false)
      p.reconnect()
    })

    p.on('error', (err) => {
      console.warn('[useSocket] PeerJS error:', err)
      // If ID is taken, try with new random suffix
      if (err.type === 'unavailable-id') {
        p.destroy()
        // The useEffect cleanup will re-run next render
      }
    })

    return () => {
      // Notify all peers we're leaving
      dataConnsRef.current.forEach(conn => {
        try { conn.send({ type: 'leave' } satisfies DCPayload) } catch {}
        conn.close()
      })
      dataConnsRef.current.clear()
      removeKnownPeer(roomId, myId)
      p.destroy()
      peerRef.current = null
      setPeer(null)
      setIsConnected(false)
    }
  }, [roomId, name, handleConn])

  // ── Send chat to all connected peers ─────────────────────────────────────
  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = { name, text, timestamp: Date.now() }
    setMessages(prev => [...prev, msg])
    dataConnsRef.current.forEach(conn => {
      try { conn.send({ type: 'chat', msg } satisfies DCPayload) } catch {}
    })
  }, [name])

  // ── WebRTC signaling helpers ───────────────────────────────────────────────
  function sendToPeer(to: string, payload: DCPayload) {
    const conn = dataConnsRef.current.get(to)
    if (conn?.open) {
      conn.send(payload)
    } else {
      // Try to open a new connection
      const p = peerRef.current
      if (!p) return
      const newConn = p.connect(to, { reliable: true })
      handleConn(newConn)
      newConn.on('open', () => newConn.send(payload))
    }
  }

  const emitOffer = useCallback((to: string, offer: RTCSessionDescriptionInit) => {
    sendToPeer(to, { type: 'offer', to, from: peerRef.current?.id ?? '', offer })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitAnswer = useCallback((to: string, answer: RTCSessionDescriptionInit) => {
    sendToPeer(to, { type: 'answer', to, from: peerRef.current?.id ?? '', answer })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const emitIceCandidate = useCallback((to: string, candidate: RTCIceCandidateInit) => {
    sendToPeer(to, { type: 'ice-candidate', to, from: peerRef.current?.id ?? '', candidate })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Register callbacks ────────────────────────────────────────────────────
  const onOffer       = useCallback((cb: (from: string, offer: RTCSessionDescriptionInit) => void) => {
    onOfferCbRef.current = cb
  }, [])
  const onAnswer      = useCallback((cb: (from: string, answer: RTCSessionDescriptionInit) => void) => {
    onAnswerCbRef.current = cb
  }, [])
  const onIceCandidate = useCallback((cb: (from: string, candidate: RTCIceCandidateInit) => void) => {
    onIceCbRef.current = cb
  }, [])
  const onUserJoined  = useCallback((cb: (user: { socketId: string; name: string }) => void) => {
    onUserJoinedCbRef.current = cb
  }, [])
  const onUserLeft    = useCallback((cb: (socketId: string) => void) => {
    onUserLeftCbRef.current = cb
  }, [])

  return {
    peer,
    myPeerId,
    messages,
    participants,
    isConnected,
    sendMessage,
    emitOffer,
    emitAnswer,
    emitIceCandidate,
    onOffer,
    onAnswer,
    onIceCandidate,
    onUserJoined,
    onUserLeft,
  }
}
