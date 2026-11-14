'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { joinRoom, Room } from 'trystero'
import { useWebRTC, RemoteStreamEntry } from './useWebRTC'
// webrtc.ts helpers (setMaxBitrate unused with Trystero — Trystero manages RTCPeerConnections internally)

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

interface PeerMeta {
  name:        string
  isMuted:     boolean
  isCameraOff: boolean
}

interface UseRoomReturn {
  localStream:        ReturnType<typeof useWebRTC>['localStream']
  screenStream:       ReturnType<typeof useWebRTC>['screenStream']
  remoteStreams:      RemoteStreamEntry[]
  isMuted:            boolean
  isCameraOff:        boolean
  isScreenSharing:    boolean
  messages:           ChatMessage[]
  participants:       Participant[]
  reactions:          ReactionItem[]
  isConnected:        boolean
  localName:          string
  toggleMic:          () => void
  toggleCamera:       () => void
  startScreenShare:   () => Promise<void>
  stopScreenShare:    () => void
  sendMessage:        (text: string) => void
  sendReaction:       (emoji: string) => void
  leaveRoom:          () => void
}

function getLocalName(): string {
  if (typeof window === 'undefined') return 'Guest'
  const stored = sessionStorage.getItem('webstreamer-name')
  if (stored) return stored
  const adj = ['Blue', 'Cyan', 'Sky', 'Nova', 'Arc', 'Flux']
  const noun = ['Wave', 'Stream', 'Pixel', 'Beam', 'Link', 'Node']
  const name = `${adj[Math.floor(Math.random() * adj.length)]} ${noun[Math.floor(Math.random() * noun.length)]}`
  sessionStorage.setItem('webstreamer-name', name)
  return name
}

