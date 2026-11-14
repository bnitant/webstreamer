import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useWebRTC, RemoteStreamEntry } from './useWebRTC'
import { useSocket, ChatMessage, Participant } from './useSocket'
import { RTC_CONFIG, setMaxBitrate, CAMERA_BITRATE, SCREEN_SHARE_BITRATE } from '../webrtc'

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
  const socket = useSocket(roomId, localName)

  // Map of peerId -> RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const makingOffer = useRef<Set<string>>(new Set())

  // ── Create / get RTCPeerConnection ────────────────────────
  const getOrCreatePC = useCallback((peerId: string): RTCPeerConnection => {
    if (pcsRef.current.has(peerId)) return pcsRef.current.get(peerId)!

    const pc = new RTCPeerConnection(RTC_CONFIG)

    // Add local tracks
    const activeStream = webrtc.isScreenSharing && webrtc.screenStream ? webrtc.screenStream : webrtc.localStream
    const audioTracks = activeStream ? activeStream.getAudioTracks() : []
    const videoTracks = activeStream ? activeStream.getVideoTracks() : []

    if (audioTracks.length > 0) {
      audioTracks.forEach((track) => pc.addTrack(track, activeStream!))
    } else {
      // Ensure we can receive remote audio even if user has no microphone
      try { pc.addTransceiver('audio', { direction: 'recvonly' }) } catch {}
    }

    if (videoTracks.length > 0) {
      videoTracks.forEach((track) => {
        const sender = pc.addTrack(track, activeStream!)
        setMaxBitrate(sender, webrtc.isScreenSharing ? SCREEN_SHARE_BITRATE : CAMERA_BITRATE)
      })
    } else {
      // Ensure we can receive remote video even if user has no camera
      try { pc.addTransceiver('video', { direction: 'recvonly' }) } catch {}
    }

    // Always create a data channel to guarantee active data exchange and valid SDP sections
    try {
      pc.createDataChannel('data')
    } catch {}

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
      if (makingOffer.current.has(socketId)) return
      makingOffer.current.add(socketId)

      try {
        const pc = getOrCreatePC(socketId)
        const offer = await pc.createOffer({
          offerToReceiveAudio: true,
          offerToReceiveVideo: true,
        })
        await pc.setLocalDescription(offer)
        socket.emitOffer(socketId, pc.localDescription!)
      } catch (err) {
        console.warn('[useRoom] createOffer error:', err)
      } finally {
        makingOffer.current.delete(socketId)
      }
    })
  }, [socket.onUserJoined, getOrCreatePC, socket])

  // ── Signaling: receive offer → answer ────────────────────
  useEffect(() => {
    socket.onOffer(async (from, offer) => {
      try {
        const pc = getOrCreatePC(from)
        await pc.setRemoteDescription(new RTCSessionDescription(offer))
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        socket.emitAnswer(from, pc.localDescription!)
      } catch (err) {
        console.warn('[useRoom] handle offer error:', err)
      }
    })
  }, [socket.onOffer, getOrCreatePC, socket])

  // ── Signaling: receive answer ─────────────────────────────
  useEffect(() => {
    socket.onAnswer(async (from, answer) => {
      const pc = pcsRef.current.get(from)
      if (!pc) return
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer))
      } catch (err) {
        console.warn('[useRoom] handle answer error:', err)
      }
    })
  }, [socket.onAnswer])

  // ── Signaling: ICE candidates ─────────────────────────────
  useEffect(() => {
    socket.onIceCandidate(async (from, candidate) => {
      const pc = pcsRef.current.get(from)
      if (!pc) return
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
      } catch (err) {
        // Can safely ignore candidate errors during transition
      }
    })
  }, [socket.onIceCandidate])

  // ── User left ─────────────────────────────────────────────
  useEffect(() => {
    socket.onUserLeft((socketId) => {
      const pc = pcsRef.current.get(socketId)
      if (pc) {
        pc.close()
        pcsRef.current.delete(socketId)
      }
      webrtc.removeRemoteStream(socketId)
    })
  }, [socket.onUserLeft, webrtc])

  // ── Cleanup on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      pcsRef.current.forEach((pc) => pc.close())
      pcsRef.current.clear()
    }
  }, [])

  // ── Screen share with anti-lag track broadcasting ──────────
  const startScreenShare = useCallback(async () => {
    await webrtc.startScreenShare((screenTrack) => {
      // Replace video track in all active peer connections
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender) {
          sender.replaceTrack(screenTrack).then(() => {
            setMaxBitrate(sender, SCREEN_SHARE_BITRATE)
          }).catch(console.warn)
        }
      })
    })
  }, [webrtc])

  const stopScreenShare = useCallback(() => {
    webrtc.stopScreenShare((cameraTrack) => {
      pcsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack).then(() => {
            setMaxBitrate(sender, CAMERA_BITRATE)
          }).catch(console.warn)
        }
      })
    })
  }, [webrtc])

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
    startScreenShare,
    stopScreenShare,
    sendMessage:      socket.sendMessage,
    leaveRoom,
  }
}
