'use client'

import { useEffect, useState } from 'react'

type Progress = { step: number; started: boolean; completed: boolean }
type Props = { roomCode: string; playerId: string; progress?: Progress }
const people = ['กานต์', 'มีน', 'ป่าน']
const places = ['ห้องสมุด', 'ป้อมปราการ', 'โรงเตี๊ยม', 'โบสถ์', 'อยู่บ้าน']
const titles = ['เปิดดูบทบาท', 'ทดลองโหวต', 'ดูผลการเนรเทศ', 'เลือกสถานที่กลางคืน', 'ทดลองเผาหมู่บ้าน', 'จดหมายและชัยชนะ']

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
    setStep(progress.step); setStarted(progress.started); setCompleted(progress.completed)
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
  const button = 'rounded-md border border-amber-500/70 px-3 py-2 text-sm disabled:opacity-40'
  return <section className="mt-5 rounded-xl border border-amber-600/60 bg-[#2b1c14] p-4" aria-label="เรียนรู้วิธีเล่น">
    {!open ? <>
      <h2 className="text-lg font-semibold text-amber-200">📖 เรียนรู้วิธีเล่นระหว่างรอ</h2>
      <p className="mt-2 text-sm text-[#dfc6ae]">ไม่ต้องอ่านคู่มือก่อน ลองกดเล่นสถานการณ์จำลองไปทีละขั้นได้เลย</p>
      <p className="mt-2 text-xs text-amber-300">{completed ? 'เรียนครบแล้ว ✓' : started ? `กำลังเรียนบทที่ ${step + 1}/6` : 'ยังไม่ได้เริ่มเรียน'}</p>
      <button type="button" className="mt-3 rounded bg-amber-500 px-4 py-2 font-semibold text-[#25140c]" onClick={async () => { if (!started && !await save({ step: 0, started: true, completed: false })) return; setOpen(true) }}>{completed ? 'ทบทวนบทเรียน' : started ? 'เรียนต่อ' : 'เริ่มเรียนรู้'}</button>
    </> : <>
      <div className="flex items-center justify-between gap-2"><strong className="text-amber-300">{completed ? 'เรียนครบแล้ว' : `บทที่ ${step + 1}/6`}</strong><button type="button" onClick={() => setOpen(false)} className={button}>กลับไปรอเกม ✕</button></div>
      <div className="mt-3 flex gap-1">{titles.map((t, i) => <div key={t} className={`h-1.5 flex-1 rounded ${i < step ? 'bg-emerald-500' : i === step ? 'bg-amber-400' : 'bg-[#604334]'}`} />)}</div>
      <h3 className="mt-4 text-xl font-semibold text-amber-100">{titles[step] ?? 'เรียนรู้ครบทั้ง 6 บทแล้ว!'}</h3>
      <div className="mt-3 rounded-lg border border-[#775037] bg-[#1b120f] p-4 text-sm leading-7">
        {step === 0 && <><p>คุณเป็นผู้เล่นในหมู่บ้าน มีชาวบ้านที่ต้องปกป้องสถานที่ และหมาป่าที่พยายามเผาหมู่บ้าน ลองเปิดการ์ดเพื่อดูบทบาทของคุณ</p><button className={`${button} mt-3`} onClick={() => setAction(1)}>🎴 เปิดการ์ดบทบาท</button>{action > 0 && <div className="mt-3 rounded border border-emerald-700 p-3"><strong>🏘️ ชาวบ้าน</strong><p>ชนะเมื่อเนรเทศหมาป่าครบ หรืออยู่รอดถึงคืนสุดท้ายโดยเหลือสถานที่มากกว่า 3 แห่ง ส่วนหมาป่าชนะเมื่อสถานที่เหลือไม่เกิน 3 หรือเผาสถานที่พิเศษสำเร็จ</p></div>}</>}
        {step === 1 && <><p>กลางวันคุณลงคะแนนได้สองแบบ ลองเลือกคนที่ไม่เชื่อใจ และคนที่เชื่อใจ (เลือก “ไม่มี” ได้) ห้ามเชื่อใจตัวเอง ส่วนหมาป่าห้ามเชื่อใจหมาป่าด้วยกัน</p><label className="mt-3 block text-amber-200">ไม่เชื่อใจ</label><select className="w-full rounded border border-amber-700 bg-[#281b16] p-2" value={distrust} onChange={e => { setDistrust(e.target.value); setAction(0) }}><option value="">เลือกผู้เล่น</option>{['ไม่มี', ...people].map(p => <option key={p}>{p}</option>)}</select><label className="mt-3 block text-amber-200">เชื่อใจ</label><select className="w-full rounded border border-amber-700 bg-[#281b16] p-2" value={trust} onChange={e => { setTrust(e.target.value); setAction(0) }}><option value="">เลือกผู้เล่น</option>{['ไม่มี', ...people].map(p => <option key={p}>{p}</option>)}</select><button disabled={!trust || !distrust} className={`${button} mt-3`} onClick={() => setAction(1)}>ส่งคะแนนจำลอง</button>{action > 0 && <p className="mt-3 text-emerald-300">✓ ส่งคะแนนแล้ว! ระหว่างเปิดโหวต คุณยังแก้ไขตัวเลือกและส่งใหม่ได้ ผลโหวตจริงจะเปิดเผยตามจังหวะที่ Moderator กำหนด</p>}</>}
        {step === 2 && <><p>Day 1 ยังไม่มีการเนรเทศ ตั้งแต่ Day 2 ผู้ที่มีคะแนนไม่เชื่อใจสูงสุดและคะแนนเชื่อใจเป็นศูนย์จะถูกเนรเทศได้ ลองเปิดผลคะแนน</p><button className={`${button} mt-3`} onClick={() => setAction(1)}>📊 เปิดผลโหวต</button>{action > 0 && <div className="mt-3"><p>กานต์: ไม่เชื่อใจ 3 / เชื่อใจ 0</p><p>มีน: ไม่เชื่อใจ 3 / เชื่อใจ 1</p><p>ป่าน: ไม่เชื่อใจ 2 / เชื่อใจ 0</p><p className="text-emerald-300">☠ กานต์ถูกเนรเทศ เพราะได้คะแนนไม่เชื่อใจสูงสุดร่วม และไม่มีใครเชื่อใจ</p></div>}</>}
        {step === 3 && <><p>กลางคืนเลือกสถานที่เพื่อใช้ความสามารถ แต่ละแห่งมีความจุจำกัด ห้องสมุดให้เบาะแส ป้อมปราการป้องกันการเผา โรงเตี๊ยมบอกจำนวนผู้เข้าพื้นที่ โบสถ์คุ้มครองการเนรเทศ และอยู่บ้านเพื่อรับจดหมาย (ตลาดมีในเกม 11–14 คน)</p><div className="mt-3 grid grid-cols-2 gap-2">{places.map(p => <button key={p} className={`${button} ${place === p ? 'bg-amber-900' : ''}`} onClick={() => { setPlace(p); setAction(1) }}>{p}</button>)}</div>{action > 0 && <p className="mt-3 text-emerald-300">✓ คุณเลือก {place} แล้ว! {place === 'ป้อมปราการ' ? 'ในเกมจริงคุณจะได้เลือกสถานที่ป้องกัน' : 'ในเกมจริงระบบจะตรวจความจุและแสดงผลความสามารถเมื่อถึงเวลา'}</p>}</>}
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
