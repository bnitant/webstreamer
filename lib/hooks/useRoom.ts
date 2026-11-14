import { useEffect, useRef, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useWebRTC, RemoteStreamEntry } from './useWebRTC'
import { useSocket, ChatMessage, Participant } from './useSocket'
import { RTC_CONFIG, setMaxBitrate, CAMERA_BITRATE } from '../webrtc'

interface UseRoomReturn {
  localStream:        ReturnType<typeof useWebRTC>['localStream']
  screenStream:       ReturnType<typeof useWebRTC>['screenStream']
  remoteStreams:      RemoteStreamEntry[]
  isMuted:            boolean
  isCameraOff:        boolean
  isScreenSharing:    boolean
  messages:           ChatMessage[]
  participants:       Participant[]
  isConnected:        boolean
  localName:          string
  toggleMic:          () => void
  toggleCamera:       () => void
  startScreenShare:   () => Promise<void>
  stopScreenShare:    () => void
  sendMessage:        (text: string) => void
  leaveRoom:          () => void
}

function getLocalName(): string {
  if (typeof window === 'undefined') return 'Guest'
  const stored = sessionStorage.getItem('webstreamer-name')
  if (stored) return stored
  const adj = ['Blue','Cyan','Sky','Nova','Arc','Flux']
  const noun= ['Wave','Stream','Pixel','Beam','Link','Node']
  const name = `${adj[Math.floor(Math.random()*adj.length)]} ${noun[Math.floor(Math.random()*noun.length)]}`
  sessionStorage.setItem('webstreamer-name', name)
  return name
}

export function useRoom(roomId: string): UseRoomReturn {
  const router = useRouter()
  const localName = getLocalName()

  const webrtc  = useWebRTC()
  const socket  = useSocket(roomId, localName)

  // Map of peerId -> RTCPeerConnection
  const pcsRef  = useRef<Map<string, RTCPeerConnection>>(new Map())
  const makingOffer = useRef<Set<string>>(new Set())

  // ── Create / get RTCPeerConnection ────────────────────────
  const getOrCreatePC = useCallback((peerId: string): RTCPeerConnection => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)!

    const pc = new RTCPeerConnection(RTC_CONFIG)

    // Add local tracks
    if (webrtc.localStream) {
      webrtc.localStream.getTracks().forEach((track) => {
        const sender = pc.addTrack(track, webrtc.localStream!)
        // Set camera bitrate
        if (track.kind === 'video') {
          setMaxBitrate(sender, CAMERA_BITRATE)
        }
      })
    }

    // Handle incoming remote tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams
      if (remoteStream) {
        webrtc.addRemoteStream(peerId, remoteStream, '')
      }
    }

    // ICE candidate forwarding
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emitIceCandidate(peerId, event.candidate.toJSON())
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        webrtc.removeRemoteStream(peerId)
        pcsRef.current.delete(peerId)
      }
    }

    pcsRef.current.set(peerId, pc)
    return pc
  }, [webrtc, socket])

  // ── Signaling: user joined → create offer ─────────────────
  useEffect(() => {
    socket.onUserJoined(async ({ socketId }) => {
      const pc = getOrCreatePC(socketId)
      makingOffer.current.add(socketId)
      try {
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        socket.emitOffer(socketId, pc.localDescription!)
      } catch (err) {
        console.error('[useRoom] createOffer failed:', err)
      } finally {
        makingOffer.current.delete(socketId)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.onUserJoined, getOrCreatePC])

  // ── Signaling: receive offer → answer ────────────────────
  useEffect(() => {
    socket.onOffer(async (from, offer) => {
      const pc = getOrCreatePC(from)
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emitAnswer(from, pc.localDescription!)
      } catch (err) {
        console.error('[useRoom] handle offer failed:', err)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.onOffer, getOrCreatePC])

  // ── Signaling: receive answer ─────────────────────────────
  useEffect(() => {
    socket.onAnswer(async (from, answer) => {
      const pc = pcsRef.current.get(from)
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (err) {
        console.error('[useRoom] handle answer failed:', err)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.onAnswer])

  // ── Signaling: ICE candidates ─────────────────────────────
  useEffect(() => {
    socket.onIceCandidate(async (from, candidate) => {
      const pc = pcsRef.current.get(from)
      if (!pc) return
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        console.warn('[useRoom] addIceCandidate failed:', err)
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.onIceCandidate])

  // ── User left ─────────────────────────────────────────────
  useEffect(() => {
    socket.onUserLeft((socketId) => {
      const pc = pcsRef.current.get(socketId)
      if (pc) { pc.close(); pcsRef.current.delete(socketId) }
      webrtc.removeRemoteStream(socketId)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket.onUserLeft, webrtc.removeRemoteStream])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      pcsRef.current.forEach((pc) => pc.close())
      pcsRef.current.clear()
    }
  }, [])

  const leaveRoom = useCallback(() => {
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
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
    messages:         socket.messages,
    participants:     socket.participants,
    isConnected:      socket.isConnected,
    localName,
    toggleMic:        webrtc.toggleMic,
    toggleCamera:     webrtc.toggleCamera,
    startScreenShare: webrtc.startScreenShare,
    stopScreenShare:  webrtc.stopScreenShare,
    sendMessage:      socket.sendMessage,
    leaveRoom,
  }
}
