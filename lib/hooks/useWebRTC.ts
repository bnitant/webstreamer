'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  getCameraConstraints,
  getScreenShareConstraints,
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
  startScreenShare:   (onEnded?: () => void) => Promise<MediaStream | null>
  stopScreenShare:    (onRestoreCamera?: (track: MediaStreamTrack | null) => void) => void
  addRemoteStream:    (peerId: string, stream: MediaStream, name: string) => void
  removeRemoteStream: (peerId: string) => void
}

export function useWebRTC(): UseWebRTCReturn {
  const [localStream,     setLocalStream]     = useState<MediaStream | null>(null)
  const [screenStream,    setScreenStream]    = useState<MediaStream | null>(null)
  const [remoteStreams,   setRemoteStreams]   = useState<RemoteStreamEntry[]>([])
  const [isMuted,         setIsMuted]         = useState(false)
  const [isCameraOff,     setIsCameraOff]     = useState(false)
  const [isScreenSharing, setIsScreenSharing] = useState(false)

  // ── Acquire local media on mount ─────────────────────────
  useEffect(() => {
    let activeStream: MediaStream | null = null

    async function init() {
      try {
        activeStream = await navigator.mediaDevices.getUserMedia(getCameraConstraints())
        setLocalStream(activeStream)
      } catch {
        // Try audio-only fallback if camera is unavailable
        try {
          activeStream = await navigator.mediaDevices.getUserMedia({ audio: true })
          setLocalStream(activeStream)
          setIsCameraOff(true)
        } catch {
          // If neither camera nor microphone is detected, join gracefully
          console.info('[useWebRTC] No camera or microphone found. Joined in listen/screen-share mode.')
          const empty = new MediaStream()
          setLocalStream(empty)
          setIsCameraOff(true)
          setIsMuted(true)
        }
      }
    }

    init()

    return () => {
      activeStream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // ── Mic toggle ───────────────────────────────────────────
  const toggleMic = useCallback(async () => {
    if (!localStream) return
    const audioTracks = localStream.getAudioTracks()

    // If no audio track exists yet (e.g. initial access was not granted or failed), acquire it now
    if (audioTracks.length === 0) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        })
        const newTrack = stream.getAudioTracks()[0]
        if (newTrack) {
          localStream.addTrack(newTrack)
          setLocalStream(new MediaStream(localStream.getTracks()))
          setIsMuted(false)
        }
      } catch (err) {
        console.warn('[useWebRTC] Failed to acquire microphone on toggle:', err)
      }
      return
    }

    const willMute = !isMuted
    audioTracks.forEach((t) => {
      t.enabled = !willMute
    })
    setIsMuted(willMute)
  }, [localStream, isMuted])

  // ── Camera toggle ────────────────────────────────────────
  const toggleCamera = useCallback(async () => {
    if (!localStream) return
    const videoTracks = localStream.getVideoTracks()

    // If no video track exists yet, acquire it now on user gesture
    if (videoTracks.length === 0) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(getCameraConstraints())
        const newTrack = stream.getVideoTracks()[0]
        if (newTrack) {
          localStream.addTrack(newTrack)
          setLocalStream(new MediaStream(localStream.getTracks()))
          setIsCameraOff(false)
        }
      } catch (err) {
        console.warn('[useWebRTC] Failed to acquire camera on toggle:', err)
      }
      return
    }

    const willTurnOff = !isCameraOff
    videoTracks.forEach((t) => {
      t.enabled = !willTurnOff
    })
    setIsCameraOff(willTurnOff)
  }, [localStream, isCameraOff])

  // ── Screen share with audio support ─────────────────────
  const startScreenShare = useCallback(async (onEnded?: () => void): Promise<MediaStream | null> => {
    try {
      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getDisplayMedia(
          getScreenShareConstraints(),
        )
      } catch (err: any) {
        if (err?.name === 'NotAllowedError' || err?.name === 'AbortError') {
          return null
        }
        // Fallback for browsers that throw when audio constraint is present
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            frameRate: { ideal: 30, max: 30 },
            width:     { ideal: 1920 },
            height:    { ideal: 1080 },
            cursor:    'always',
          } as MediaTrackConstraints,
          audio: false,
        })
      }

      setScreenStream(stream)
      setIsScreenSharing(true)

      const screenVideoTrack = stream.getVideoTracks()[0]

      // Auto-stop when user clicks browser's native "Stop sharing" bar
      if (screenVideoTrack) {
        screenVideoTrack.addEventListener('ended', () => {
          stream.getTracks().forEach((t) => t.stop())
          setScreenStream(null)
          setIsScreenSharing(false)
          onEnded?.()
        })
      }

      return stream
    } catch (err) {
      console.warn('[useWebRTC] Screen share cancelled or rejected:', err)
      return null
    }
  }, [])

  const stopScreenShare = useCallback((onRestoreCamera?: (track: MediaStreamTrack | null) => void) => {
    if (screenStream) {
      screenStream.getTracks().forEach((t) => t.stop())
      setScreenStream(null)
    }
    setIsScreenSharing(false)

    if (onRestoreCamera) {
      const cameraTrack = localStream?.getVideoTracks()[0] ?? null
      onRestoreCamera(cameraTrack)
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
  }
}
