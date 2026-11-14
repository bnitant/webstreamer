import dynamic from 'next/dynamic'
import { Metadata } from 'next'

// Disable SSR for RoomClient — it uses browser-only APIs (WebRTC, navigator, window)
const RoomClient = dynamic(() => import('@/components/RoomClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg animate-pulse">
        <span className="text-lg font-bold text-white">W</span>
      </div>
      <p className="text-sky-400 text-sm animate-pulse">Loading room…</p>
    </div>
  ),
})

interface PageProps {
  params: { roomId: string }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  return {
    title: `Room ${params.roomId.slice(0, 8)}… — WebStreamer`,
    description: 'Join this WebStreamer room to screen share, video call, voice call, and chat.',
  }
}

export default function RoomPage({ params }: PageProps) {
  return <RoomClient roomId={params.roomId} />
}
