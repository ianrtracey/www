export function ChipStack({ count = 3 }: { count?: number }) {
  const colors = ['#D4AF37', '#C4941F', '#B8860B', '#A87900']

  return (
    <div className="flex flex-col-reverse items-center" style={{ gap: -2 }}>
      {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
        <div
          key={i}
          className="rounded"
          style={{
            width: 28,
            height: 8,
            backgroundColor: colors[i % colors.length],
            marginTop: i > 0 ? -3 : 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.3)',
          }}
        />
      ))}
    </div>
  )
}
