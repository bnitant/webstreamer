'use client'

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
  startScreenShare:   (onTrackReady?: (track: MediaStreamTrack) => void) => Promise<MediaStream | null>
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
  const toggleMic = useCallback(() => {
    if (!localStream) return
    const audioTracks = localStream.getAudioTracks()
    if (audioTracks.length === 0) return
    audioTracks.forEach((t) => {
      t.enabled = !t.enabled
    })
    setIsMuted((m) => !m)
  }, [localStream])

  // ── Camera toggle ────────────────────────────────────────
  const toggleCamera = useCallback(() => {
    if (!localStream) return
    const videoTracks = localStream.getVideoTracks()
    if (videoTracks.length === 0) return
    videoTracks.forEach((t) => {
      t.enabled = !t.enabled
    })
    setIsCameraOff((c) => !c)
  }, [localStream])

  // ── Screen share ─────────────────────────────────────────
  const startScreenShare = useCallback(async (onTrackReady?: (track: MediaStreamTrack) => void): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia(
        getScreenShareConstraints(),
      )
      setScreenStream(stream)
      setIsScreenSharing(true)

      const screenVideoTrack = stream.getVideoTracks()[0]
      if (screenVideoTrack && onTrackReady) {
        onTrackReady(screenVideoTrack)
      }

      // Auto-stop when user clicks browser's native "Stop sharing" bar
      screenVideoTrack.addEventListener('ended', () => {
        setScreenStream(null)
        setIsScreenSharing(false)
      })

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
