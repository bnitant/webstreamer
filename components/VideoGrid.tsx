'use client'

import { useRef, useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MicOff,
  VideoOff,
  Pin,
  PinOff,
  Maximize2,
  PictureInPicture2,
  Monitor,
  LayoutGrid,
  Columns3,
  Volume2,
} from 'lucide-react'
import type { Participant, ReactionItem } from '@/lib/hooks/useSocket'

export interface RemoteStreamEntry {
  peerId: string
  stream: MediaStream
  name:   string
}

interface VideoGridProps {
  localStream:     MediaStream | null
  screenStream:    MediaStream | null
  remoteStreams:   RemoteStreamEntry[]
  participants:    Participant[]
  reactions?:      ReactionItem[]
  localName:       string
  isMuted:         boolean
  isCameraOff:     boolean
  isScreenSharing: boolean
  layoutMode?:     'spotlight' | 'grid'
  onToggleLayout?: () => void
}

interface TileItem {
  id:          string
  name:        string
  stream:      MediaStream | null
  isLocal:     boolean
  isMuted:     boolean
  isCameraOff: boolean
  isScreen?:   boolean
}

// ── Single Video Tile Component ──────────────────────────────────────────────
function VideoTile({
  item,
  isSpotlight = false,
  isPinned = false,
  onPin,
  reaction,
}: {
  item:         TileItem
  isSpotlight?: boolean
  isPinned?:    boolean
  onPin?:       () => void
  reaction?:    ReactionItem
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [resolution, setResolution] = useState<string>('')
  const [isHovered, setIsHovered] = useState(false)

  useEffect(() => {
    if (videoRef.current && item.stream) {
      videoRef.current.srcObject = item.stream
    }
  }, [item.stream])

  const initials = useMemo(() => {
    return item.name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U'
  }, [item.name])

  const handleFullscreen = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const container = videoRef.current?.parentElement
    if (!container) return
    if (!document.fullscreenElement) {
      await container.requestFullscreen()
    } else {
      await document.exitFullscreen()
    }
  }

  const handlePiP = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!videoRef.current) return
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture()
    } else if (document.pictureInPictureEnabled) {
      await videoRef.current.requestPictureInPicture()
    }
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onPin}
      className={`group relative overflow-hidden transition-all duration-300 select-none ${
        isSpotlight
          ? 'w-full h-full rounded-3xl bg-[#0b1120] border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.6)] flex items-center justify-center'
          : 'w-full aspect-video rounded-2xl bg-[#0d1527] border border-white/10 hover:border-sky-500/50 shadow-md cursor-pointer hover:shadow-glow-sm'
      }`}
    >
      {/* Video Element or Avatar */}
      {item.stream && (!item.isCameraOff || item.isScreen) ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={item.isLocal}
          className={`w-full h-full ${
            item.isScreen ? 'object-contain' : 'object-cover'
          } rounded-[inherit]`}
          onLoadedMetadata={() => {
            if (item.isScreen && videoRef.current) {
              const { videoWidth: w } = videoRef.current
              if (w >= 3840) setResolution('4K')
              else if (w >= 1920) setResolution('1080p')
              else if (w >= 1280) setResolution('720p')
            }
          }}
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-[#111a33] to-[#0a0f1e] gap-3">
          <div
            className={`rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-heading font-bold shadow-glow ${
              isSpotlight ? 'w-24 h-24 text-3xl' : 'w-14 h-14 text-lg'
            }`}
          >
            {initials}
          </div>
          {isSpotlight && (
            <span className="text-sm font-medium text-slate-400">
              {item.isLocal ? 'Your camera is off' : `${item.name}'s camera is off`}
            </span>
          )}
        </div>
      )}

      {/* Screen Share Live Indicator Badge */}
      {item.isScreen && (
        <div className="absolute top-4 left-4 flex items-center gap-2 z-10 pointer-events-none">
          <span className="glass px-3 py-1 text-xs font-semibold text-white/90 border border-sky-500/30 rounded-full flex items-center gap-1.5 shadow-lg bg-dark-800/80 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Screen Share
          </span>
          {resolution && (
            <span className="glass px-2.5 py-1 text-xs font-bold text-sky-400 border border-sky-500/30 rounded-full bg-dark-800/80">
              {resolution} 60fps
            </span>
          )}
        </div>
      )}

      {/* Blue Audio Status Wave Badge (Matching the uploaded photo) */}
      {!item.isMuted && !item.isScreen && (
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
          <div
            title="Audio active"
            className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-500 to-blue-600 shadow-glow-sm flex items-center justify-center text-white backdrop-blur-sm"
          >
            <div className="flex items-center gap-[2px] h-3.5">
              <span className="w-[2.5px] h-2 bg-white rounded-full animate-pulse" />
              <span className="w-[2.5px] h-3.5 bg-white rounded-full animate-pulse delay-75" />
              <span className="w-[2.5px] h-1.5 bg-white rounded-full animate-pulse delay-150" />
            </div>
          </div>
        </div>
      )}

      {/* Muted Audio Badge */}
      {item.isMuted && !item.isScreen && (
        <div className="absolute top-3 right-3 z-10">
          <span className="w-7 h-7 rounded-full bg-red-500/90 shadow-md backdrop-blur-sm flex items-center justify-center">
            <MicOff className="w-3.5 h-3.5 text-white" />
          </span>
        </div>
      )}

      {/* Bottom Name Overlay (Clean Google Meet Style) */}
      <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-black/80 via-black/40 to-transparent pointer-events-none" />
      <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10 pointer-events-none">
        <span className="glass px-2.5 py-1 text-xs font-medium text-white drop-shadow-md rounded-lg bg-black/40 backdrop-blur-sm">
          {item.name}
          {item.isLocal ? ' (You)' : ''}
        </span>
      </div>

      {/* Floating Hover Controls (Pin, Fullscreen, PiP) */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            transition={{ duration: 0.15 }}
            className="absolute top-3 left-3 flex items-center gap-1.5 z-20"
          >
            {onPin && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onPin()
                }}
                title={isPinned ? 'Unpin' : 'Pin to stage'}
                className="w-8 h-8 rounded-xl bg-black/60 hover:bg-sky-500 text-white backdrop-blur-md flex items-center justify-center transition-colors shadow-md"
              >
                {isPinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
            )}
            <button
              onClick={handleFullscreen}
              title="Fullscreen"
              className="w-8 h-8 rounded-xl bg-black/60 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-colors shadow-md"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            {item.isScreen && typeof document !== 'undefined' && 'pictureInPictureEnabled' in document && (
              <button
                onClick={handlePiP}
                title="Picture in Picture"
                className="w-8 h-8 rounded-xl bg-black/60 hover:bg-white/20 text-white backdrop-blur-md flex items-center justify-center transition-colors shadow-md"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Reaction Bubble (Matching Camila Rodriguez in user photo) */}
      <AnimatePresence>
        {reaction && (
          <motion.div
            initial={{ opacity: 0, scale: 0.6, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -20 }}
            transition={{ type: 'spring', damping: 15 }}
            className="absolute top-4 left-4 z-30 pointer-events-none flex items-center gap-2 bg-white/95 text-slate-900 px-3 py-1.5 rounded-full shadow-[0_8px_25px_rgba(0,0,0,0.4)] border border-sky-400/40"
          >
            <span className="text-xl leading-none animate-bounce">{reaction.emoji}</span>
            <span className="text-xs font-semibold tracking-tight">{reaction.name}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Main Layout Component ────────────────────────────────────────────────────
export default function VideoGrid({
  localStream,
  screenStream,
  remoteStreams,
  participants,
  reactions = [],
  localName,
  isMuted,
  isCameraOff,
  isScreenSharing,
  layoutMode: initialLayout = 'spotlight',
}: VideoGridProps) {
  const [layoutMode, setLayoutMode] = useState<'spotlight' | 'grid'>(initialLayout)
  const [pinnedId, setPinnedId] = useState<string | null>(null)

  // Build unified array of all participants/tiles
  const allItems: TileItem[] = useMemo(() => {
    const list: TileItem[] = []

    // 1. If local screen sharing is active, add Screen Share tile
    if (isScreenSharing && screenStream) {
      list.push({
        id:          'local-screen',
        name:        `${localName}'s Screen`,
        stream:      screenStream,
        isLocal:     true,
        isMuted:     true,
        isCameraOff: false,
        isScreen:    true,
      })
    }

    // 2. Add Remote Streams
    remoteStreams.forEach((entry) => {
      const p = participants.find((part) => part.peerId === entry.peerId)
      list.push({
        id:          entry.peerId,
        name:        entry.name || p?.name || 'Guest',
        stream:      entry.stream,
        isLocal:     false,
        isMuted:     p?.isMuted ?? false,
        isCameraOff: p?.isCameraOff ?? false,
        isScreen:    false,
      })
    })

    // 3. Add Local User tile
    list.push({
      id:          'local-user',
      name:        localName,
      stream:      localStream,
      isLocal:     true,
      isMuted:     isMuted,
      isCameraOff: isCameraOff,
      isScreen:    false,
    })

    return list
  }, [
    isScreenSharing,
    screenStream,
    localName,
    remoteStreams,
    participants,
    localStream,
    isMuted,
    isCameraOff,
  ])

  // Determine which item is on the Main Spotlight Stage
  const spotlightItem = useMemo(() => {
    // If pinned item exists, use it
    if (pinnedId) {
      const found = allItems.find((i) => i.id === pinnedId)
      if (found) return found
    }
    // If screen share is active, spotlight the screen
    const screenItem = allItems.find((i) => i.isScreen)
    if (screenItem) return screenItem

    // Otherwise, spotlight the first remote participant or local
    const firstRemote = allItems.find((i) => !i.isLocal)
    return firstRemote || allItems[0]
  }, [pinnedId, allItems])

  // Sidebar filmstrip holds all other items
  const sidebarItems = useMemo(() => {
    return allItems.filter((i) => i.id !== spotlightItem?.id)
  }, [allItems, spotlightItem])

  // Get active reaction for a tile
  const getReaction = (name: string, isLocal: boolean) => {
    return reactions.find((r) => (isLocal ? r.name === localName : r.name === name))
  }

  // Toggle layout between Spotlight (Meet style) and Gallery Grid
  const toggleLayout = () => {
    setLayoutMode((prev) => (prev === 'spotlight' ? 'grid' : 'spotlight'))
  }

  return (
    <div className="relative w-full h-full flex flex-col p-3 md:p-4 overflow-hidden">
      {/* Top Floating View Switcher Pill */}
      <div className="absolute top-4 right-6 z-20 hidden md:flex items-center gap-1.5 glass px-3 py-1.5 rounded-full border border-white/10 bg-dark-800/80 backdrop-blur-md shadow-lg">
        <button
          onClick={toggleLayout}
          title="Switch view layout"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-300 hover:text-white transition-colors"
        >
          {layoutMode === 'spotlight' ? (
            <>
              <LayoutGrid className="w-3.5 h-3.5 text-sky-400" />
              <span>Grid View</span>
            </>
          ) : (
            <>
              <Columns3 className="w-3.5 h-3.5 text-sky-400" />
              <span>Stage View</span>
            </>
          )}
        </button>
      </div>

      {/* ── SPOTLIGHT / STAGE LAYOUT (Google Meet Style from User Image) ── */}
      {layoutMode === 'spotlight' ? (
        <div className="w-full h-full flex flex-col lg:flex-row gap-3 md:gap-4 overflow-hidden">
          {/* Main Stage (Large Central View) */}
          <div className="flex-1 h-full min-h-0 relative flex items-center justify-center overflow-hidden">
            {spotlightItem && (
              <VideoTile
                item={spotlightItem}
                isSpotlight={true}
                isPinned={pinnedId === spotlightItem.id}
                onPin={() => setPinnedId(pinnedId === spotlightItem.id ? null : spotlightItem.id)}
                reaction={getReaction(spotlightItem.name, spotlightItem.isLocal)}
              />
            )}
          </div>

          {/* Right Column Filmstrip (Stacked Participant Cards) */}
          {sidebarItems.length > 0 && (
            <div className="w-full lg:w-[280px] xl:w-[320px] shrink-0 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto pr-1 pb-1 lg:pb-0 scrollbar-thin scrollbar-thumb-white/10">
              {sidebarItems.map((item) => (
                <div key={item.id} className="min-w-[200px] lg:min-w-0">
                  <VideoTile
                    item={item}
                    isSpotlight={false}
                    isPinned={pinnedId === item.id}
                    onPin={() => setPinnedId(pinnedId === item.id ? null : item.id)}
                    reaction={getReaction(item.name, item.isLocal)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── BALANCED GRID VIEW (Gallery of all participants) ── */
        <div
          className={`w-full h-full grid gap-3 md:gap-4 auto-rows-fr ${
            allItems.length === 1
              ? 'grid-cols-1'
              : allItems.length === 2
              ? 'grid-cols-1 md:grid-cols-2'
              : allItems.length <= 4
              ? 'grid-cols-2'
              : allItems.length <= 6
              ? 'grid-cols-2 lg:grid-cols-3'
              : 'grid-cols-3'
          }`}
        >
          {allItems.map((item) => (
            <VideoTile
              key={item.id}
              item={item}
              isSpotlight={false}
              isPinned={pinnedId === item.id}
              onPin={() => {
                setPinnedId(item.id)
                setLayoutMode('spotlight')
              }}
              reaction={getReaction(item.name, item.isLocal)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
