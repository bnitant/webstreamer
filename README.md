# WebStreamer 🌊

**Screen share, video call, voice call and chat — all in one place.**

Built with Next.js 14, WebRTC (via native APIs + Socket.io signaling), Tailwind CSS, Framer Motion.

---

## ✨ Features

| Feature | Detail |
|---|---|
| 📺 Screen Share | 60fps, up to 8 Mbps, anti-lag optimized |
| 📹 Video Call | HD 720p / 1080p, adaptive bitrate |
| 🎙️ Voice Call | Echo cancellation, noise suppression |
| 💬 Live Chat | Real-time alongside your call |
| 🎨 Blue UI | Dark navy + sky/indigo/cyan palette |
| 🚀 Vercel Ready | One-click deploy |

---

## 🏁 Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# 1. Clone / navigate to the project
cd webstreamer

# 2. Install dependencies
npm install

# 3. Copy the env file
cp .env.example .env.local

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## 🗂️ Project Structure

```
webstreamer/
├── app/
│   ├── layout.tsx          # Root layout (fonts, metadata)
│   ├── globals.css         # Global styles, glass morphism, animations
│   ├── page.tsx            # Landing page
│   └── room/[roomId]/
│       └── page.tsx        # Room page shell
├── components/
│   ├── RoomClient.tsx      # Main room UI ('use client')
│   ├── VideoGrid.tsx       # Responsive video tile grid
│   ├── ScreenShareView.tsx # Screen share viewer + controls
│   ├── ChatPanel.tsx       # Chat sidebar with emoji support
│   ├── Controls.tsx        # Bottom control bar (glass pill)
│   ├── ParticipantsList.tsx# Sidebar participant cards
│   └── ui/
│       ├── Button.tsx      # Reusable button variants
│       ├── Avatar.tsx      # Initials avatar
│       └── Badge.tsx       # Status badges
├── lib/
│   ├── webrtc.ts           # WebRTC constants & helpers
│   └── hooks/
│       ├── useWebRTC.ts    # Local/remote stream management
│       ├── useSocket.ts    # Socket.io signaling + chat
│       └── useRoom.ts      # Orchestrating hook (WebRTC + Socket)
├── pages/
│   └── api/
│       └── socket.ts       # Socket.io server (signaling)
├── tailwind.config.ts
├── next.config.js
├── vercel.json
└── .env.example
```

---

## 🔧 Anti-Lag Screen Share

- `getDisplayMedia` with `frameRate: { ideal: 60 }`, `width: { ideal: 1920 }`
- `RTCPeerConnection` with `bundlePolicy: 'max-bundle'`, `iceCandidatePoolSize: 10`
- `RTCRtpSender.setParameters()` capping screen tracks at **8 Mbps**
- Multiple STUN servers (Google + Cloudflare)

---

## 🚀 Deploy to Vercel

### One-click (recommended)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manual

```bash
npm install -g vercel
vercel login
vercel --prod
```

### Environment Variables (Vercel Dashboard)

| Key | Value |
|---|---|
| `NEXT_PUBLIC_SOCKET_URL` | Your Vercel deployment URL |
| `NEXT_PUBLIC_APP_URL` | Your Vercel deployment URL |

> **Note:** Socket.io runs in the `/api/socket` serverless function. Vercel's serverless functions support long-polling but not persistent WebSocket connections on the free tier. For production WebSocket support, consider [Railway](https://railway.app) or [Render](https://render.com).

---

## 🎨 Design System

| Token | Value |
|---|---|
| Background | `#0a0f1e` → `#0d1526` |
| Primary | Sky 500 (`#0ea5e9`) |
| Accent | Indigo 500 (`#6366f1`), Cyan 500 (`#06b6d4`) |
| Highlight | Sky 400 (`#38bdf8`) |
| Muted text | Slate 400 |
| Fonts | Space Grotesk (headings), Inter (body) |

---

## 📄 License

MIT
