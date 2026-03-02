import type { Card as CardType } from '@/lib/poker/types'

const SUIT_MAP: Record<string, { symbol: string; color: string }> = {
  s: { symbol: '♠', color: '#1A1A1A' },
  h: { symbol: '♥', color: '#C0392B' },
  d: { symbol: '♦', color: '#C0392B' },
  c: { symbol: '♣', color: '#1A1A1A' },
}

const RANK_DISPLAY: Record<string, string> = {
  T: '10', J: 'J', Q: 'Q', K: 'K', A: 'A',
  '2': '2', '3': '3', '4': '4', '5': '5',
  '6': '6', '7': '7', '8': '8', '9': '9',
}

export function Card({
  card,
  faceDown = false,
  small = false,
  folded = false,
}: {
  card: CardType
  faceDown?: boolean
  small?: boolean
  folded?: boolean
}) {
  const w = small ? 44 : 62
  const h = small ? 62 : 88

  if (faceDown) {
    return (
      <div
        className="rounded-lg flex-shrink-0"
        style={{
          width: w,
          height: h,
          background: 'linear-gradient(135deg, #2D5A3D 0%, #1A3A28 100%)',
          border: '1px solid rgba(255,255,255,0.1)',
          opacity: folded ? 0.5 : 1,
        }}
      />
    )
  }

  const rank = card[0]
  const suit = card[1]
  const { symbol, color } = SUIT_MAP[suit] ?? SUIT_MAP.s

  return (
    <div
      className="rounded-lg flex flex-col justify-between flex-shrink-0"
      style={{
        width: w,
        height: h,
        padding: small ? '5px 6px' : '7px 8px',
        backgroundColor: '#FFFFFF',
        boxShadow: '0px 2px 8px rgba(0,0,0,0.3)',
        opacity: folded ? 0.5 : 1,
      }}
    >
      <div className="flex items-baseline gap-0.5" style={{ color }}>
        <span
          className="font-semibold leading-none"
          style={{ fontSize: small ? 16 : 22, fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          {RANK_DISPLAY[rank] ?? rank}
        </span>
      </div>
      <div
        className="text-center leading-none"
        style={{ color, fontSize: small ? 16 : 22 }}
      >
        {symbol}
      </div>
    </div>
  )
}
