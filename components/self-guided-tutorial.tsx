'use client'

import { useEffect, useState } from 'react'

type Progress = { step: number; started: boolean; completed: boolean }
type Props = { roomCode: string; playerId: string; progress?: Progress }
const people = ['กานต์', 'มีน', 'ป่าน']
const places = ['ห้องสมุด', 'ป้อมปราการ', 'ซ่อง', 'โรงเตี๊ยม', 'โบสถ์', 'ตลาด', 'อยู่บ้าน'] as const
const placeDetails: Record<(typeof places)[number], { icon: string; description: string; example: string }> = {
  'ห้องสมุด': { icon: '📚', description: 'รับเบาะแสแบบสุ่มในแต่ละคืน', example: 'ลองนึกภาพว่าคุณเปิดหนังสือแล้วพบเบาะแสเกี่ยวกับเหตุการณ์ในหมู่บ้าน' },
  'ป้อมปราการ': { icon: '🛡️', description: 'เลือกป้องกันสถานที่ 1 แห่งจากการเผาในคืนนั้น', example: 'หากหมาป่าพยายามเผาสถานที่ที่คุณป้องกัน การเผาจะไม่สำเร็จ' },
  'ซ่อง': { icon: '🔍', description: 'เลือกตรวจสอบผู้เล่น 1 คน เพื่อรู้ว่าเป็นหมาป่าหรือไม่', example: 'คุณเลือกชื่อผู้เล่น แล้ว Moderator แจ้งผลการตรวจสอบให้คุณทราบ' },
  'โรงเตี๊ยม': { icon: '🍺', description: 'ดูจำนวนผู้เล่นที่เดินทางไปยังสถานที่ต่าง ๆ', example: 'ข้อมูลผู้เข้าใช้สถานที่จะแสดงเป็นจำนวน โดยแบ่งข้อมูลออกเป็น 2 ส่วน' },
  'โบสถ์': { icon: '⛪', description: 'ได้รับการคุ้มครองจากการเนรเทศในวันถัดไป', example: 'หากคุณเข้าโบสถ์สำเร็จ การคุ้มครองจะมีผลเฉพาะวันถัดไป' },
  'ตลาด': { icon: '🛒', description: 'ได้รับคะแนนไม่เชื่อใจเพิ่มอีก 1 เสียงในวันถัดไป (รวมเป็น 2 เสียง)', example: 'สถานที่นี้ใช้ในเกม 11–14 คน แต่ทดลองเรียนรู้ได้ทุกคน' },
  'อยู่บ้าน': { icon: '🏠', description: 'ไม่เดินทางไปสถานที่อื่น และมีโอกาสได้รับจดหมายจากผู้ถูกเนรเทศ', example: 'หากมีจดหมายที่ผ่านการอนุมัติ ระบบจะสุ่มผู้รับจากคนที่อยู่บ้าน' },
}
const titles = ['เปิดดูบทบาท', 'ทดลองลงคะแนน', 'ดูผลการเนรเทศ', 'เลือกสถานที่กลางคืน', 'ทดลองเผาหมู่บ้าน', 'จดหมายและชัยชนะ']

