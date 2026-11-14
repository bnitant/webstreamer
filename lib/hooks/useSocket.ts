'use client'

/**
 * useSocket — Serverless Real-time Signaling, Chat & Reactions
 *
 * Uses public SSE pub/sub (ntfy.sh) for WebRTC offer/answer/ICE exchange,
 * presence discovery, live chat, and emoji reactions.
 */

import { useState, useEffect, useRef, useCallback } from 'react'

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

export interface ReactionItem {
  id:        string
  from:      string
  name:      string
  emoji:     string
  timestamp: number
}

type SignalMessage =
  | { type: 'join';           from: string; name: string }
  | { type: 'present';        from: string; to: string; name: string }
  | { type: 'leave';          from: string }
  | { type: 'offer';          from: string; to: string; offer: RTCSessionDescriptionInit }
  | { type: 'answer';         from: string; to: string; answer: RTCSessionDescriptionInit }
  | { type: 'ice-candidate';  from: string; to: string; candidate: RTCIceCandidateInit }
  | { type: 'chat';           from: string; msg: ChatMessage }
  | { type: 'reaction';       from: string; name: string; emoji: string }

interface UseSocketReturn {
  myId:             string
  messages:         ChatMessage[]
  participants:     Participant[]
  reactions:        ReactionItem[]
  isConnected:      boolean
  sendMessage:      (text: string) => void
  sendReaction:     (emoji: string) => void
  emitOffer:        (to: string, offer: RTCSessionDescriptionInit) => void
  emitAnswer:       (to: string, answer: RTCSessionDescriptionInit) => void
  emitIceCandidate: (to: string, candidate: RTCIceCandidateInit) => void
  onOffer:          (cb: (from: string, offer: RTCSessionDescriptionInit) => void) => void
  onAnswer:         (cb: (from: string, answer: RTCSessionDescriptionInit) => void) => void
  onIceCandidate:   (cb: (from: string, candidate: RTCIceCandidateInit) => void) => void
  onUserJoined:     (cb: (user: { socketId: string; name: string }) => void) => void
  onUserLeft:       (cb: (socketId: string) => void) => void
}

function cleanRoomTopic(roomId: string): string {
  // Safe topic name containing only alphanumeric + hyphens
  const safe = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32)
  return `ws_room_${safe}`
}

