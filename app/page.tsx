'use client'

import { useEffect, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  ChevronRight,
  CircleHelp,
  Flame,
  Gamepad2,
  LayoutDashboard,
  LockKeyhole,
  MapPin,
  Menu,
  Moon,
  Plus,
  ScrollText,
  Settings2,
  Shield,
  Sparkles,
  Swords,
  Users,
  WandSparkles,
  X,
} from 'lucide-react'
import { Anuphan } from 'next/font/google'
import { Button } from '@/components/ui/button'
import { RoomControls } from '@/components/room-controls'

const anuphan = Anuphan({ subsets: ['thai', 'latin'], variable: '--font-anuphan' })

type StudioTab = 'overview' | 'locations' | 'abilities'

const locations = [
  { name: 'ห้องสมุด', meta: 'ความจุ 2 คน · รับเบาะแสแบบสุ่ม', icon: BookOpen, color: 'gold' },
  { name: 'ป้อมปราการ', meta: 'ความจุ 1 คน · ป้องกันสถานที่หนึ่งแห่ง', icon: Shield, color: 'ember' },
  { name: 'ซ่อง', meta: 'ความจุ 2 คน · ตรวจสอบตัวตนผู้เล่น', icon: Users, color: 'crimson' },
  { name: 'โรงเตี๊ยม', meta: 'ความจุ 2 คน · ดูจำนวนผู้เข้าสถานที่', icon: MapPin, color: 'gold' },
  { name: 'โบสถ์', meta: 'ความจุ 1–2 คน · คุ้มครองจากการเนรเทศวันถัดไป', icon: Sparkles, color: 'ember' },
  { name: 'ตลาด', meta: 'สำหรับ 11–14 คน · เพิ่มคะแนนไม่เชื่อใจ 1 คะแนน', icon: Swords, color: 'crimson' },
  { name: 'อยู่บ้าน', meta: 'ไม่จำกัดจำนวน · อาจได้รับจดหมายจากหมู่บ้านข้าง ๆ', icon: Moon, color: 'gold' },
]

type SavedRoom = { game: { room_code: string; room_name: string; phase: string; round_number: number; player_limit: number | null }; player: { display_name: string } }

function BrandMark() {
  return (
    <div className="flex items-center gap-3">
      <div className="brand-mark"><Flame aria-hidden="true" /></div>
      <div>
        <p className="font-display text-[17px] font-semibold tracking-[0.08em] text-[#f2e4c9]">BURNING</p>
        <p className="-mt-1 text-[10px] font-medium tracking-[0.33em] text-[#d4a65a]">WEREWOLF</p>
      </div>
    </div>
  )
}

function StatusPill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'ember' | 'gold' | 'crimson' }) {
  return <span className={`status-pill status-${tone}`}>{children}</span>
}

function LocationCard({ location }: { location: (typeof locations)[number] }) {
  const Icon = location.icon
  return (
    <div className="location-card group">
      <div className={`location-icon location-${location.color}`}><Icon aria-hidden="true" /></div>
      <div className="min-w-0 flex-1">
        <p className="font-display text-sm font-semibold text-[#f2e4c9]">{location.name}</p>
        <p className="mt-1 truncate text-xs text-[#988c83]">{location.meta}</p>
      </div>
      <ChevronRight aria-hidden="true" className="size-4 text-[#665f5b] transition-transform group-hover:translate-x-1 group-hover:text-[#f97316]" />
    </div>
  )
}