export function SelfGuidedTutorial({ roomCode, playerId, progress }: Props) {
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState(0)
  const [started, setStarted] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [action, setAction] = useState(0)
  const [trust, setTrust] = useState('')
  const [distrust, setDistrust] = useState('')
  const [place, setPlace] = useState('')
  const [letter, setLetter] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    if (!progress) return
    setStep(Math.min(6, progress.step)); setStarted(progress.started); setCompleted(progress.completed)
  }, [playerId, progress?.step, progress?.started, progress?.completed])
  async function save(next: Progress) {
    setSaving(true); setError('')
    try {
      const response = await fetch('/api/tutorial-progress', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ code: roomCode, ...next }) })
      const result = await response.json()
      if (!response.ok) { setError(result.error ?? 'บันทึกไม่สำเร็จ'); if (response.status === 409) setOpen(false); return false }
      setStep(next.step); setStarted(next.started); setCompleted(next.completed)
      return true
    } catch { setError('เชื่อมต่อไม่สำเร็จ'); return false }
    finally { setSaving(false) }
  }
  async function next() {
    const nextStep = Math.min(6, step + 1)
    if (await save({ step: nextStep, started: true, completed: nextStep === 6 })) {
      setAction(0); setTrust(''); setDistrust(''); setPlace(''); setLetter('')
    }
  }
  async function previous() {
    if (saving || step <= 0) return
    if (await save({ step: step - 1, started: true, completed: false })) {
      setAction(0); setTrust(''); setDistrust(''); setPlace(''); setLetter('')
    }
  }
  async function restart() { if (await save({ step: 0, started: true, completed: false })) { setAction(0); setOpen(true) } }
  const button = 'bw-tutorial-button px-4 py-2.5 text-sm disabled:opacity-40'
  return <section className="bw-tutorial mt-5 p-4 sm:p-6" aria-label="เรียนรู้วิธีเล่น">
    {!open ? <>
      <button type="button" className="w-full rounded bg-amber-500 px-4 py-3 font-semibold text-[#25140c]" onClick={async () => { if (!started && !await save({ step: 0, started: true, completed: false })) return; setOpen(true) }}>📖 วิธีเล่น</button>
    </> : <>
      <div className="flex items-center justify-between gap-2"><strong className="text-amber-300">{completed ? 'เรียนครบแล้ว' : `บทที่ ${Math.min(step + 1, 6)}/6`}</strong><button type="button" onClick={() => setOpen(false)} className={button}>กลับไปรอเกม ✕</button></div>
      <div className="mt-3 flex gap-1">{titles.map((t, i) => <div key={t} className={`h-1.5 flex-1 rounded ${i < step ? 'bg-emerald-500' : i === step ? 'bg-amber-400' : 'bg-[#604334]'}`} />)}</div>
      <h3 className="mt-4 text-xl font-semibold text-amber-100">{titles[step] ?? 'เรียนรู้ครบทั้ง 6 บทแล้ว!'}</h3>
      <div className="bw-tutorial-paper mt-4 p-4 sm:p-6 text-sm leading-7">
        {step === 0 && <>
          <h4 className="font-semibold text-amber-200">วิธีชนะ</h4>
          <p>🏘️ <strong>ชาวบ้าน:</strong> เนรเทศหมาป่าทั้งหมด หรือรักษาสถานที่ให้เหลือมากกว่าเกณฑ์จนจบคืนสุดท้าย</p>
          <p>🐺 <strong>หมาป่า:</strong> เผาสถานที่จนเหลือตามเกณฑ์ หรือเผาสถานที่พิเศษหลังเปิดเผยในวันที่ 5</p>
          <h4 className="mt-3 font-semibold text-amber-200">บทบาท</h4>
          <p>กดเปิดการ์ดเพื่อดูบทบาทของคุณ</p>
          <button className={`${button} mt-3`} onClick={() => setAction(1)}>🎴 เปิดการ์ดบทบาท</button>
          {action > 0 && <div className="mt-3 rounded border border-emerald-700 p-3"><strong>🏘️ ชาวบ้าน</strong><p>คุณไม่มีพลังพิเศษ แต่ใช้การลงคะแนนและความสามารถของสถานที่เพื่อปกป้องหมู่บ้านได้</p><p className="mt-2 text-[#dfc6ae]">หมาป่าจะแฝงตัวอยู่ในหมู่บ้าน และสามารถเผาสถานที่ที่เข้าไปได้สำเร็จ</p></div>}
          <div className="mt-3 rounded border border-amber-600/50 bg-[#342217] p-3"><strong className="text-amber-200">🎯 ภารกิจลับ (เมื่อ Moderator เปิดใช้)</strong><p className="mt-1">ทุกคนได้รับภารกิจลับและติดตามความคืบหน้าได้</p><p className="mt-1"><strong>ชาวบ้าน:</strong> ต้องทำภารกิจลับให้สำเร็จจึงจะถือว่าเป็นผู้ชนะ เมื่อฝ่ายชาวบ้านชนะ</p><p><strong>หมาป่า:</strong> ได้รับภารกิจเช่นกัน แต่ไม่จำเป็นต้องทำเพื่อชนะ</p></div>
        </>}
        {step === 1 && <><p>กลางวันคุณลงคะแนนได้สองแบบ ลองเลือกคนที่ไม่เชื่อใจ และคนที่เชื่อใจ (เลือก “ไม่มี” ได้) ห้ามเชื่อใจตัวเอง ส่วนหมาป่าห้ามเชื่อใจหมาป่าด้วยกัน</p><label className="mt-3 block text-amber-200">ไม่เชื่อใจ</label><select className="w-full rounded border border-amber-700 bg-[#281b16] p-2" value={distrust} onChange={e => { setDistrust(e.target.value); setAction(0) }}><option value="">เลือกผู้เล่น</option>{['ไม่มี', ...people].map(p => <option key={p}>{p}</option>)}</select><label className="mt-3 block text-amber-200">เชื่อใจ</label><select className="w-full rounded border border-amber-700 bg-[#281b16] p-2" value={trust} onChange={e => { setTrust(e.target.value); setAction(0) }}><option value="">เลือกผู้เล่น</option>{['ไม่มี', ...people].map(p => <option key={p}>{p}</option>)}</select><button disabled={!trust || !distrust} className={`${button} mt-3`} onClick={() => setAction(1)}>ส่งคะแนนจำลอง</button>{action > 0 && <p className="mt-3 text-emerald-300">✓ ส่งคะแนนแล้ว! ระหว่างเปิดลงคะแนน คุณยังแก้ไขตัวเลือกและส่งใหม่ได้ ผลลงคะแนนจริงจะเปิดเผยตามจังหวะที่ Moderator กำหนด</p>}</>}
        {step === 2 && <>
          <h4 className="font-semibold text-amber-200">เงื่อนไขการเนรเทศ</h4>
          <ul className="list-disc pl-5"><li>มีคะแนนไม่เชื่อใจสูงสุด</li><li>ไม่มีคะแนนเชื่อใจเลย</li></ul>
          <p className="mt-2 text-xs text-[#bba393]">Day 1 ไม่มีการเนรเทศ · หากมีหลายคนที่ได้คะแนนไม่เชื่อใจสูงสุดและไม่มีคะแนนเชื่อใจ ทุกคนที่เข้าเงื่อนไขจะถูกเนรเทศ</p>
          <h4 className="mt-3 font-semibold text-amber-200">การเนรเทศ</h4>
          <ul className="list-disc pl-5"><li><strong>ชาวบ้าน:</strong> ไปหมู่บ้านข้างเคียง และส่งจดหมายได้คืนละ 1 ฉบับ</li><li><strong>หมาป่า:</strong> โชคร้าย! ถูกเนรเทศและไม่สามารถเผาหมู่บ้านได้อีก</li></ul>
          <button className={`${button} mt-3`} onClick={() => setAction(1)}>📊 ดูตัวอย่างผลการลงคะแนน</button>
          {action > 0 && <div className="mt-3"><p>กานต์: ไม่เชื่อใจ 3 / เชื่อใจ 0</p><p>มีน: ไม่เชื่อใจ 3 / เชื่อใจ 1</p><p>ป่าน: ไม่เชื่อใจ 2 / เชื่อใจ 0</p><p className="text-emerald-300">☠ กานต์ถูกเนรเทศ</p></div>}
        </>}
        {step === 3 && <>
          <p>คืนนี้คุณจะไปที่ไหน? ลองกดสถานที่เพื่อดูความสามารถได้เลย ไม่ต้องจำทั้งหมดในครั้งเดียว</p>
          <div className="mt-3 grid grid-cols-2 gap-2">{places.map(p => <button type="button" key={p} aria-pressed={place === p} className={`${button} text-left ${place === p ? 'bg-amber-900 ring-2 ring-amber-400' : ''}`} onClick={() => { setPlace(p); setAction(1) }}><span className="mr-1">{placeDetails[p].icon}</span>{p}{p === 'ตลาด' && <span className="mt-1 block text-xs text-amber-200/80">11–14 คน</span>}</button>)}</div>
          {place && <div className="mt-3 rounded-lg border border-amber-500/60 bg-[#342217] p-3" aria-live="polite">
            <strong className="text-base text-amber-200">{placeDetails[place as keyof typeof placeDetails].icon} {place}</strong>
            <p className="mt-2 font-medium text-amber-100">{placeDetails[place as keyof typeof placeDetails].description}</p>
            <p className="mt-2 text-[#dfc6ae]">{placeDetails[place as keyof typeof placeDetails].example}</p>
            <p className="mt-2 text-xs text-emerald-300">✓ เลือกดูสถานที่อื่นได้ หรือกดบทถัดไปเมื่อพร้อม</p>
          </div>}
          <p className="mt-3 text-xs text-[#bba393]">ในเกมจริงแต่ละสถานที่มีจำนวนผู้เข้าใช้จำกัด (ยกเว้นอยู่บ้าน) และระบบจะตรวจสอบสิทธิ์เมื่อปิดการเลือก</p>
        </>}
        {step === 4 && <><p>สมมติว่าคุณเป็นหมาป่า และเลือกเข้าไปในห้องสมุดสำเร็จ ลองเลือกว่าจะเผาหรือไม่ การเผาต้องมีผู้ลงมือเข้าไปถึงเป้าหมายจริงและไม่ถูกป้องกัน</p><div className="mt-3 flex gap-2"><button className={button} onClick={() => setAction(1)}>🔥 เผาห้องสมุด</button><button className={button} onClick={() => setAction(2)}>ไม่เผา</button></div>{action > 0 && <p className="mt-3 text-emerald-300">{action === 1 ? '🔥 เผาสำเร็จในสถานการณ์จำลอง เพราะหมาป่าเข้าไปถึงห้องสมุดและไม่มีการป้องกัน' : '🌙 คืนนี้ไม่เผา แต่หมาป่ายังสามารถใช้ความสามารถของสถานที่ที่เข้าไปได้'}</p>}</>}
        {step === 5 && <><p>ถ้าถูกเนรเทศ คุณยังส่งจดหมายได้คืนละหนึ่งฉบับ Moderator ต้องอนุมัติก่อนส่ง ผู้รับที่อยู่บ้านจะไม่เห็นชื่อผู้ส่ง ลองเขียนจดหมายสั้น ๆ</p><textarea className="mt-3 w-full rounded border border-amber-700 bg-[#281b16] p-2" rows={3} value={letter} onChange={e => { setLetter(e.target.value); setAction(0) }} placeholder="คืนนี้ฉันอยากเตือนให้ทุกคนระวัง..."/><button disabled={!letter.trim()} className={`${button} mt-2`} onClick={() => setAction(1)}>ส่งจดหมายจำลอง</button>{action > 0 && <p className="mt-3 text-emerald-300">✉️ ส่งให้ Moderator ตรวจแล้ว! ถ้าไม่มีคนอยู่บ้าน จดหมายที่อนุมัติจะรอส่งในคืนถัดไป</p>}</>}
        {step === 6 && <><p className="text-emerald-300">🎉 คุณพร้อมเข้าสู่เกมจริงแล้ว! รอ Moderator เริ่ม Night 0 ได้เลย</p><button className={`${button} mt-3`} onClick={() => void restart()}>เรียนใหม่ตั้งแต่ต้น</button></>}
      </div>
      {step > 0 && <button type="button" disabled={saving} className="mt-4 mr-2 rounded border border-amber-500/70 px-4 py-2 font-semibold text-amber-100 disabled:opacity-40" onClick={() => void previous()}>← บทก่อนหน้า</button>}
      {step < 6 && <button type="button" disabled={!action || saving} className="mt-4 rounded bg-amber-500 px-4 py-2 font-semibold text-[#25140c] disabled:opacity-40" onClick={() => void next()}>{step === 5 ? 'จบบทเรียน ✓' : 'เข้าใจแล้ว · บทถัดไป →'}</button>}
      <p className="mt-3 text-xs text-[#bba393]">ทุกกิจกรรมเป็นสถานการณ์จำลอง ไม่กระทบเกมจริง · เมื่อ Moderator เริ่ม Night 0 ทุกคนจะเข้าสู่หน้าเกมอัตโนมัติ</p>
    </>}
    {error && <p role="alert" className="mt-3 text-sm text-red-300">{error}</p>}
  </section>
}
