'use client'

import { useEffect, useRef, useState } from 'react'
import type { Card as CardType, Phase, ActionType } from '@/lib/poker/types'
import { Card } from './Card'
import { PlayerSeat } from './PlayerSeat'

interface PlayerState {
  name: string
  chips: number
  holeCards: CardType[]
  bet: number
  status: string
  color: string
  icon: string
  isEliminated: boolean
}

interface ActionLog {
  playerName: string
  action: ActionType
  amount: number
  phase: Phase
}

interface GamePayload {
  type: 'state_update' | 'hand_result' | 'game_over'
  hand: {
    number: number
    phase: Phase
    communityCards: CardType[]
    potTotal: number
  }
  players: PlayerState[]
  dealerSeat: number
  blinds: { small: number; big: number }
  actions: ActionLog[]
  pnl: Record<string, number>
  winners?: { playerName: string; amount: number }[]
}

function formatChips(n: number): string {
  return `$${n.toLocaleString()}`
}

function formatPnl(n: number): string {
  if (n > 0) return `+$${n.toLocaleString()}`
  if (n < 0) return `-$${Math.abs(n).toLocaleString()}`
  return '$0'
}

function formatAction(a: ActionLog): string {
  const actionLabel = a.action === 'all_in' ? 'goes all in' : a.action === 'raise'
    ? `raises to ${formatChips(a.amount)}`
    : a.action === 'bet'
    ? `bets ${formatChips(a.amount)}`
    : a.action === 'call'
    ? `calls ${formatChips(a.amount)}`
    : a.action
  return `${a.playerName} ${actionLabel}`
}

// Map seat index to position: 0=Claude(bottom), 1=Gemini(top), 2=GPT(right), 3=Grok(left)
const SEAT_POSITION: Record<number, 'top' | 'bottom' | 'left' | 'right'> = {
  0: 'bottom',
  1: 'top',
  2: 'right',
  3: 'left',
}

const PNL_COLORS: Record<string, string> = {
  Claude: '#E8764B',
  Gemini: '#7B61FF',
  GPT: '#10A37F',
  Grok: '#A1A1AA',
}

