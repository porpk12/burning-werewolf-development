import { Flame } from 'lucide-react'
import { locationsFor } from '@/lib/night-locations'

const ART: Record<string, string> = {
  library: '/library.webp',
  fortress: '/fortress.webp',
  brothel: '/brothel.webp',
  tavern: '/tavern.webp',
  church: '/church.webp',
  market: '/market.webp',
  home: '/home.webp',
}

type Props = {
  playerCount: number
  burnedLocations?: string[]
  burnedCount?: number
}

export function VillageLocationStatus({ playerCount, burnedLocations = [], burnedCount = 0 }: Props) {
  const locations = [
    ...locationsFor(playerCount).map((loc) => ({ id: loc.id, name: loc.name })),
    { id: 'home', name: 'บ้าน' },
  ]

  return (
    <section className="bw-village-map" aria-label="สถานะสถานที่ในหมู่บ้าน">
      <div className="bw-section-label">
        <Flame size={17} />
        <h2>สถานที่ในหมู่บ้าน</h2>
        <span>{burnedCount} แห่งถูกเผา</span>
      </div>
      <div className="bw-place-grid">
        {locations.map((loc) => {
          const burned = burnedLocations.includes(loc.id)
          return (
            <div key={loc.id} className={`bw-place-tile ${burned ? 'is-burned' : ''}`}>
              {/* Use the same 7 WebP assets as the Night Key Action. */}
              <img
                src={ART[loc.id] ?? '/home.webp'}
                alt={loc.name}
                width={96}
                height={96}
                loading="lazy"
                decoding="async"
                className="bw-location-art"
                style={{ display: 'block', width: '100%', maxWidth: 88, height: 76, objectFit: 'contain', marginInline: 'auto' }}
              />
              <span>{loc.name}</span>
              <small>{loc.id === 'home' ? 'ปลอดภัย' : burned ? 'ถูกเผาแล้ว' : 'ยังไม่ถูกเผา'}</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}
