'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { Maximize2, PictureInPicture2, Badge } from 'lucide-react'

interface ScreenShareViewProps {
  stream: MediaStream
}

export default function ScreenShareView({ stream }: ScreenShareViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [resolution, setResolution] = useState<string>('—')
  const [pipSupported] = useState(() => typeof document !== 'undefined' && 'pictureInPictureEnabled' in document)
  const [isPiP, setIsPiP] = useState(false)

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.srcObject = stream
    }
  }, [stream])

  const updateResolution = useCallback(() => {
    if (!videoRef.current) return
    const { videoWidth: w, videoHeight: h } = videoRef.current
    if (!w || !h) return
    if (w >= 3840) setResolution('4K')
    else if (w >= 1920) setResolution('1080p')
    else if (w >= 1280) setResolution('720p')
    else setResolution(`${w}×${h}`)
  }, [])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    el.addEventListener('loadedmetadata', updateResolution)
    el.addEventListener('resize', updateResolution)
    return () => {
      el.removeEventListener('loadedmetadata', updateResolution)
      el.removeEventListener('resize', updateResolution)
    }
  }, [updateResolution])

  const toggleFullscreen = async () => {
    if (!videoRef.current) return
    if (!document.fullscreenElement) {
      await videoRef.current.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const togglePiP = async () => {
    if (!videoRef.current) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
      setIsPiP(false)
    } else {
      await videoRef.current.requestPictureInPicture()
      setIsPiP(true)
    }
  }

  return (
    <div className="relative w-full h-full bg-dark-900 flex items-center justify-center">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="max-w-full max-h-full object-contain rounded-xl shadow-[0_0_60px_rgba(14,165,233,0.15)]"
        style={{ maxHeight: 'calc(100vh - 160px)' }}
      />

      {/* Overlay controls (top-right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2">
        {/* Quality badge */}
        <span className="glass px-3 py-1 text-xs font-semibold text-sky-400 border border-sky-500/40 rounded-full">
          {resolution}
        </span>

        {/* PiP button */}
        {pipSupported && (
          <button
            onClick={togglePiP}
            title="Picture in Picture"
            className={`ctrl-btn w-8 h-8 rounded-lg ${isPiP ? 'ctrl-btn-active' : ''}`}
          >
            <PictureInPicture2 className="w-4 h-4" />
          </button>
        )}

        {/* Fullscreen button */}
        <button
          onClick={toggleFullscreen}
          title="Fullscreen"
          className="ctrl-btn w-8 h-8 rounded-lg"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Screen share label */}
      <div className="absolute top-4 left-4">
        <span className="glass px-3 py-1 text-xs font-medium text-white/70 border border-white/10 rounded-full flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
          Screen sharing
        </span>
      </div>
    </div>
  )
}
