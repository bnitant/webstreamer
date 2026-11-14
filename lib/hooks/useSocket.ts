import { useState, useEffect, useRef, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface ChatMessage {
  name:      string
  text:      string
  timestamp: number
}

export interface Participant {
  peerId:     string
  name:       string
  isMuted:    boolean
  isCameraOff:boolean
  quality:    'good' | 'fair' | 'poor'
}

interface UseSocketReturn {
  socket:      Socket | null
  messages:    ChatMessage[]
  participants:Participant[]
  isConnected: boolean
  sendMessage: (text: string) => void
  emitOffer:   (to: string, offer: RTCSessionDescriptionInit) => void
  emitAnswer:  (to: string, answer: RTCSessionDescriptionInit) => void
  emitIceCandidate: (to: string, candidate: RTCIceCandidateInit) => void
  onOffer:     (cb: (from: string, offer: RTCSessionDescriptionInit) => void) => void
  onAnswer:    (cb: (from: string, answer: RTCSessionDescriptionInit) => void) => void
  onIceCandidate:(cb: (from: string, candidate: RTCIceCandidateInit) => void) => void
  onUserJoined:(cb: (user: { socketId: string; name: string }) => void) => void
  onUserLeft:  (cb: (socketId: string) => void) => void
}

export function useSocket(roomId: string, name: string): UseSocketReturn {
  const [socket,       setSocket]       = useState<Socket | null>(null)
  const [messages,     setMessages]     = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [isConnected,  setIsConnected]  = useState(false)

  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!roomId || !name) return

    // Initialise Socket.io connection
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || ''
    const s = io(socketUrl, {
      path:               '/api/socket',
      transports:         ['polling', 'websocket'],
      reconnectionAttempts: 5,
      reconnectionDelay:  1000,
    })

    socketRef.current = s
    setSocket(s)

    s.on('connect', () => {
      setIsConnected(true)
      s.emit('join-room', { roomId, name })
    })

    s.on('disconnect', () => {
      setIsConnected(false)
    })

    s.on('chat-message', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
    })

    s.on('room-users', (users: Participant[]) => {
      setParticipants(users.filter((u) => u.peerId !== s.id))
    })

    s.on('user-joined', (user: { socketId: string; name: string }) => {
      setParticipants((prev) => {
        if (prev.find((p) => p.peerId === user.socketId)) return prev
        return [
          ...prev,
          { peerId: user.socketId, name: user.name, isMuted: false, isCameraOff: false, quality: 'good' },
        ]
      })
    })

    s.on('user-left', (socketId: string) => {
      setParticipants((prev) => prev.filter((p) => p.peerId !== socketId))
    })

    return () => {
      s.emit('leave-room', { roomId })
      s.disconnect()
      socketRef.current = null
    }
  }, [roomId, name])

  const sendMessage = useCallback((text: string) => {
    if (!socketRef.current) return
    const msg: ChatMessage = { name, text, timestamp: Date.now() }
    socketRef.current.emit('chat-message', { roomId, ...msg })
    setMessages((prev) => [...prev, msg])
  }, [name, roomId])

  const emitOffer = useCallback((to: string, offer: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('offer', { to, offer })
  }, [])

  const emitAnswer = useCallback((to: string, answer: RTCSessionDescriptionInit) => {
    socketRef.current?.emit('answer', { to, answer })
  }, [])

  const emitIceCandidate = useCallback((to: string, candidate: RTCIceCandidateInit) => {
    socketRef.current?.emit('ice-candidate', { to, candidate })
  }, [])

  const onOffer = useCallback((cb: (from: string, offer: RTCSessionDescriptionInit) => void) => {
    socketRef.current?.on('offer', ({ from, offer }: { from: string; offer: RTCSessionDescriptionInit }) => cb(from, offer))
  }, [])

  const onAnswer = useCallback((cb: (from: string, answer: RTCSessionDescriptionInit) => void) => {
    socketRef.current?.on('answer', ({ from, answer }: { from: string; answer: RTCSessionDescriptionInit }) => cb(from, answer))
  }, [])

  const onIceCandidate = useCallback((cb: (from: string, candidate: RTCIceCandidateInit) => void) => {
    socketRef.current?.on('ice-candidate', ({ from, candidate }: { from: string; candidate: RTCIceCandidateInit }) => cb(from, candidate))
  }, [])

  const onUserJoined = useCallback((cb: (user: { socketId: string; name: string }) => void) => {
    socketRef.current?.on('user-joined', cb)
  }, [])

  const onUserLeft = useCallback((cb: (socketId: string) => void) => {
    socketRef.current?.on('user-left', cb)
  }, [])

  return {
    socket,
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
