'use client'

import { useEffect, useState } from 'react'

type Lesson = { title: string; intro: string; prompt: string; options: string[]; answer: number; explanation: string }

const lessons: Lesson[] = [
  {
    title: 'รู้จักบทบาทและเป้าหมาย',
    intro: 'Burning Werewolf มีสองฝ่าย: ชาวบ้านและหมาป่า ชาวบ้านต้องรักษาหมู่บ้านให้รอด ส่วนหมาป่าต้องเผาสถานที่ หมาป่าที่ถูกเนรเทศทั้งหมดทำให้ชาวบ้านชนะทันที',
    prompt: 'ชาวบ้านจะชนะได้ในกรณีใด?',
    options: ['ต้องหาหมาป่าให้เจออย่างเดียว', 'เนรเทศหมาป่าครบ หรืออยู่รอดจนคืนสุดท้ายโดยมีสถานที่เหลือมากกว่า 3 แห่ง', 'ต้องเผาสถานที่ให้หมด'],
    answer: 1,
    explanation: 'ชาวบ้านไม่จำเป็นต้องเนรเทศหมาป่าทุกครั้ง หากอยู่รอดครบคืนตามจำนวนผู้เล่นและมีสถานที่ที่ไม่ถูกเผามากกว่า 3 แห่ง ก็ชนะได้',
  },
  {
    title: 'ทดลองลงคะแนนกลางวัน',
    intro: 'ทุกวันผู้เล่นมีคะแนน “ไม่เชื่อใจ” และ “เชื่อใจ” อย่างละ 1 คะแนน (ยกเว้นโบนัสจากตลาด) เลือก “ไม่มี” ได้ และแก้คะแนนได้จนกว่า Moderator จะปิดโหวต ห้ามเชื่อใจตัวเอง และหมาป่าห้ามเชื่อใจหมาป่าด้วยกัน',
    prompt: 'ถ้าคุณยังไม่แน่ใจว่าจะเชื่อใจใคร ควรทำอย่างไร?',
    options: ['เลือก “ไม่มี” ในช่องเชื่อใจ', 'เชื่อใจตัวเอง', 'กดเชื่อใจสองคน'],
    answer: 0,
    explanation: 'คุณเลือก “ไม่มี” ได้ทั้งการเชื่อใจและไม่เชื่อใจ และเปลี่ยนใจได้ตราบใดที่ยังเปิดโหวตอยู่',
  },
  {
    title: 'ทดลองการเนรเทศ',
    intro: 'Day 1 ยังไม่มีการเนรเทศ ตั้งแต่ Day 2 เป็นต้นไป ผู้ที่มีคะแนนไม่เชื่อใจสูงสุดร่วมกัน และมีคะแนนเชื่อใจเป็นศูนย์ จะถูกเนรเทศได้หลายคน',
    prompt: 'Day 2: กานต์ ไม่เชื่อใจ 3 / เชื่อใจ 0, มีน ไม่เชื่อใจ 3 / เชื่อใจ 1, ป่าน ไม่เชื่อใจ 2 / เชื่อใจ 0 ใครถูกเนรเทศ?',
    options: ['กานต์คนเดียว', 'กานต์กับมีน', 'กานต์กับป่าน'],
    answer: 0,
    explanation: 'กานต์และมีนได้คะแนนไม่เชื่อใจสูงสุดเท่ากัน แต่มีนได้รับคะแนนเชื่อใจ 1 จึงไม่ถูกเนรเทศ ส่วนป่านไม่ได้คะแนนไม่เชื่อใจสูงสุด',
  },
  {
    title: 'เลือกสถานที่ตอนกลางคืน',
    intro: 'กลางคืนผู้เล่นเลือกสถานที่เพื่อใช้ความสามารถ หรือเลือกอยู่บ้านได้ สถานที่มีความจุจำกัด เช่น ห้องสมุดรับได้ 2 คน หอคอยรับได้ 1 คน ถ้าคนเกินความจุอาจไม่ได้เข้าใช้สถานที่',
    prompt: 'หากต้องการป้องกันสถานที่หนึ่งแห่งจากการเผาในคืนนี้ ควรไปที่ไหน?',
    options: ['ห้องสมุด', 'หอคอย', 'โรงเตี๊ยม'],
    answer: 1,
    explanation: 'หอคอยให้เลือกสถานที่ 1 แห่งเพื่อป้องกันการเผาในคืนนั้น ห้องสมุดให้เบาะแส ส่วนโรงเตี๊ยมให้ข้อมูลจำนวนผู้เข้าพื้นที่',
  },
  {
    title: 'การเผาหมู่บ้าน',
    intro: 'หมาป่าสามารถพยายามเผาสถานที่ได้ในตอนกลางคืน แต่ผู้ลงมือเผาต้องเข้าไปยังสถานที่เป้าหมายจริง และสถานที่นั้นต้องไม่ถูกป้องกัน หมาป่าชนะเมื่อสถานที่ที่ยังไม่ถูกเผาเหลือไม่เกิน 3 แห่ง หรือเผาสถานที่พิเศษได้ตามเงื่อนไขช่วงท้ายเกม',
    prompt: 'หมาป่าเลือกเผาห้องสมุด แต่ไม่ได้เข้าไปในห้องสมุด จะเกิดอะไรขึ้น?',
    options: ['เผาสำเร็จทันที', 'เผาไม่สำเร็จ', 'ชาวบ้านถูกเนรเทศ'],
    answer: 1,
    explanation: 'การเผาต้องมีหมาป่าผู้ลงมืออยู่ในสถานที่เป้าหมายจริง หากเข้าไม่ได้ การเผาไม่สำเร็จ',
  },
  {
    title: 'จดหมายและเงื่อนไขชนะ',
    intro: 'ผู้ถูกเนรเทศย้ายไปอยู่หมู่บ้านข้าง ๆ และส่งจดหมายได้คืนละ 1 ฉบับ โดย Moderator ตรวจอนุมัติก่อนส่ง จดหมายจะส่งแบบไม่เปิดเผยผู้เขียนไปยังผู้เล่นที่อยู่บ้าน',
    prompt: 'ถ้าคืนนี้ไม่มีผู้เล่นเลือกอยู่บ้าน จดหมายที่อนุมัติแล้วจะเป็นอย่างไร?',
    options: ['ถูกลบทิ้งทันที', 'ส่งให้หมาป่าโดยอัตโนมัติ', 'เข้าคิวรอส่งเมื่อมีผู้เล่นอยู่บ้าน'],
    answer: 2,
    explanation: 'จดหมายจะรอส่งเมื่อมีผู้เล่นอยู่บ้านในคืนถัดไป ผู้รับไม่เห็นชื่อผู้ส่ง แต่ Moderator ทราบว่าใครเป็นผู้เขียน',
  },
]

