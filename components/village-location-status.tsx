import { BookOpen, Castle, Wine, Beer, Church, Store, Flame, type LucideIcon } from 'lucide-react'
import { locationsFor } from '@/lib/night-locations'

const iconByName: Record<string, LucideIcon> = {
  'ห้องสมุด': BookOpen,
  'ป้อมปราการ': Castle,
  'ซ่อง': Wine,
  'โรงเตี๊ยม': Beer,
  'โบสถ์': Church,
  'ตลาด': Store,
}

export function VillageLocationStatus({ playerCount, burnedLocations = [], burnedCount = 0 }: { playerCount: number; burnedLocations?: string[]; burnedCount?: number }) {
  const locations = locationsFor(playerCount)

  return (
    <section className="bw-village-map" aria-label="สถานะสถานที่ในหมู่บ้าน">
      <div className="bw-section-label">
        <Flame size={17} />
        <h2>สถานที่ในหมู่บ้าน</h2>
        <span>{burnedCount} แห่งถูกเผา</span>
      </div>
      <div className="bw-place-grid" style={{ display: 'flex', flexWrap: 'nowrap', overflowX: 'auto', gap: 6, paddingBottom: 3 }}>
        {locations.map(loc => {
          const burned = burnedLocations.includes(loc.id)
          const Icon = iconByName[loc.name] ?? BookOpen
          return (
            <div key={loc.id} className={`bw-place-tile ${burned ? 'is-burned' : ''}`} style={{ flex: '1 0 78px', minWidth: 78, minHeight: 52, flexDirection: 'column', gap: 2, padding: '5px 3px', fontSize: 11 }}>
              <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              <span>{loc.name}</span>
              <small style={{ fontSize: 9, whiteSpace: 'nowrap' }}>{burned ? 'ถูกเผาแล้ว' : 'ยังไม่ถูกเผา'}</small>
            </div>
          )
        })}
      </div>
    </section>
  )
}
