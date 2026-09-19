import { ImageResponse } from 'next/og'

export const socialImageAlt = 'tic tac toe vs Jev'
export const socialImageSize = { width: 1200, height: 630 }
export const socialImageContentType = 'image/png'

const board = [
  ['X', '', 'O'],
  ['', 'X', ''],
  ['O', '', 'X'],
]

export function createSocialImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '80px 88px',
          background:
            'radial-gradient(circle at 82% 18%, #3f3f46 0%, #18181b 34%, #09090b 76%)',
          color: '#fafafa',
          fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            maxWidth: 610,
          }}
        >
          <div
            style={{
              color: '#a1a1aa',
              fontSize: 27,
              fontWeight: 600,
              letterSpacing: 5,
              textTransform: 'uppercase',
            }}
          >
            ian.so
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: 34,
              fontSize: 82,
              fontWeight: 750,
              lineHeight: 0.95,
              letterSpacing: -4,
            }}
          >
            <span>tic tac toe</span>
            <span style={{ color: '#a1a1aa', marginTop: 18 }}>vs Jev</span>
          </div>
          <div
            style={{
              display: 'flex',
              marginTop: 44,
              color: '#d4d4d8',
              fontSize: 28,
            }}
          >
            Think you can win?
          </div>
        </div>

        <div
          style={{
            width: 350,
            height: 350,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            padding: 18,
            border: '1px solid #52525b',
            borderRadius: 34,
            background: 'rgba(24, 24, 27, 0.88)',
            boxShadow: '0 28px 80px rgba(0, 0, 0, 0.38)',
          }}
        >
          {board.map((row, rowIndex) => (
            <div
              key={rowIndex}
              style={{
                display: 'flex',
                flex: 1,
                gap: 10,
              }}
            >
              {row.map((cell, columnIndex) => (
                <div
                  key={columnIndex}
                  style={{
                    display: 'flex',
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 18,
                    background: '#27272a',
                    color: cell === 'X' ? '#fafafa' : '#a1a1aa',
                    fontSize: 64,
                    fontWeight: 700,
                  }}
                >
                  {cell}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    ),
    socialImageSize,
  )
}
