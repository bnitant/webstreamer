import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getCameraConstraints,
  getScreenShareConstraints,
  setMaxBitrate,
  SCREEN_SHARE_BITRATE,
} from '../webrtc'

export interface RemoteStreamEntry {
  peerId: string
  stream: MediaStream
  name:   string
}

interface UseWebRTCReturn {
  localStream:        MediaStream | null
  screenStream:       MediaStream | null
  remoteStreams:      RemoteStreamEntry[]
  isMuted:            boolean
  isCameraOff:        boolean
  isScreenSharing:    boolean
  toggleMic:          () => void
  toggleCamera:       () => void
  startScreenShare:   () => Promise<void>
  stopScreenShare:    () => void
  addRemoteStream:    (peerId: string, stream: MediaStream, name: string) => void
  removeRemoteStream: (peerId: string) => void
  replaceTrackInPeers:(track: MediaStreamTrack, oldTrack: MediaStreamTrack | null) => void
}

export function useWebRTC(): UseWebRTCReturn {
  const [localStream,     setLocalStream]     = useState<MediaStream | null>(null)
  const [screenStream,    setScreenStream]    = useState<MediaStream | null>(null)
  const [remoteStreams,   setRemoteStreams]    = useState<RemoteStreamEntry[]>([])
  const [isMuted,         setIsMuted]         = useState(false)
  const [isCameraOff,     setIsCameraOff]     = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // Ref for peer connections (managed externally via useRoom)
  const peerConnectionsRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  // ── Acquire local media on mount ─────────────────────────
  useEffect(() => {
    let stream: MediaStream | null = null

    async function init() {
      try {
        stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints())
        setLocalStream(stream)
      } catch (err) {
        console.warn('[useWebRTC] Could not get user media:', err)
        // Try audio-only fallback
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true })
          setLocalStream(stream)
          setIsCameraOff(true)
        } catch {
          console.error('[useWebRTC] No media available — joining without camera/mic.')
          // Set an empty stream so components don't crash on null
          setLocalStream(new MediaStream())
          setIsCameraOff(true)
          setIsMuted(true)
        }
      }
    }

    init()

    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ── Mic toggle ───────────────────────────────────────────
  const toggleMic = useCallback(() => {
    if (!localStream) return
    localStream.getAudioTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
    setIsMuted((m) => !m)
  }, [localStream])

  // ── Camera toggle ────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStream) return
    localStream.getVideoTracks().forEach((t) => {
      t.enabled = !t.enabled
    })
    setIsCameraOff((c) => !c)
  }, [localStream])

  // ── Screen share ─────────────────────────────────────────
  const startScreenShare = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(
        getScreenShareConstraints(),
      )
      setScreenStream(stream)
      setIsScreenSharing(true)

      // Replace video track in all peer connections
      const screenVideoTrack = stream.getVideoTracks()[0]
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && screenVideoTrack) {
          sender.replaceTrack(screenVideoTrack).then(() => {
            setMaxBitrate(sender, SCREEN_SHARE_BITRATE)
          })
        }
      })

      // Auto-stop when user clicks browser "Stop sharing"
      screenVideoTrack.addEventListener('ended', () => {
        stopScreenShare()
      })
    } catch (err) {
      console.warn('[useWebRTC] Screen share cancelled or failed:', err)
    }
  }, [])

  const stopScreenShare = useCallback(() => {
    if (!screenStream) return
    screenStream.getTracks().forEach((t) => t.stop())
    setScreenStream(null)
    setIsScreenSharing(false)

    // Restore camera track in peer connections
    if (localStream) {
      const cameraTrack = localStream.getVideoTracks()[0]
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track?.kind === 'video')
        if (sender && cameraTrack) {
          sender.replaceTrack(cameraTrack)
        }
      })
    }
  }, [screenStream, localStream])

  // ── Remote stream management ──────────────────────────────
  const addRemoteStream = useCallback((peerId: string, stream: MediaStream, name: string) => {
    setRemoteStreams((prev) => {
      const existing = prev.find((e) => e.peerId === peerId)
      if (existing) return prev.map((e) => e.peerId === peerId ? { peerId, stream, name } : e)
      return [...prev, { peerId, stream, name }]
    })
  }, [])

  const removeRemoteStream = useCallback((peerId: string) => {
    setRemoteStreams((prev) => prev.filter((e) => e.peerId !== peerId))
  }, [])

  const replaceTrackInPeers = useCallback(
    (track: MediaStreamTrack, oldTrack: MediaStreamTrack | null) => {
      peerConnectionsRef.current.forEach((pc) => {
        const sender = pc.getSenders().find((s) => s.track === oldTrack)
        if (sender) sender.replaceTrack(track)
      })
    },
    [],
  )

  return {
    localStream,
    screenStream,
    remoteStreams,
    isMuted,
    isCameraOff,
    isScreenSharing,
    toggleMic,
    toggleCamera,
    startScreenShare,
    stopScreenShare,
    addRemoteStream,
    removeRemoteStream,
    replaceTrackInPeers,
  }
}
