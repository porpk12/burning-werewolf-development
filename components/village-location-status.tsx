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
            <div key={loc.id} className={`bw-place-tile ${burned ? 'is-burned' : ''}`} style={{ position: 'relative', flex: '1 0 78px', minWidth: 78, minHeight: 46, flexDirection: 'column', gap: 3, padding: '7px 3px', fontSize: 11, background: burned ? '#241b19' : undefined, borderColor: burned ? '#8a4331' : undefined, color: burned ? '#9c8981' : undefined }} aria-label={`${loc.name}${burned ? ' ถูกเผาแล้ว' : ' ยังไม่ถูกเผา'}`}>
              <span style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', opacity: burned ? 0.45 : 1, filter: burned ? 'grayscale(1)' : 'none' }}>
                <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
              </span>
              {burned && <Flame size={13} strokeWidth={2.4} aria-hidden="true" style={{ position: 'absolute', top: 3, right: 5, color: '#ef784e', filter: 'drop-shadow(0 0 3px #d64d28)' }} />}
              <span>{loc.name}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
