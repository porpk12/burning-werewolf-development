export const LOCATIONS = [
  { id: 'library', name: 'ห้องสมุด', icon: '📚', description: 'ได้รับเบาะแสลึกลับ', small: 2, large: 2 },
  { id: 'fortress', name: 'ป้อมปราการ', icon: '🏰', description: 'เลือกสถานที่ที่จะปกป้องไม่ให้ถูกเผา', small: 1, large: 1 },
  { id: 'brothel', name: 'ซ่อง', icon: '🍷', description: '', small: 2, large: 2 },
  { id: 'tavern', name: 'โรงเตี๊ยม', icon: '🍺', description: 'รับรู้ว่าเมื่อคืนแต่ละสถานที่มีผู้เข้าใช้งานทั้งสิ้นกี่คน', small: 2, large: 2 },
  { id: 'church', name: 'โบสถ์', icon: '⛪', description: 'ได้รับการป้องกันจากการถูกเนรเทศในเช้าวันถัดไป', small: 1, large: 2 },
  { id: 'market', name: 'ตลาด', icon: '🛒', description: 'ได้รับสิทธิ์ลงคะแนนไม่เชื่อใจเพิ่มอีก 1 คะแนน', small: 0, large: 1 },
] as const
export function locationsFor(count: number) {
  if (count <= 7) return LOCATIONS.filter(x => ['library','fortress','brothel','tavern'].includes(x.id)).map(x => ({ ...x, capacity: x.id === 'library' ? 2 : 1 }))
  return LOCATIONS.filter(x => count >= 11 ? x.large > 0 : x.small > 0).map(x => ({ ...x, capacity: count >= 11 ? x.large : x.small }))
}
export function gameLimits(count: number) { return count <= 7 ? { nights: 5, locations: 4, remaining: 2 } : count <= 10 ? { nights: 6, locations: 5, remaining: 3 } : { nights: 7, locations: 6, remaining: 3 } }