export function PokerTable() {
  const [state, setState] = useState<GamePayload | null>(null)
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/poker/api')
    eventSourceRef.current = es

    es.onopen = () => setConnected(true)
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as GamePayload
        setState(data)
      } catch {
        // ignore parse errors
      }
    }
    es.onerror = () => {
      setConnected(false)
    }

    return () => {
      es.close()
    }
  }, [])

  if (!state) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ backgroundColor: '#0C0F14' }}>
        <div className="flex items-center gap-3 text-zinc-400">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>Connecting...</span>
        </div>
      </div>
    )
  }

  const { hand, players, dealerSeat, blinds, actions, pnl } = state
  const recentActions = actions.slice(-4)

  // Get players by position
  const bottomPlayer = players.find((_, i) => SEAT_POSITION[i] === 'bottom')!
  const topPlayer = players.find((_, i) => SEAT_POSITION[i] === 'top')!
  const leftPlayer = players.find((_, i) => SEAT_POSITION[i] === 'left')!
  const rightPlayer = players.find((_, i) => SEAT_POSITION[i] === 'right')!

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: '#0C0F14' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between flex-shrink-0"
        style={{ padding: '20px 40px' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-full"
            style={{
              width: 28,
              height: 28,
              backgroundColor: '#1A1D24',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"
                fill="rgba(255,255,255,0.5)"
              />
              <path d="M12 6v6l4 2" stroke="#0C0F14" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1
              className="text-base font-bold text-white leading-tight"
              style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              AI Poker Showdown
            </h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Texas Hold&apos;em &middot; No Limit
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: connected ? '#22C55E' : '#EAB308' }}
            />
            <span className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              {connected ? 'Live' : 'Connecting'}
            </span>
          </div>
          <div className="text-right">
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Round</div>
            <div
              className="text-lg font-bold text-white leading-tight"
              style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {hand.number}
            </div>
          </div>
          <div style={{ width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' }} />
          <div className="text-right">
            <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>Blinds</div>
            <div
              className="text-lg font-bold text-white leading-tight"
              style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
            >
              {formatChips(blinds.small)} / {formatChips(blinds.big)}
            </div>
          </div>
        </div>
      </header>

      {/* Table Area */}
      <div className="flex-1 relative flex items-center justify-center">
        {/* Table Felt */}
        <div
          className="relative flex items-center justify-center flex-col"
          style={{
            width: '60vw',
            maxWidth: 860,
            aspectRatio: '860 / 480',
            borderRadius: 240,
            backgroundImage:
              'radial-gradient(circle at 50% 50%, #2B7A40 0%, #1A5530 60%, #14472A 100%)',
            border: '8px solid #1A2620',
            boxShadow:
              'inset 0 0 80px rgba(0,0,0,0.2), 0 0 60px rgba(20,90,48,0.3)',
            gap: 16,
          }}
        >
          {/* Pot Display */}
          {hand.potTotal > 0 && (
            <div
              className="flex items-center gap-2"
              style={{
                backgroundColor: 'rgba(0,0,0,0.3)',
                borderRadius: 20,
                padding: '8px 18px',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="#D4AF37" strokeWidth="1.5" />
                <text x="7" y="10" textAnchor="middle" fontSize="7" fill="#D4AF37" fontWeight="bold">
                  $
                </text>
              </svg>
              <span className="text-xs uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Pot
              </span>
              <span
                className="text-lg font-bold"
                style={{ color: '#D4AF37', fontFamily: 'var(--font-dm-sans), sans-serif' }}
              >
                {formatChips(hand.potTotal)}
              </span>
            </div>
          )}

          {/* Community Cards */}
          {hand.communityCards.length > 0 && (
            <div className="flex gap-2">
              {hand.communityCards.map((c, i) => (
                <Card key={i} card={c} />
              ))}
            </div>
          )}
        </div>

        {/* Player Positions */}
        {/* Top - Gemini */}
        <div className="absolute" style={{ top: 10, left: '50%', transform: 'translateX(-50%)' }}>
          <PlayerSeat
            {...topPlayer}
            isDealer={dealerSeat === 1}
            position="top"
          />
        </div>

        {/* Bottom - Claude */}
        <div className="absolute" style={{ bottom: 10, left: '50%', transform: 'translateX(-50%)' }}>
          <PlayerSeat
            {...bottomPlayer}
            isDealer={dealerSeat === 0}
            position="bottom"
          />
        </div>

        {/* Left - Grok */}
        <div className="absolute" style={{ left: 'calc(50% - min(33vw, 460px))', top: '50%', transform: 'translate(-100%, -50%)' }}>
          <PlayerSeat
            {...leftPlayer}
            isDealer={dealerSeat === 3}
            position="left"
          />
        </div>

        {/* Right - GPT */}
        <div className="absolute" style={{ right: 'calc(50% - min(33vw, 460px))', top: '50%', transform: 'translate(100%, -50%)' }}>
          <PlayerSeat
            {...rightPlayer}
            isDealer={dealerSeat === 2}
            position="right"
          />
        </div>
      </div>

      {/* Bottom Bar */}
      <div
        className="flex items-center justify-between flex-shrink-0"
        style={{
          padding: '14px 40px 20px',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* P&L */}
        <div className="flex items-center gap-5">
          {players.map((p) => (
            <div key={p.name} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-sm"
                style={{ backgroundColor: PNL_COLORS[p.name] ?? p.color }}
              />
              <span className="text-sm text-white" style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>
                {p.name}
              </span>
              <span
                className="text-sm"
                style={{
                  color: (pnl[p.name] ?? 0) > 0
                    ? '#22C55E'
                    : (pnl[p.name] ?? 0) < 0
                    ? '#EF4444'
                    : 'rgba(255,255,255,0.4)',
                }}
              >
                {formatPnl(pnl[p.name] ?? 0)}
              </span>
            </div>
          ))}
        </div>

        {/* Recent Actions */}
        <div
          className="flex items-center gap-2 rounded-lg"
          style={{
            padding: '6px 14px',
            backgroundColor: 'rgba(255,255,255,0.04)',
          }}
        >
          {recentActions.map((a, i) => (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && (
                <span
                  className="w-1 h-1 rounded-full"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                />
              )}
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {formatAction(a)}
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
