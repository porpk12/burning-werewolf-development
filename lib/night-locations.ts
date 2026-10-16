export const LOCATIONS = [
  { id: 'library', name: 'ห้องสมุด', icon: '📚', description: 'รับเบาะแสลึกลับหนึ่งชิ้น โดยไม่รู้ล่วงหน้าว่าจะได้ข้อมูลอะไร', small: 2, large: 2 },
  { id: 'fortress', name: 'ป้อมปราการ', icon: '🏰', description: 'เลือกปกป้องสถานที่หนึ่งแห่งจากการถูกเผาในคืนนี้', small: 1, large: 1 },
  { id: 'brothel', name: 'ซ่อง', icon: '🍷', description: 'เลือกตรวจสอบผู้เล่นหนึ่งคนว่าเป็นหมาป่าหรือไม่', small: 2, large: 2 },
  { id: 'tavern', name: 'โรงเตี๊ยม', icon: '🍺', description: 'รับข้อมูลจำนวนผู้เลือกสถานที่บางส่วน โดยสุ่มแบ่งเป็นสองส่วน', small: 2, large: 2 },
  { id: 'church', name: 'โบสถ์', icon: '⛪', description: 'ได้รับสิทธิ์ป้องกันการถูกเนรเทศในวันถัดไป', small: 1, large: 2 },
  { id: 'market', name: 'ตลาด', icon: '🛒', description: 'ได้รับสิทธิ์โหวตไม่เชื่อใจเพิ่มหนึ่งเสียงในวันถัดไป', small: 1, large: 1 },
] as const
export function locationsFor(count: number) { return LOCATIONS.filter(x => count >= 11 ? x.large > 0 : x.small > 0).map(x => ({ ...x, capacity: count >= 11 ? x.large : x.small })) }
