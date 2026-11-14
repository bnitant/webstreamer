import type { NextApiRequest, NextApiResponse } from 'next'
import { Server as HTTPServer } from 'http'
import { Server as IOServer, Socket } from 'socket.io'

interface RoomUser {
  socketId: string
  name:     string
  roomId:   string
}

// Rooms: roomId -> Set of socket IDs
const rooms = new Map<string, Set<string>>()
// Users: socketId -> RoomUser
const users = new Map<string, RoomUser>()

type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: HTTPServer & { io?: IOServer }
  }
}

export default function handler(req: NextApiRequest, res: NextApiResponseWithSocket) {
  if (!res.socket.server.io) {
    console.log('[socket.io] Initialising server…')

    const io = new IOServer(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin:  '*',
        methods: ['GET', 'POST'],
      },
      transports: ['polling', 'websocket'],
    })

    res.socket.server.io = io

    io.on('connection', (socket: Socket) => {
      console.log(`[socket.io] connected: ${socket.id}`)

      // ── join-room ────────────────────────────────────────
      socket.on('join-room', ({ roomId, name }: { roomId: string; name: string }) => {
        console.log(`[socket.io] ${name} joining room ${roomId}`)

        // Track user
        users.set(socket.id, { socketId: socket.id, name, roomId })

        // Create room if needed
        if (!rooms.has(roomId)) rooms.set(roomId, new Set())
        const room = rooms.get(roomId)!

        // Broadcast "user-joined" to existing members
        room.forEach((existingId) => {
          io.to(existingId).emit('user-joined', { socketId: socket.id, name })
        })

        // Add socket to room
        room.add(socket.id)
        socket.join(roomId)

        // Send current room users back to the joiner
        const roomUsers = Array.from(room)
          .filter((id) => id !== socket.id)
          .map((id) => {
            const u = users.get(id)
            return {
              peerId:     id,
              name:       u?.name ?? 'Guest',
              isMuted:    false,
              isCameraOff:false,
              quality:    'good' as const,
            }
          })
        socket.emit('room-users', roomUsers)
      })

      // ── WebRTC signaling ─────────────────────────────────
      socket.on('offer', ({ to, offer }: { to: string; offer: RTCSessionDescriptionInit }) => {
        io.to(to).emit('offer', { from: socket.id, offer })
      })

      socket.on('answer', ({ to, answer }: { to: string; answer: RTCSessionDescriptionInit }) => {
        io.to(to).emit('answer', { from: socket.id, answer })
      })

      socket.on('ice-candidate', ({ to, candidate }: { to: string; candidate: RTCIceCandidateInit }) => {
        io.to(to).emit('ice-candidate', { from: socket.id, candidate })
      })

      // ── Chat ─────────────────────────────────────────────
      socket.on('chat-message', (msg: { roomId: string; name: string; text: string; timestamp: number }) => {
        // Broadcast to everyone else in the room (sender already adds to their own list)
        socket.to(msg.roomId).emit('chat-message', {
          name:      msg.name,
          text:      msg.text,
          timestamp: msg.timestamp,
        })
      })

      // ── leave-room ───────────────────────────────────────
      socket.on('leave-room', ({ roomId }: { roomId: string }) => {
        leaveRoom(socket, roomId, io)
      })

      // ── disconnect ───────────────────────────────────────
      socket.on('disconnect', () => {
        console.log(`[socket.io] disconnected: ${socket.id}`)
        const user = users.get(socket.id)
        if (user) {
          leaveRoom(socket, user.roomId, io)
        }
      })
    })
  }

  res.end()
}

function leaveRoom(socket: Socket, roomId: string, io: IOServer) {
  const room = rooms.get(roomId)
  if (room) {
    room.delete(socket.id)
    if (room.size === 0) rooms.delete(roomId)
    else {
      // Notify remaining participants
      io.to(roomId).emit('user-left', socket.id)
    }
  }
  users.delete(socket.id)
  socket.leave(roomId)
}