export default function Page() {
  const [activeTab, setActiveTab] = useState<StudioTab>('overview')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeSection, setActiveSection] = useState('dashboard')
  const [guideOpen, setGuideOpen] = useState(false)
  const [savedRoom, setSavedRoom] = useState<SavedRoom | null>(null)
  const [roomLoading, setRoomLoading] = useState(true)
  useEffect(() => {
    const code = window.localStorage.getItem('bwf_last_room')
    if (!code || !/^[A-Z0-9]{6}$/.test(code)) { setRoomLoading(false); return }
    fetch(`/api/rooms?code=${encodeURIComponent(code)}`, { cache: 'no-store' })
      .then(async (response) => { if (response.ok) setSavedRoom(await response.json()); else setSavedRoom(null) })
      .catch(() => setSavedRoom(null)).finally(() => setRoomLoading(false))
  }, [])

  const [activeTop, setActiveTop] = useState<'dashboard' | 'portal' | 'studio'>('dashboard')

  const navigateTo = (section: string, tab?: StudioTab) => {
    if (tab) setActiveTab(tab)
    setActiveSection(section)
    setActiveTop(['rules', 'locations', 'abilities', 'howto', 'studio'].includes(section) ? 'studio' : ['players', 'portal', 'join', 'history'].includes(section) ? 'portal' : 'dashboard')
    setMobileOpen(false)
    // The guide uses one section with three independently selectable panels.
    const target = tab ? 'studio' : section === 'join' ? 'portal' : section === 'players' ? 'players' : section === 'history' ? 'history' : section
    window.requestAnimationFrame(() => {
      document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  useEffect(() => {
    let ticking = false
    const update = () => {
      ticking = false
      let current = 'dashboard'
      for (const id of ['dashboard', 'portal', 'players', 'history', 'studio']) {
        if (document.getElementById(id)?.getBoundingClientRect().top! <= 180) current = id
      }
      setActiveTop(current === 'studio' ? 'studio' : ['portal','players','history'].includes(current) ? 'portal' : 'dashboard')
      setActiveSection(current === 'studio' ? (prev) => ['rules','locations','abilities','howto'].includes(prev) ? prev : 'rules' : current)
    }
    const onScroll = () => { if (!ticking) { ticking = true; window.requestAnimationFrame(update) } }
    window.addEventListener('scroll', onScroll, { passive: true })
    update()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <main className={`${anuphan.variable} app-shell`}>
      <div className="ember-field" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
      <nav className="topbar">
        <BrandMark />
        <div className="hidden items-center gap-8 md:flex">
          <button type="button" className={`top-link ${activeTop === 'dashboard' ? 'active' : ''}`} aria-current={activeTop === 'dashboard' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigateTo('dashboard') }}>ภาพรวม</button>
          <button type="button" className={`top-link ${activeTop === 'portal' ? 'active' : ''}`} aria-current={activeTop === 'portal' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigateTo('portal') }}>พอร์ทัลผู้เล่น</button>
          <button type="button" className={`top-link ${activeTop === 'studio' ? 'active' : ''}`} aria-current={activeTop === 'studio' ? 'page' : undefined} onClick={(event) => { event.preventDefault(); navigateTo('howto', 'overview') }}>คู่มือเกม</button>
        </div>
        <div className="flex items-center gap-3">
          <RoomControls trigger="header" />
          <button type="button" className="hidden h-9 items-center rounded-md border border-[#5e4737] bg-[#2a201d] px-4 text-xs text-[#d4a65a] sm:flex" onClick={() => setGuideOpen(true)}><CircleHelp className="mr-2 size-4" /> วิธีเล่น</button>
          <button aria-label="เปิดเมนู" className="menu-button md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </nav>
      {mobileOpen && <div className="mobile-menu"><button type="button" className={activeTop === 'dashboard' ? 'active' : ''} onClick={(event) => { event.preventDefault(); navigateTo('dashboard') }}>ภาพรวม</button><button type="button" className={activeTop === 'portal' ? 'active' : ''} onClick={(event) => { event.preventDefault(); navigateTo('portal') }}>พอร์ทัลผู้เล่น</button><button type="button" className={activeTop === 'studio' ? 'active' : ''} onClick={(event) => { event.preventDefault(); navigateTo('howto', 'overview') }}>คู่มือเกม</button></div>}

      <div className="page-grid">
        <aside className="sidebar-panel hidden lg:block">
          <div className="sidebar-label">ประตูสู่หมู่บ้าน</div>
          <a className={`side-link ${activeSection === 'dashboard' ? 'selected' : ''}`} href="#dashboard" onClick={(event) => { event.preventDefault(); navigateTo('dashboard') }}><LayoutDashboard /> แดชบอร์ด <span className="side-count">01</span></a>
          <a className={`side-link ${activeSection === 'rules' ? 'selected' : ''}`} href="#studio" onClick={(event) => { event.preventDefault(); navigateTo('rules', 'overview') }}><ScrollText /> กติกา</a>
          <a className={`side-link ${activeSection === 'locations' ? 'selected' : ''}`} href="#studio" onClick={(event) => { event.preventDefault(); navigateTo('locations', 'locations') }}><MapPin /> สถานที่</a>
          <a className={`side-link ${activeSection === 'abilities' ? 'selected' : ''}`} href="#studio" onClick={(event) => { event.preventDefault(); navigateTo('abilities', 'abilities') }}><WandSparkles /> ความสามารถ</a>
          <a className={`side-link ${activeSection === 'players' ? 'selected' : ''}`} href="#portal" onClick={(event) => { event.preventDefault(); navigateTo('players') }}><Users /> ผู้เล่น</a>
          <div className="sidebar-divider" />
          <div className="sidebar-label">ระบบเกม</div>
          <a className={`side-link ${activeSection === 'join' ? 'selected' : ''}`} href="#join-game" onClick={(event) => { event.preventDefault(); navigateTo('join') }}><Gamepad2 /> เข้าร่วมเกม</a>
          <a className={`side-link ${activeSection === 'history' ? 'selected' : ''}`} href="#history" onClick={(event) => { event.preventDefault(); navigateTo('history') }}><BarChart3 /> ประวัติเกม</a>
          <div className="sidebar-bottom"><div className="avatar">ม</div><div><p className="text-xs font-semibold text-[#f2e4c9]">ผู้มาเยือน</p><p className="mt-0.5 text-[10px] text-[#83776f]">Burning Werewolf</p></div><ChevronRight className="ml-auto size-4 text-[#665f5b]" /></div>
        </aside>

        <section className="content-area" id="dashboard">
          <div className="section-heading"><div><p className="eyebrow">THE BURNING VILLAGE · BURNING WEREWOLF</p><h1>หมู่บ้านกำลังลุกไหม้</h1><p className="lede">เมื่อความไว้วางใจคือสิ่งเดียวที่เหลืออยู่ และเปลวไฟอาจเผาผลาญทุกสิ่งที่คุณเชื่อ</p></div></div>

          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon ember-icon"><Flame /></div><div><p className="stat-label">ห้องของคุณ</p><p className="stat-value">{roomLoading ? '…' : savedRoom ? savedRoom.game.room_code : '—'}</p><p className="stat-note">{savedRoom ? savedRoom.game.room_name : 'สร้างห้องหรือเข้าร่วมเพื่อเริ่มเล่น'}</p></div></div>
            <div className="stat-card"><div className="stat-icon gold-icon"><Users /></div><div><p className="stat-label">ตัวตนในห้อง</p><p className="stat-value">{savedRoom?.player.display_name ?? '—'}</p><p className="stat-note">{savedRoom ? 'เชื่อมต่อห้องเดิมได้' : 'ยังไม่มีห้องที่เข้าร่วมในอุปกรณ์นี้'}</p></div></div>
            <div className="stat-card"><div className="stat-icon crimson-icon"><Moon /></div><div><p className="stat-label">ช่วงเกมปัจจุบัน</p><p className="stat-value">{savedRoom ? savedRoom.game.phase === 'lobby' ? 'Lobby' : `รอบ ${savedRoom.game.round_number}` : '—'}</p><p className="stat-note">{savedRoom ? 'ข้อมูลจากห้องที่คุณเข้าร่วมจริง' : 'ไม่มีข้อมูลเกมจำลอง'}</p></div></div>
          </div>

          <div className="dashboard-grid" id="portal">
            <div className="panel game-panel"><div className="panel-header"><div><p className="eyebrow">พอร์ทัลผู้เล่น</p><h2>เข้าสู่หมู่บ้าน</h2></div><StatusPill tone={savedRoom ? 'ember' : 'neutral'}>{savedRoom ? 'มีห้องที่เข้าร่วม' : 'พร้อมเริ่มต้น'}</StatusPill></div><div className="game-hero"><div className="game-hero-content"><p className="text-xs tracking-[0.14em] text-[#d4a65a]">{savedRoom ? `ห้อง #${savedRoom.game.room_code}` : 'BURNING WEREWOLF'}</p><p className="mt-2 font-display text-2xl font-semibold text-[#f2e4c9]">{savedRoom ? savedRoom.game.room_name : 'ความลับเริ่มต้นที่นี่'}</p><p className="mt-1 text-sm text-[#b7aaa0]">{savedRoom ? 'กลับไปยังเกมที่คุณเข้าร่วมได้' : 'สร้างห้องหรือกรอกรหัสเพื่อเข้าร่วมเกมกับเพื่อน'}</p></div><div className="phase-mark"><Moon /></div></div><div className="game-meta"><div><span className="meta-label">รูปแบบเกม</span><span className="meta-value">Social Deduction</span></div><div><span className="meta-label">ฝ่าย</span><span className="meta-value">ชาวบ้าน / หมาป่า</span></div><div><span className="meta-label">ข้อมูลเกม</span><span className="meta-value">{savedRoom ? 'ห้องจริง' : 'ยังไม่ได้เข้าร่วม'}</span></div></div><div className="panel-footer"><RoomControls /><a className="text-button" href="#studio" onClick={(event) => { event.preventDefault(); navigateTo('howto', 'overview') }}>อ่านวิธีเล่น <ArrowRight aria-hidden="true" /></a>{savedRoom && <a className="secondary-button inline-flex items-center justify-center rounded-md px-4 py-2" href={`/lobby/${savedRoom.game.room_code}`}>กลับเข้าห้อง</a>}</div></div>
            <div className="panel locations-panel"><div className="panel-header"><div><p className="eyebrow">สถานที่ตามกติกาจริง</p><h2>สถานที่ในหมู่บ้าน</h2></div><MapPin className="size-5 text-[#d4a65a]" /></div><div className="location-list">{locations.slice(0,4).map((location) => <LocationCard key={location.name} location={location} />)}</div><a className="text-button mt-4" href="#studio" onClick={() => setActiveTab('locations')}>ดูสถานที่ทั้งหมด <ArrowRight aria-hidden="true" /></a></div>
          </div>
          <div className="lower-grid" id="players"><div className="panel"><div className="panel-header"><div><p className="eyebrow">การเข้าร่วม</p><h2>ห้องเกมของคุณ</h2></div></div><div className="player-list">{savedRoom ? <div className="player-row"><div className="player-avatar avatar-ember">{savedRoom.player.display_name.charAt(0)}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#f2e4c9]">{savedRoom.player.display_name}</p><p className="text-xs text-[#83776f]">{savedRoom.game.room_name} · {savedRoom.game.room_code}</p></div><StatusPill tone="ember">เข้าร่วมแล้ว</StatusPill></div> : <p className="text-sm text-[#b7aaa0]">ยังไม่มีห้องที่คุณเข้าร่วมในอุปกรณ์นี้ ข้อมูลผู้เล่นและบทบาทจะไม่แสดงบนหน้าสาธารณะ</p>}</div></div><div className="panel activity-panel"><div className="panel-header"><div><p className="eyebrow">สิ่งที่ควรรู้</p><h2>ก่อนเปลวไฟลุกขึ้น</h2></div><ScrollText className="size-5 text-[#d4a65a]" /></div><div className="activity-list"><div className="activity-item"><span className="activity-line ember-line" /><div><p className="text-sm text-[#d8cabe]">กลางวัน: ลงคะแนนเชื่อใจและไม่เชื่อใจ</p><p className="text-xs text-[#83776f]">แก้ไขคะแนนได้ก่อน Moderator ปิดโหวต</p></div></div><div className="activity-item"><span className="activity-line gold-line" /><div><p className="text-sm text-[#d8cabe]">กลางคืน: เลือกสถานที่เพื่อใช้ความสามารถ</p><p className="text-xs text-[#83776f]">จำนวนที่รองรับขึ้นอยู่กับสถานที่</p></div></div><div className="activity-item"><span className="activity-line crimson-line" /><div><p className="text-sm text-[#d8cabe]">ชาวบ้านต้องปกป้องหมู่บ้านจากเปลวไฟ</p><p className="text-xs text-[#83776f]">หมาป่าต้องทำให้หมู่บ้านพ่ายแพ้</p></div></div></div></div></div>

          <section className="panel bw-history-panel" id="history"><div className="panel-header"><div><p className="eyebrow">ประวัติของผู้เล่น</p><h2>ห้องล่าสุดของคุณ</h2></div></div>{savedRoom ? <div className="player-row"><div className="player-avatar avatar-ember"><Flame /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#f2e4c9]">{savedRoom.game.room_name}</p><p className="text-xs text-[#83776f]">รหัส {savedRoom.game.room_code} · {savedRoom.player.display_name}</p></div><a className="secondary-button rounded-md px-3 py-2 text-xs" href={`/lobby/${savedRoom.game.room_code}`}>เข้าห้อง</a></div> : <p className="text-sm text-[#b7aaa0]">ยังไม่มีห้องที่บันทึกบนอุปกรณ์นี้</p>}<p className="mt-3 text-xs text-[#83776f]">แสดงห้องล่าสุดบนอุปกรณ์นี้เท่านั้น ยังไม่ใช่ประวัติผลการแข่งขันย้อนหลัง</p></section><section className="studio-section" id="studio"><div className="section-heading"><div><p className="eyebrow">คู่มือผู้เล่น</p><h2>รู้จัก Burning Werewolf</h2><p className="lede">กติกาที่ใช้จริงในเกม ไม่ใช่ชุดกฎทดลอง</p></div></div><div className="studio-tabs" role="tablist" aria-label="คู่มือเกม">{(['overview', 'locations', 'abilities'] as StudioTab[]).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'studio-tab active' : 'studio-tab'} onClick={() => { setActiveTab(tab); setActiveSection(tab === 'overview' ? 'rules' : tab) }}>{tab === 'overview' ? 'ภาพรวมกฎ' : tab === 'locations' ? 'สถานที่' : 'วิธีชนะ'}</button>)}</div>
          {activeTab === 'overview' && <div className="studio-cards"><div className="studio-feature"><div className="feature-number">01</div><div><h3>การลงคะแนนกลางวัน</h3><p>แต่ละคนมีคะแนนเชื่อใจ 1 คะแนน และไม่เชื่อใจ 1 คะแนน สามารถเลือก “ไม่มี” ได้ทั้งสองประเภท ห้ามเชื่อใจตัวเอง และหมาป่าห้ามเชื่อใจหมาป่าด้วยกัน</p></div></div><div className="studio-feature"><div className="feature-number">02</div><div><h3>การเนรเทศ</h3><p>วันแรกไม่มีการเนรเทศ ตั้งแต่วันที่ 2 เป็นต้นไป ผู้ที่มีคะแนนไม่เชื่อใจสูงสุดและไม่มีคะแนนเชื่อใจจะถูกเนรเทศ ผู้ที่เสมอกันและเข้าเงื่อนไขอาจถูกเนรเทศพร้อมกัน</p></div></div><div className="studio-feature"><div className="feature-number">03</div><div><h3>คืนแห่งการตัดสินใจ</h3><p>เลือกเข้าสถานที่หรืออยู่บ้านเพื่อใช้ความสามารถ หมาป่าพยายามเผาสถานที่ โดย Moderator เป็นผู้ควบคุมแต่ละช่วงเกม</p></div></div></div>}
          {activeTab === 'locations' && <div className="studio-cards">{locations.map((location) => <div className="studio-feature" key={location.name}><div className={`location-icon location-${location.color}`}><location.icon /></div><div><h3>{location.name}</h3><p>{location.meta}</p></div></div>)}</div>}
          {activeTab === 'abilities' && <div className="studio-cards"><div className="studio-feature"><div className="feature-number">01</div><div><h3>ชาวบ้านชนะ</h3><p>เนรเทศหมาป่าทั้งหมด หรืออยู่รอดจนจบคืนสุดท้ายโดยเหลือสถานที่ที่ไม่ถูกเผามากกว่า 3 แห่ง</p></div></div><div className="studio-feature"><div className="feature-number">02</div><div><h3>หมาป่าชนะ</h3><p>ทำให้สถานที่ที่ไม่ถูกเผาเหลือ 3 แห่งหรือน้อยกว่า หรือเผาสถานที่พิเศษที่เปิดเผยตามเงื่อนไขของเกม</p></div></div><div className="studio-feature"><div className="feature-number">03</div><div><h3>จำนวนคืน</h3><p>เกม 5–7 คนเล่น 5 คืน, 8–10 คนเล่น 6 คืน และ 11–14 คนเล่น 7 คืน ตามการตั้งค่าเกม</p></div></div></div>}</section>
        </section>
      </div>
      {guideOpen && <div className="bw-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setGuideOpen(false) }}><div className="bw-modal-card bw-guide-card" role="dialog" aria-modal="true" aria-labelledby="bw-guide-title"><div className="room-control-header"><div><p className="eyebrow">QUICK GUIDE</p><h3 id="bw-guide-title">วิธีเล่น Burning Werewolf</h3></div><button type="button" className="icon-button" onClick={() => setGuideOpen(false)} aria-label="ปิด"><X /></button></div><div className="bw-guide-steps"><div><span>☀️</span><p><strong>กลางวัน · ลงคะแนน</strong> เลือกเชื่อใจและไม่เชื่อใจอย่างละ 1 คะแนน หรือเลือก “ไม่มี” ได้</p></div><div><span>🌙</span><p><strong>กลางคืน · เลือกสถานที่</strong> เข้าสถานที่เพื่อใช้ความสามารถ หรืออยู่บ้านเพื่อรอจดหมาย</p></div><div><span>🔥</span><p><strong>หมาป่า · เผาหมู่บ้าน</strong> หมาป่าพยายามเผาสถานที่ ชาวบ้านต้องรักษาหมู่บ้านให้รอด</p></div><div><span>🏆</span><p><strong>ชัยชนะ</strong> ชาวบ้านชนะเมื่อเนรเทศหมาป่าทั้งหมด หรืออยู่รอดจนจบโดยเหลือสถานที่ปลอดภัยมากกว่า 3 แห่ง</p></div></div><button type="button" className="secondary-button mt-4 w-full rounded-md p-3" onClick={() => { setGuideOpen(false); navigateTo('howto','overview') }}>อ่านกติกาฉบับเต็ม →</button></div></div>}<footer className="app-footer"><BrandMark /><span>Burning Werewolf · คืนนี้… ใครจะรอด?</span></footer>
    </main>
  )
}
