import type { Card as CardType } from '@/lib/poker/types'
import { Card } from './Card'
import { ChipStack } from './ChipStack'

interface PlayerSeatProps {
  name: string
  chips: number
  holeCards: CardType[]
  bet: number
  status: string
  color: string
  icon: string
  isDealer: boolean
  position: 'top' | 'bottom' | 'left' | 'right'
  isEliminated: boolean
}

const GRADIENTS: Record<string, string> = {
  '#E8764B': 'linear-gradient(135deg, #E8764B 0%, #C45A2D 100%)',
  '#7B61FF': 'linear-gradient(135deg, #7B61FF 0%, #6247CC 100%)',
  '#10A37F': 'linear-gradient(135deg, #10A37F 0%, #0B7A5E 100%)',
  '#A1A1AA': 'linear-gradient(135deg, #E4E4E7 0%, #A1A1AA 100%)',
}

function formatChips(n: number): string {
  return `$${n.toLocaleString()}`
}

export function PlayerSeat({
  name,
  chips,
  holeCards,
  bet,
  status,
  color,
  icon,
  isDealer,
  position,
  isEliminated,
}: PlayerSeatProps) {
  const isFolded = status === 'folded'
  const isAllIn = status === 'all_in'

  // Badge
  const badge = (
    <div
      className="flex items-center gap-2.5 rounded-xl"
      style={{
        padding: '8px 16px 8px 10px',
        backgroundColor: `${color}1F`,
        border: `1px solid ${color}40`,
      }}
    >
      <div
        className="flex items-center justify-center rounded-lg text-white text-sm font-bold flex-shrink-0"
        style={{
          width: 32,
          height: 32,
          background: GRADIENTS[color] ?? color,
          fontFamily: 'var(--font-dm-sans), sans-serif',
        }}
      >
        {icon}
      </div>
      <div className="flex flex-col">
        <span
          className="text-sm font-semibold text-white leading-tight"
          style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          {name}
        </span>
        <span
          className="text-xs leading-tight"
          style={{ color: `${color}CC` }}
        >
          {formatChips(chips)}
        </span>
      </div>
    </div>
  )

  // Cards
  const cards = holeCards.length > 0 ? (
    <div className="flex gap-1.5">
      {holeCards.map((c, i) => (
        <Card key={i} card={c} small folded={isFolded} />
      ))}
    </div>
  ) : null

  // Status label
  const statusLabel = isFolded ? (
    <div
      className="rounded-lg text-xs px-2.5 py-0.5"
      style={{ backgroundColor: 'rgba(192,57,43,0.15)', color: '#E74C3C' }}
    >
      Folded
    </div>
  ) : isAllIn ? (
    <div
      className="rounded-lg text-xs px-2.5 py-0.5"
      style={{ backgroundColor: 'rgba(212,175,55,0.15)', color: '#D4AF37' }}
    >
      All In
    </div>
  ) : bet > 0 ? (
    <div
      className="rounded-lg text-xs px-2.5 py-0.5"
      style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' }}
    >
      Bet {formatChips(bet)}
    </div>
  ) : null

  // Chip stack + dealer button area (shown near the table edge)
  const chipArea = (bet > 0 && !isFolded) ? <ChipStack count={Math.min(4, Math.ceil(bet / 100))} /> : null
  const dealerButton = isDealer ? (
    <div
      className="flex items-center justify-center rounded-full text-xs font-bold"
      style={{
        width: 28,
        height: 28,
        backgroundColor: '#F5F5F5',
        color: '#1A1A1A',
        boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
        fontFamily: 'var(--font-dm-sans), sans-serif',
      }}
    >
      D
    </div>
  ) : null

  if (isEliminated) {
    return (
      <div className="flex flex-col items-center gap-2 opacity-30">
        {badge}
        <div className="rounded-lg text-xs px-2.5 py-0.5" style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}>
          Eliminated
        </div>
      </div>
    )
  }

  // Layout depends on position
  if (position === 'bottom') {
    return (
      <div className="flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-2">
          {dealerButton}
          {chipArea}
        </div>
        {statusLabel}
        {cards}
        {badge}
      </div>
    )
  }

  if (position === 'top') {
    return (
      <div className="flex flex-col items-center gap-2.5">
        {badge}
        {cards}
        {statusLabel}
        <div className="flex items-center gap-2">
          {chipArea}
        </div>
      </div>
    )
  }

  if (position === 'left') {
    return (
      <div className="flex flex-col items-center gap-2">
        {badge}
        {cards}
        {statusLabel}
      </div>
    )
  }

  // right
  return (
    <div className="flex flex-col items-center gap-2">
      {badge}
      {chipArea}
      {cards}
      {statusLabel}
    </div>
  )
}
