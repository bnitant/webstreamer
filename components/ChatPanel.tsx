'use client'

import { useRef, useEffect, useState } from 'react'
import { Send, Smile } from 'lucide-react'
import type { ChatMessage } from '@/lib/hooks/useSocket'

const EMOJI_LIST = ['😊','👍','🎉','❤️','🔥','💯','😂','🤔']

interface ChatPanelProps {
  messages:  ChatMessage[]
  onSend:    (text: string) => void
  localName: string
}

export default function ChatPanel({ messages, onSend, localName }: ChatPanelProps) {
  const [text, setText] = useState('')
  const [showEmoji, setShowEmoji] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    const trimmed = text.trim()
    if (!trimmed) return
    onSend(trimmed)
    setText('')
    setShowEmoji(false)
  }

  const addEmoji = (emoji: string) => {
    setText((t) => t + emoji)
  }

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const isOwn = (msg: ChatMessage) => msg.name === localName

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-slate-600 text-sm gap-2">
            <span className="text-3xl">💬</span>
            <p>No messages yet. Say hello!</p>
          </div>
        )}
        {messages.map((msg, i) => {
          const own = isOwn(msg)
          return (
            <div key={i} className={`flex flex-col ${own ? 'items-end' : 'items-start'}`}>
              {/* Name + time row */}
              <div className={`flex items-center gap-1.5 mb-1 ${own ? 'flex-row-reverse' : ''}`}>
                {!own && (
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {msg.name[0]?.toUpperCase()}
                  </div>
                )}
                <span className="text-xs text-slate-500">
                  {own ? 'You' : msg.name} · {formatTime(msg.timestamp)}
                </span>
              </div>

              {/* Bubble */}
              <div
                className={`max-w-[220px] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                  own
                    ? 'chat-bubble-self text-white rounded-tr-sm'
                    : 'chat-bubble-other text-slate-200 rounded-tl-sm'
                }`}
              >
                {msg.text}
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Emoji picker */}
      {showEmoji && (
        <div className="px-4 py-2 flex gap-2 flex-wrap border-t border-white/5">
          {EMOJI_LIST.map((e) => (
            <button
              key={e}
              onClick={() => addEmoji(e)}
              className="text-lg hover:scale-125 transition-transform"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 py-3 border-t border-white/5">
        <div className="flex gap-2 items-end">
          <button
            onClick={() => setShowEmoji((v) => !v)}
            className={`ctrl-btn w-9 h-9 shrink-0 rounded-xl ${showEmoji ? 'ctrl-btn-active' : ''}`}
          >
            <Smile className="w-4 h-4" />
          </button>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder="Send a message…"
            rows={1}
            className="flex-1 resize-none bg-white/5 border border-white/10 rounded-xl px-3 py-2.5
                       text-white placeholder-slate-500 text-sm
                       focus:outline-none focus:border-sky-500/50
                       transition-colors leading-relaxed max-h-28"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="btn-primary w-9 h-9 p-0 flex items-center justify-center shrink-0 rounded-xl disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <p className="text-xs text-slate-600 mt-1 pl-1">Enter to send · Shift+Enter for newline</p>
      </div>
    </div>
  )
}