export function useSocket(roomId: string, name: string): UseSocketReturn {
  // Generate a fresh unique peer ID for this tab session
  const [myId] = useState(() => 'u_' + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3))
  const [messages,     setMessages]     = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [reactions,    setReactions]    = useState<ReactionItem[]>([])
  const [isConnected,  setIsConnected]  = useState(false)

  // Callback refs to avoid stale closures
  const onOfferCbRef        = useRef<((from: string, offer: RTCSessionDescriptionInit) => void) | null>(null)
  const onAnswerCbRef       = useRef<((from: string, answer: RTCSessionDescriptionInit) => void) | null>(null)
  const onIceCbRef          = useRef<((from: string, candidate: RTCIceCandidateInit) => void) | null>(null)
  const onUserJoinedCbRef   = useRef<((user: { socketId: string; name: string }) => void) | null>(null)
  const onUserLeftCbRef     = useRef<((socketId: string) => void) | null>(null)

  const topic = cleanRoomTopic(roomId)
  const endpoint = `https://ntfy.sh/${topic}`

  // Broadcast helper
  const postSignal = useCallback(async (msg: SignalMessage) => {
    try {
      await fetch(endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(msg),
      })
    } catch (err) {
      console.warn('[useSocket] publish failed:', err)
    }
  }, [endpoint])

  // ── Listen for room signals via EventSource (SSE) ─────────
  useEffect(() => {
    if (!roomId || !name) return

    let eventSource: EventSource | null = null
    let pingInterval: NodeJS.Timeout | null = null

    try {
      eventSource = new EventSource(`${endpoint}/sse`)

      eventSource.onopen = () => {
        setIsConnected(true)
        // Announce our presence to anyone in the room
        postSignal({ type: 'join', from: myId, name })
      }

      eventSource.onerror = () => {
        // SSE automatically reconnects
        setIsConnected(false)
      }

      eventSource.onmessage = (event) => {
        try {
          const raw = JSON.parse(event.data)
          if (raw.event !== 'message' || !raw.message) return
          const data: SignalMessage = JSON.parse(raw.message)

          // Ignore messages from self
          if (data.from === myId) return

          switch (data.type) {
            case 'join': {
              setParticipants((prev) => {
                if (prev.find((p) => p.peerId === data.from)) return prev
                return [...prev, { peerId: data.from, name: data.name, isMuted: false, isCameraOff: false, quality: 'good' }]
              })
              // Acknowledge our presence so the new joiner knows we are already here
              postSignal({ type: 'present', from: myId, to: data.from, name })
              onUserJoinedCbRef.current?.({ socketId: data.from, name: data.name })
              break
            }

            case 'present': {
              if (data.to === myId) {
                // Existing peer replied to our join
                setParticipants((prev) => {
                  if (prev.find((p) => p.peerId === data.from)) return prev
                  return [...prev, { peerId: data.from, name: data.name, isMuted: false, isCameraOff: false, quality: 'good' }]
                })
                onUserJoinedCbRef.current?.({ socketId: data.from, name: data.name })
              }
              break
            }

            case 'offer': {
              if (data.to === myId) {
                onOfferCbRef.current?.(data.from, data.offer)
              }
              break
            }

            case 'answer': {
              if (data.to === myId) {
                onAnswerCbRef.current?.(data.from, data.answer)
              }
              break
            }

            case 'ice-candidate': {
              if (data.to === myId) {
                onIceCbRef.current?.(data.from, data.candidate)
              }
              break
            }

            case 'chat': {
              setMessages((prev) => [...prev, data.msg])
              break
            }

            case 'reaction': {
              const item: ReactionItem = {
                id: Math.random().toString(36).slice(2),
                from: data.from,
                name: data.name,
                emoji: data.emoji,
                timestamp: Date.now(),
              }
              setReactions((prev) => [...prev, item])
              setTimeout(() => {
                setReactions((prev) => prev.filter((r) => r.id !== item.id))
              }, 4000)
              break
            }

            case 'leave': {
              setParticipants((prev) => prev.filter((p) => p.peerId !== data.from))
              onUserLeftCbRef.current?.(data.from)
              break
            }
          }
        } catch {
          // Keepalive or parse error
        }
      }

      // Re-announce presence periodically (every 15s) in case a peer joined
      pingInterval = setInterval(() => {
        postSignal({ type: 'present', from: myId, to: '*', name })
      }, 15000)
    } catch (err) {
      console.warn('[useSocket] EventSource error:', err)
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval)
      if (eventSource) {
        eventSource.close()
      }
      postSignal({ type: 'leave', from: myId })
      setIsConnected(false)
    }
  }, [roomId, name, myId, endpoint, postSignal])

  // ── Outgoing action handlers ──────────────────────────────
  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = { name, text, timestamp: Date.now() }
    setMessages((prev) => [...prev, msg])
    postSignal({ type: 'chat', from: myId, msg })
  }, [name, myId, postSignal])

  const sendReaction = useCallback((emoji: string) => {
    const item: ReactionItem = {
      id: Math.random().toString(36).slice(2),
      from: myId,
      name,
      emoji,
      timestamp: Date.now(),
    }
    setReactions((prev) => [...prev, item])
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== item.id))
    }, 4000)
    postSignal({ type: 'reaction', from: myId, name, emoji })
  }, [name, myId, postSignal])

  const emitOffer = useCallback((to: string, offer: RTCSessionDescriptionInit) => {
    postSignal({ type: 'offer', from: myId, to, offer })
  }, [myId, postSignal])

  const emitAnswer = useCallback((to: string, answer: RTCSessionDescriptionInit) => {
    postSignal({ type: 'answer', from: myId, to, answer })
  }, [myId, postSignal])

  const emitIceCandidate = useCallback((to: string, candidate: RTCIceCandidateInit) => {
    postSignal({ type: 'ice-candidate', from: myId, to, candidate })
  }, [myId, postSignal])

  const onOffer = useCallback((cb: (from: string, offer: RTCSessionDescriptionInit) => void) => {
    onOfferCbRef.current = cb
  }, [])

  const onAnswer = useCallback((cb: (from: string, answer: RTCSessionDescriptionInit) => void) => {
    onAnswerCbRef.current = cb
  }, [])

  const onIceCandidate = useCallback((cb: (from: string, candidate: RTCIceCandidateInit) => void) => {
    onIceCbRef.current = cb
  }, [])

  const onUserJoined = useCallback((cb: (user: { socketId: string; name: string }) => void) => {
    onUserJoinedCbRef.current = cb
  }, [])

  const onUserLeft = useCallback((cb: (socketId: string) => void) => {
    onUserLeftCbRef.current = cb
  }, [])

  return {
    myId,
    messages,
    participants,
    reactions,
    isConnected,
    sendMessage,
    sendReaction,
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
