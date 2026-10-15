import { getVictory, type GameState } from './types'
export { getVictory }
export const describeVictory = (state: GameState) => { const winner = getVictory(state); return winner === 'werewolves' ? 'มนุษย์หมาป่าชนะ: เหลือสถานที่ไม่ไหม้ไม่เกิน 3 แห่ง' : winner === 'villagers' ? 'ชาวบ้านชนะ: หมาป่าถูกขับออกหรือครบ 7 คืน' : 'เกมยังดำเนินอยู่' }