type Progress = { lesson: number; completed: number[] }

export function SelfGuidedTutorial({ roomCode, playerId }: { roomCode: string; playerId: string }) {
  const storageKey = `bw_tutorial_v1:${roomCode}:${playerId}`
  const [open, setOpen] = useState(false)
  const [progress, setProgress] = useState<Progress>({ lesson: 0, completed: [] })
  const [loaded, setLoaded] = useState(false)
  const [choice, setChoice] = useState<number | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    setLoaded(false)
    try {
      const raw = window.localStorage.getItem(storageKey)
      if (raw) {
        const saved: unknown = JSON.parse(raw)
        if (saved && typeof saved === 'object' && 'lesson' in saved && 'completed' in saved) {
          const value = saved as Progress
          if (Number.isInteger(value.lesson) && value.lesson >= 0 && value.lesson < lessons.length && Array.isArray(value.completed)) {
            setProgress({ lesson: value.lesson, completed: value.completed.filter(n => Number.isInteger(n) && n >= 0 && n < lessons.length) })
          }
        }
      } else setProgress({ lesson: 0, completed: [] })
    } catch { setProgress({ lesson: 0, completed: [] }) }
    setChoice(null)
    setRevealed(false)
    setLoaded(true)
  }, [storageKey])

  useEffect(() => {
    if (!loaded) return
    try { window.localStorage.setItem(storageKey, JSON.stringify(progress)) } catch { /* Browser may block local storage */ }
  }, [storageKey, progress, loaded])

  const current = lessons[progress.lesson]
  const isComplete = progress.completed.includes(progress.lesson)
  const allDone = progress.completed.length === lessons.length

  function move(to: number) {
    setProgress(prev => ({ ...prev, lesson: Math.max(0, Math.min(lessons.length - 1, to)) }))
    setChoice(null)
    setRevealed(false)
  }
  function checkAnswer() {
    if (choice === null) return
    setRevealed(true)
    if (choice === current.answer) setProgress(prev => ({ ...prev, completed: Array.from(new Set([...prev.completed, prev.lesson])) }))
  }
  function restartTutorial() {
    setProgress({ lesson: 0, completed: [] })
    setChoice(null)
    setRevealed(false)
  }

  return <section className="mt-5 rounded-xl border border-amber-600/60 bg-[#2b1c14] p-4" aria-label="เรียนรู้วิธีเล่น">
    {!open ? <>
      <p className="text-lg font-semibold text-amber-200">📖 เรียนรู้วิธีเล่นระหว่างรอ</p>
      <p className="mt-2 text-sm text-[#dfc6ae]">ฝึกเล่นด้วยตัวเอง 6 บท ไม่ต้องรอ Moderator และไม่กระทบเกมจริง</p>
      <p className="mt-2 text-xs text-amber-300">{allDone ? 'เรียนครบทั้ง 6 บทแล้ว ✓' : `เรียนแล้ว ${progress.completed.length}/6 บท · กลับมาเรียนต่อได้`}</p>
      <button type="button" onClick={() => setOpen(true)} className="mt-3 rounded-md bg-amber-500 px-4 py-2 font-semibold text-[#25140c]">{allDone ? 'ทบทวนบทเรียน' : progress.completed.length ? 'เรียนต่อ' : 'เริ่มเรียนรู้วิธีเล่น'}</button>
    </> : <>
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-amber-300">TUTORIAL · บทที่ {progress.lesson + 1}/6</p>
        <button type="button" onClick={() => setOpen(false)} className="rounded border border-[#88684b] px-3 py-1 text-xs">กลับไปรอเกม ✕</button>
      </div>
      <div className="mt-3 flex gap-1" aria-label={`เรียนสำเร็จ ${progress.completed.length} จาก 6 บท`}>
        {lessons.map((item, index) => <div key={item.title} className={`h-1.5 flex-1 rounded ${progress.completed.includes(index) ? 'bg-emerald-500' : index === progress.lesson ? 'bg-amber-400' : 'bg-[#5d4030]'}`} />)}
      </div>
      <h2 className="mt-4 text-xl font-semibold text-amber-100">{current.title}</h2>
      <p className="mt-3 text-sm leading-7 text-[#e6d4c3]">{current.intro}</p>
      <div className="mt-4 rounded-lg border border-[#775037] bg-[#1b120f] p-4">
        <p className="font-medium text-amber-200">ลองตอบคำถาม</p>
        <p className="mt-2 text-sm leading-6">{current.prompt}</p>
        <div className="mt-3 space-y-2">{current.options.map((option, index) => <button key={option} type="button" disabled={revealed || isComplete} onClick={() => setChoice(index)} aria-pressed={choice === index} className={`block w-full rounded-md border px-3 py-3 text-left text-sm disabled:cursor-default ${choice === index ? 'border-amber-400 bg-[#49301b]' : 'border-[#5c4436] bg-[#281b16]'}`}>{option}</button>)}</div>
        {!isComplete && !revealed && <button type="button" disabled={choice === null} onClick={checkAnswer} className="mt-3 rounded-md bg-amber-500 px-4 py-2 text-sm font-semibold text-[#25140c] disabled:opacity-40">ตรวจคำตอบ</button>}
        {revealed && choice !== current.answer && <div role="status" className="mt-3 rounded border border-red-500/50 bg-red-950/30 p-3 text-sm"><p className="text-red-200">ยังไม่ถูก ลองอีกครั้งได้เลย</p><button type="button" className="mt-2 underline" onClick={() => { setRevealed(false); setChoice(null) }}>ลองตอบใหม่</button></div>}
        {(isComplete || (revealed && choice === current.answer)) && <div role="status" className="mt-3 rounded border border-emerald-600/50 bg-emerald-950/30 p-3 text-sm"><p className="font-semibold text-emerald-300">✓ ถูกต้อง!</p><p className="mt-1 leading-6">{current.explanation}</p></div>}
      </div>
      <div className="mt-4 flex flex-wrap justify-between gap-2">
        <button type="button" disabled={progress.lesson === 0} onClick={() => move(progress.lesson - 1)} className="rounded border border-[#88684b] px-3 py-2 text-sm disabled:opacity-40">← บทก่อนหน้า</button>
        {progress.lesson < lessons.length - 1 ? <button type="button" disabled={!isComplete} onClick={() => move(progress.lesson + 1)} className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-[#25140c] disabled:opacity-40">บทถัดไป →</button> : allDone ? <button type="button" onClick={() => setOpen(false)} className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">เรียนครบแล้ว · กลับไปรอเกม</button> : <p className="text-sm text-[#cbb6a4]">ตอบให้ถูกเพื่อจบบทสุดท้าย</p>}
      </div>
      {allDone && <div className="mt-4 border-t border-[#775037] pt-3"><p className="text-sm text-emerald-300">🎉 เรียนครบแล้ว! รอ Moderator เริ่มเกมจริงได้เลย</p><button type="button" onClick={restartTutorial} className="mt-2 text-sm text-amber-300 underline">เริ่มเรียนใหม่ทั้ง 6 บท</button></div>}
      <p className="mt-3 text-xs text-[#bba393]">ความคืบหน้าบันทึกเฉพาะบนเบราว์เซอร์นี้ · คำตอบเป็นสถานการณ์จำลอง ไม่ใช่ข้อมูลเกมจริง</p>
    </>}
  </section>
}
