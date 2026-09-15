import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import {
  Sparkles,
  X,
  Send,
  Loader2,
  TrendingUp,
  ShieldAlert,
  Calendar,
  DollarSign,
  HelpCircle,
  Bot,
  User,
  ExternalLink,
} from 'lucide-react'
import { useCopilotChat } from '@/api/aiApi'
import { usePortfolios } from '@/api/portfolioApi'
import { useAccounts } from '@/api/accountApi'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  data?: any
}

interface CopilotDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const QUICK_PROMPTS = [
  'Upcoming earnings dates for NVDA & AAPL',
  'Is NVDA undervalued based on DCF & Buffett model?',
  'What is the CAPM expected return for S&P 500 / VUAA?',
  'Analyze my portfolio risk & 5-year Monte Carlo',
]

export function CopilotDrawer({ isOpen, onClose }: CopilotDrawerProps) {
  const { data: portfolios } = usePortfolios()
  const { data: accounts } = useAccounts()
  const activePortfolio = portfolios?.[0]
  const cashBalance = accounts?.[0]?.cashBalance || 0

  const chatMutation = useCopilotChat()
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: "👋 **Welcome to WealthOS Institutional AI Copilot**\n\nI monitor authentic real-time market data, confirmed corporate earnings dates, DCF intrinsic fair value calculations, Warren Buffett quality filters, and quantitative portfolio risk.\n\nAsk me about any ticker (e.g. *NVDA, TSLA, AAPL, BTC, VUAA*) or request a full portfolio risk diagnostic.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])

  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, chatMutation.isPending])

  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || input).trim()
    if (!text || chatMutation.isPending) return

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInput('')

    chatMutation.mutate(
      {
        message: text,
        portfolio: {
          holdings: activePortfolio?.holdings || [],
          totalValue: activePortfolio?.totalValue ?? 0.0,
          cashBalance,
        },
      },
      {
        onSuccess: (data) => {
          const aiMsg: Message = {
            id: `ai-${Date.now()}`,
            sender: 'assistant',
            text: data.reply || 'Analysis completed.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            data: data.data || data.diagnostics,
          }
          setMessages((prev) => [...prev, aiMsg])
        },
        onError: () => {
          const errMsg: Message = {
            id: `err-${Date.now()}`,
            sender: 'assistant',
            text: '⚠️ Unable to complete real-time market analysis. Please verify your connection or try another asset query.',
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          }
          setMessages((prev) => [...prev, errMsg])
        },
      }
    )
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-[9999] overflow-hidden" style={{ margin: 0, padding: 0 }}>
      {/* Dimmed Backdrop */}
      <div
        className="fixed inset-0 bg-zinc-950/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over Drawer Panel */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-8 z-[10000]">
        <div
          className="w-screen max-w-md sm:max-w-lg bg-white h-screen shadow-2xl flex flex-col border-l border-zinc-200"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 bg-zinc-50/95 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-xs">
                <Sparkles className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-zinc-900 tracking-tight flex items-center gap-1.5">
                  WealthOS AI Copilot
                  <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800 uppercase font-mono">
                    Live
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500">Real-Time News, Catalysts, Valuation & Risk</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Chat Messages Body with full scrolling */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-amber-400 text-xs">
                    <Bot className="h-3.5 w-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-zinc-900 text-white font-medium shadow-xs'
                      : 'bg-zinc-100/90 text-zinc-800 border border-zinc-200/70 shadow-xs'
                  }`}
                >
                  <div className="whitespace-pre-wrap font-sans text-xs">
                    {m.text}
                  </div>
                  <span
                    className={`mt-1.5 block text-[9px] font-mono ${
                      m.sender === 'user' ? 'text-zinc-400 text-right' : 'text-zinc-400'
                    }`}
                  >
                    {m.timestamp}
                  </span>
                </div>

                {m.sender === 'user' && (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-zinc-700 text-xs">
                    <User className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>
            ))}

            {chatMutation.isPending && (
              <div className="flex gap-2.5 items-center text-zinc-400 text-xs pl-2">
                <Loader2 className="h-4 w-4 animate-spin text-zinc-600" />
                <span>Analyzing live market fundamentals & corporate data...</span>
              </div>
            )}
          </div>

          {/* Quick Suggested Prompts */}
          <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/80 shrink-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
              Suggested Queries
            </span>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => handleSendMessage(prompt)}
                  disabled={chatMutation.isPending}
                  className="rounded-lg border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-left truncate max-w-full disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* Input Bar */}
          <div className="p-3.5 border-t border-zinc-200 bg-white shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleSendMessage()
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about NVDA earnings, DCF models, portfolio risk..."
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-zinc-300"
              />
              <button
                type="submit"
                disabled={chatMutation.isPending || !input.trim()}
                className="rounded-xl bg-zinc-900 p-2.5 text-white hover:bg-zinc-800 transition-colors disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