export function useRoom(roomId: string): UseRoomReturn {
  const router = useRouter()
  const localName = getLocalName()
  const webrtc = useWebRTC()

  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [reactions, setReactions] = useState<ReactionItem[]>([])
  const [isConnected, setIsConnected] = useState(false)

  const roomRef = useRef<Room | null>(null)
  const sendChatRef = useRef<((data: ChatMessage) => Promise<void>) | null>(null)
  const sendReactionRef = useRef<((data: ReactionItem) => Promise<void>) | null>(null)
  const sendMetaRef = useRef<((data: PeerMeta) => Promise<void>) | null>(null)
  const metaMapRef = useRef<Map<string, PeerMeta>>(new Map())
  const audioContextRef = useRef<AudioContext | null>(null)
  const mixedAudioTrackRef = useRef<MediaStreamTrack | null>(null)
  const originalAudioTrackRef = useRef<MediaStreamTrack | null>(null)

  // ── Initialize Trystero Room ───────────────────────────────
  useEffect(() => {
    if (!roomId || typeof window === 'undefined') return

    // Clean roomId for topic
    const safeTopic = roomId.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32)
    const room = joinRoom({ appId: 'webstreamer-net' }, safeTopic)
    roomRef.current = room

    // Setup action channels (Trystero 0.27 returns MessageAction objects)
    const chatAction = room.makeAction<ChatMessage>('chat')
    const reactionAction = room.makeAction<ReactionItem>('reaction')
    const metaAction = room.makeAction<PeerMeta>('meta')

    sendChatRef.current = (data) => chatAction.send(data)
    sendReactionRef.current = (data) => reactionAction.send(data)
    sendMetaRef.current = (data) => metaAction.send(data)

    room.ready.then(() => {
      setIsConnected(true)
    }).catch(console.warn)

    // ── Incoming Chat Messages ──────────────────────────────
    chatAction.onMessage((msg) => {
      setMessages((prev) => [...prev, msg])
    })

    // ── Incoming Emoji Reactions ────────────────────────────
    reactionAction.onMessage((reaction) => {
      const item: ReactionItem = {
        ...reaction,
        id: Math.random().toString(36).slice(2),
        timestamp: Date.now(),
      }
      setReactions((prev) => [...prev, item])
      setTimeout(() => {
        setReactions((prev) => prev.filter((r) => r.id !== item.id))
      }, 4000)
    })

    // ── Incoming Peer Metadata (Name, Mute state, Camera) ──
    metaAction.onMessage((meta, context) => {
      const peerId = context?.peerId || ''
      if (!peerId) return
      metaMapRef.current.set(peerId, meta)

      setParticipants((prev) => {
        const existing = prev.find((p) => p.peerId === peerId)
        if (existing) {
          return prev.map((p) =>
            p.peerId === peerId
              ? { ...p, name: meta.name, isMuted: meta.isMuted, isCameraOff: meta.isCameraOff }
              : p
          )
        }
        return [
          ...prev,
          {
            peerId,
            name: meta.name,
            isMuted: meta.isMuted,
            isCameraOff: meta.isCameraOff,
            quality: 'good',
          },
        ]
      })

      // Update name in remote streams
      webrtc.remoteStreams.forEach((rs) => {
        if (rs.peerId === peerId) {
          rs.name = meta.name
        }
      })
    })

    // ── Peer Joined ─────────────────────────────────────────
    room.onPeerJoin((context) => {
      const peerId = context?.peerId || ''
      if (!peerId) return

      // Add to participants immediately so their card appears instantly
      setParticipants((prev) => {
        if (prev.find((p) => p.peerId === peerId)) return prev
        return [
          ...prev,
          {
            peerId,
            name: 'Friend',
            isMuted: false,
            isCameraOff: true,
            quality: 'good',
          },
        ]
      })

      // Announce our metadata to the new peer
      metaAction.send({
        name: localName,
        isMuted: webrtc.isMuted,
        isCameraOff: webrtc.isCameraOff,
      }).catch(console.warn)

      // If we have an active stream with tracks, share it
      const stream = webrtc.isScreenSharing && webrtc.screenStream ? webrtc.screenStream : webrtc.localStream
      if (stream && stream.getTracks().length > 0) {
        room.addStream(stream).catch(console.warn)
      }
    })

    // ── Peer Left ───────────────────────────────────────────
    room.onPeerLeave((context) => {
      const peerId = context?.peerId || ''
      if (!peerId) return
      metaMapRef.current.delete(peerId)
      setParticipants((prev) => prev.filter((p) => p.peerId !== peerId))
      webrtc.removeRemoteStream(peerId)
    })

    // ── Incoming Remote Stream ──────────────────────────────
    room.onPeerStream((stream: MediaStream, context) => {
      const peerId = context?.peerId || ''
      if (!peerId) return
      const meta = metaMapRef.current.get(peerId)
      const name = meta?.name || 'Friend'
      webrtc.addRemoteStream(peerId, stream, name)
    })

    return () => {
      room.leave().catch(() => {})
      roomRef.current = null
      setIsConnected(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, localName])

  // ── Share localStream once acquired (wait for room.ready first) ──
  useEffect(() => {
    const room = roomRef.current
    if (!room || !webrtc.localStream) return
    const stream = webrtc.localStream
    if (stream.getTracks().length === 0) return
    // Always wait for ready — idempotent if already resolved
    room.ready.then(() => {
      room.addStream(stream).catch(() => {})
    }).catch(() => {})
  }, [webrtc.localStream])

  // ── Broadcast Mute / Camera Changes ────────────────────────
  useEffect(() => {
    if (sendMetaRef.current) {
      sendMetaRef.current({
        name: localName,
        isMuted: webrtc.isMuted,
        isCameraOff: webrtc.isCameraOff,
      }).catch(() => {})
    }
  }, [webrtc.isMuted, webrtc.isCameraOff, localName])

  // ── Screen Share with Audio Mixing & Anti-Lag ─────────────
  const stopScreenShare = useCallback(() => {
    const screen = webrtc.screenStream
    const localVideoTrack = webrtc.localStream?.getVideoTracks()[0]

    webrtc.stopScreenShare()

    if (roomRef.current) {
      // 1. Restore video track to camera
      if (screen && localVideoTrack) {
        const screenTrack = screen.getVideoTracks()[0]
        if (screenTrack) {
          roomRef.current.replaceTrack(screenTrack, localVideoTrack).catch(console.warn)
        }
      } else if (screen) {
        roomRef.current.removeStream(screen)
      }

      // 2. Restore audio track to microphone
      if (mixedAudioTrackRef.current && originalAudioTrackRef.current) {
        roomRef.current.replaceTrack(mixedAudioTrackRef.current, originalAudioTrackRef.current).catch(console.warn)
      }
    }

    // Clean up Web Audio mixer
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    mixedAudioTrackRef.current = null
    originalAudioTrackRef.current = null
  }, [webrtc])

  const startScreenShare = useCallback(async () => {
    const screen = await webrtc.startScreenShare(() => {
      // Handles native browser "Stop sharing" bar click
      stopScreenShare()
    })
    if (!screen || !roomRef.current) return

    const screenVideoTrack = screen.getVideoTracks()[0]
    const screenAudioTrack = screen.getAudioTracks()[0]
    const localVideoTrack = webrtc.localStream?.getVideoTracks()[0]
    const localAudioTrack = webrtc.localStream?.getAudioTracks()[0]

    // ── 1. Video track handling ──
    if (localVideoTrack && screenVideoTrack) {
      roomRef.current.replaceTrack(localVideoTrack, screenVideoTrack).catch(() => {
        roomRef.current?.addStream(screen).catch(console.warn)
      })
    } else {
      roomRef.current.addStream(screen).catch(console.warn)
    }

    // ── 2. Screen audio transfer & mixing ──
    if (screenAudioTrack) {
      if (localAudioTrack) {
        try {
          // Mix microphone audio + screen audio together so viewers hear both!
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext
          const audioCtx = new AudioContextClass()
          const dest = audioCtx.createMediaStreamDestination()

          const micSource = audioCtx.createMediaStreamSource(new MediaStream([localAudioTrack]))
          const screenSource = audioCtx.createMediaStreamSource(new MediaStream([screenAudioTrack]))

          micSource.connect(dest)
          screenSource.connect(dest)

          const mixedTrack = dest.stream.getAudioTracks()[0]
          if (mixedTrack) {
            audioContextRef.current = audioCtx
            mixedAudioTrackRef.current = mixedTrack
            originalAudioTrackRef.current = localAudioTrack

            roomRef.current.replaceTrack(localAudioTrack, mixedTrack).catch(console.warn)
          }
        } catch (err) {
          console.warn('[useRoom] Web Audio mixing failed, sending screen audio directly:', err)
          roomRef.current.replaceTrack(localAudioTrack, screenAudioTrack).catch(console.warn)
        }
      } else {
        // No microphone track yet, send screen audio directly via stream
        roomRef.current.addStream(screen).catch(console.warn)
      }
    }
  }, [webrtc, stopScreenShare])

  // ── Send Chat Message ─────────────────────────────────────
  const sendMessage = useCallback((text: string) => {
    const msg: ChatMessage = { name: localName, text, timestamp: Date.now() }
    setMessages((prev) => [...prev, msg])
    sendChatRef.current?.(msg).catch(console.warn)
  }, [localName])

  // ── Send Emoji Reaction ───────────────────────────────────
  const sendReaction = useCallback((emoji: string) => {
    const item: ReactionItem = {
      id: Math.random().toString(36).slice(2),
      from: 'local',
      name: localName,
      emoji,
      timestamp: Date.now(),
    }
    setReactions((prev) => [...prev, item])
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== item.id))
    }, 4000)
    sendReactionRef.current?.(item).catch(console.warn)
  }, [localName])

  // ── Leave Room ────────────────────────────────────────────
  const leaveRoom = useCallback(() => {
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {})
      audioContextRef.current = null
    }
    roomRef.current?.leave().catch(() => {})
    webrtc.localStream?.getTracks().forEach((t) => t.stop())
    webrtc.screenStream?.getTracks().forEach((t) => t.stop())
    router.push('/')
  }, [webrtc.localStream, webrtc.screenStream, router])

  return {
    localStream:      webrtc.localStream,
    screenStream:     webrtc.screenStream,
    remoteStreams:    webrtc.remoteStreams,
    isMuted:          webrtc.isMuted,
    isCameraOff:      webrtc.isCameraOff,
    isScreenSharing:  webrtc.isScreenSharing,
    messages,
    participants,
    reactions,
    isConnected,
    localName,
    toggleMic:        webrtc.toggleMic,
    toggleCamera:     webrtc.toggleCamera,
    startScreenShare,
    stopScreenShare,
    sendMessage,
    sendReaction,
    leaveRoom,
  }
}
