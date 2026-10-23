import { Flame } from 'lucide-react'
import { LocationArt } from '@/components/location-art'
import { locationsFor } from '@/lib/night-locations'

export function VillageLocationStatus({ playerCount, burnedLocations = [], burnedCount = 0 }: {playerCount:number; burnedLocations?:string[]; burnedCount?:number}) {
  const locations = [...locationsFor(playerCount).map(loc => ({id:loc.id,name:loc.name})),{id:'home',name:'บ้าน'}]
  return <section className="bw-village-map" aria-label="สถานะสถานที่ในหมู่บ้าน">
    <div className="bw-section-label"><Flame size={17}/><h2>สถานที่ในหมู่บ้าน</h2><span>{burnedCount} แห่งถูกเผา</span></div>
    <div className="bw-place-grid">{locations.map(loc => {const burned = burnedLocations.includes(loc.id); return <div key={loc.id} className={`bw-place-tile ${burned?'is-burned':''}`}><LocationArt id={loc.id} name={loc.name}/><span>{loc.name}</span><small>{loc.id==='home'?'ปลอดภัย':burned?'ถูกเผาแล้ว':'ยังไม่ถูกเผา'}</small></div>})}</div>
  </section>
}
