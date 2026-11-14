import { Metadata } from 'next'
import RoomClient from '@/components/RoomClient'

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
