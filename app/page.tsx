'use client'

import { useState } from 'react'
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
import { GameSimulation } from '@/components/game-simulation'

const anuphan = Anuphan({ subsets: ['thai', 'latin'], variable: '--font-anuphan' })

type StudioTab = 'overview' | 'locations' | 'abilities'

const locations = [
  { name: 'หอสมุด', meta: 'ความจุ 3 คน · เบาะแส', icon: BookOpen, color: 'gold' },
  { name: 'หอคอยยาม', meta: 'ความจุ 2 คน · ป้องกันไฟ', icon: Shield, color: 'ember' },
  { name: 'โรงเตี๊ยม', meta: 'ความจุ 4 คน · สอดแนม', icon: Users, color: 'crimson' },
  { name: 'โบสถ์', meta: 'ความจุ 3 คน · คุ้มครอง', icon: Sparkles, color: 'gold' },
]

const players = [
  { name: 'อรุณ', role: 'ชาวบ้าน', status: 'พร้อม', color: 'ember' },
  { name: 'พิมพ์ชนก', role: 'มนุษย์หมาป่า', status: 'พร้อม', color: 'crimson' },
  { name: 'ธนา', role: 'ชาวบ้าน', status: 'รอเข้าเกม', color: 'gold' },
  { name: 'มาลี', role: 'ชาวบ้าน', status: 'พร้อม', color: 'ember' },
]

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

  return (
    <main className={`${anuphan.variable} app-shell`}>
      <div className="ember-field" aria-hidden="true"><span /><span /><span /><span /><span /><span /></div>
      <nav className="topbar">
        <BrandMark />
        <div className="hidden items-center gap-8 md:flex">
          <a className="top-link active" href="#dashboard">ภาพรวม</a>
          <a className="top-link" href="#portal">พอร์ทัลผู้เล่น</a>
          <a className="top-link" href="#studio">สตูดิโอเกม</a>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-xs text-[#988c83] sm:flex"><span className="live-dot" /> เซิร์ฟเวอร์พร้อมใช้งาน</div>
          <Button className="hidden h-9 rounded-md border border-[#5e4737] bg-[#2a201d] px-4 text-xs text-[#d4a65a] hover:bg-[#3a2923] sm:flex"><CircleHelp data-icon="inline-start" /> คู่มือ</Button>
          <button aria-label="เปิดเมนู" className="menu-button md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>{mobileOpen ? <X /> : <Menu />}</button>
        </div>
      </nav>
      {mobileOpen && <div className="mobile-menu"><a href="#dashboard">ภาพรวม</a><a href="#portal">พอร์ทัลผู้เล่น</a><a href="#studio">สตูดิโอเกม</a></div>}

      <div className="page-grid">
        <aside className="sidebar-panel hidden lg:block">
          <div className="sidebar-label">ศูนย์บัญชาการ</div>
          <a className="side-link selected" href="#dashboard"><LayoutDashboard /> แดชบอร์ด <span className="side-count">01</span></a>
          <a className="side-link" href="#studio"><ScrollText /> กฎประจำเดือน</a>
          <a className="side-link" href="#studio"><MapPin /> สถานที่</a>
          <a className="side-link" href="#studio"><WandSparkles /> ความสามารถ</a>
          <a className="side-link" href="#portal"><Users /> ผู้เล่น <span className="side-count">12</span></a>
          <div className="sidebar-divider" />
          <div className="sidebar-label">ระบบเกม</div>
          <a className="side-link" href="#portal"><Gamepad2 /> จำลองเกม</a>
          <a className="side-link" href="#history"><BarChart3 /> ประวัติเกม</a>
          <a className="side-link" href="#settings"><Settings2 /> ตั้งค่า</a>
          <div className="sidebar-bottom"><div className="avatar">ม</div><div><p className="text-xs font-semibold text-[#f2e4c9]">ผู้ดูแลเกม</p><p className="mt-0.5 text-[10px] text-[#83776f]">ผู้ดูแลระบบ</p></div><ChevronRight className="ml-auto size-4 text-[#665f5b]" /></div>
        </aside>

        <section className="content-area" id="dashboard">
          <div className="section-heading"><div><p className="eyebrow">คืนที่ 03 · รอบการเล่นปัจจุบัน</p><h1>หมู่บ้านกำลังลุกไหม้</h1><p className="lede">จัดการเกมและติดตามชะตากรรมของผู้เล่นจากศูนย์บัญชาการ</p></div><Button className="primary-button"><Plus data-icon="inline-start" /> สร้างเกมใหม่</Button></div>

          <div className="stat-grid">
            <div className="stat-card"><div className="stat-icon ember-icon"><Flame /></div><div><p className="stat-label">เกมที่กำลังดำเนินอยู่</p><p className="stat-value">01</p><p className="stat-note text-ember">กำลังเล่นอยู่</p></div></div>
            <div className="stat-card"><div className="stat-icon gold-icon"><Users /></div><div><p className="stat-label">ผู้เล่นในห้อง</p><p className="stat-value">08 <span className="stat-total">/ 12</span></p><p className="stat-note">เข้าร่วมแล้ว 67%</p></div></div>
            <div className="stat-card"><div className="stat-icon crimson-icon"><Moon /></div><div><p className="stat-label">สถานที่ที่ยังไม่ไหม้</p><p className="stat-value">05 <span className="stat-total">/ 08</span></p><p className="stat-note text-gold">มนุษย์หมาป่าใกล้ชนะ</p></div></div>
          </div>

          <div className="dashboard-grid">
            <div className="panel game-panel"><div className="panel-header"><div><p className="eyebrow">เกมที่กำลังดำเนินอยู่</p><h2>คืนแห่งเถ้าถ่าน</h2></div><StatusPill tone="ember"><span className="pulse-dot" /> กำลังดำเนินการ</StatusPill></div><div className="game-hero"><div className="game-hero-content"><p className="text-xs tracking-[0.14em] text-[#d4a65a]">ห้อง #BWF-7291</p><p className="mt-2 font-display text-2xl font-semibold text-[#f2e4c9]">ช่วงกลางคืนที่ 03</p><p className="mt-1 text-sm text-[#b7aaa0]">เลือกสถานที่และกระทำการลับของคุณ</p></div><div className="phase-mark"><Moon /></div></div><div className="game-meta"><div><span className="meta-label">กฎที่ใช้</span><span className="meta-value">คืนเพลิง · v2.4</span></div><div><span className="meta-label">ผู้เล่น</span><span className="meta-value">08 / 12 คน</span></div><div><span className="meta-label">เริ่มเกมเมื่อ</span><span className="meta-value">22 มี.ค. 2024</span></div></div><div className="panel-footer"><button className="text-button">ดูรายละเอียดเกม <ArrowRight aria-hidden="true" /></button><Button className="secondary-button">จัดการเกม</Button></div></div>

            <div className="panel locations-panel"><div className="panel-header"><div><p className="eyebrow">สถานที่ในกฎปัจจุบัน</p><h2>สถานที่ทั้งหมด</h2></div><button className="icon-button" aria-label="ตั้งค่าสถานที่"><Settings2 /></button></div><div className="location-list">{locations.map((location) => <LocationCard key={location.name} location={location} />)}</div><button className="text-button mt-4">จัดการสถานที่ทั้งหมด <ArrowRight aria-hidden="true" /></button></div>
          </div>

          <div className="lower-grid" id="portal"><div className="panel"><div className="panel-header"><div><p className="eyebrow">ห้องรอผู้เล่น</p><h2>ผู้เล่นในเกมล่าสุด</h2></div><button className="text-button">ดูทั้งหมด <ArrowRight aria-hidden="true" /></button></div><div className="player-list">{players.map((player, index) => <div className="player-row" key={player.name}><div className={`player-avatar avatar-${player.color}`}>{player.name.charAt(0)}</div><div className="min-w-0 flex-1"><p className="text-sm font-semibold text-[#f2e4c9]">{player.name}</p><p className="text-xs text-[#83776f]">{index === 1 ? 'บทบาทลับ' : player.role}</p></div><StatusPill tone={player.status === 'พร้อม' ? 'ember' : 'neutral'}>{player.status}</StatusPill></div>)}</div></div><div className="panel activity-panel"><div className="panel-header"><div><p className="eyebrow">บันทึกเหตุการณ์</p><h2>ความเคลื่อนไหวล่าสุด</h2></div><button className="icon-button" aria-label="ดูบันทึกทั้งหมด"><ScrollText /></button></div><div className="activity-list"><div className="activity-item"><span className="activity-line ember-line" /><div><p className="text-sm text-[#d8cabe]">เริ่มช่วงกลางคืนที่ 03</p><p className="text-xs text-[#83776f]">เมื่อสักครู่นี้ · ระบบเกม</p></div></div><div className="activity-item"><span className="activity-line gold-line" /><div><p className="text-sm text-[#d8cabe]">ผู้เล่น 08 คนส่งการเลือกแล้ว</p><p className="text-xs text-[#83776f]">2 นาทีที่แล้ว · ช่วงกลางคืน</p></div></div><div className="activity-item"><span className="activity-line crimson-line" /><div><p className="text-sm text-[#d8cabe]">สถานที่ถูกเผา: โรงสีเก่า</p><p className="text-xs text-[#83776f]">เมื่อวาน · การกระทำลับ</p></div></div></div></div></div>

          <section className="studio-section" id="studio"><div className="section-heading"><div><p className="eyebrow">เครื่องมือสร้างเกม</p><h2>สตูดิโอกฎประจำเดือน</h2><p className="lede">ปรับแต่งโลกของคุณด้วยกฎที่ยืดหยุ่นและตรวจสอบได้</p></div><Button className="secondary-button"><ScrollText data-icon="inline-start" /> ดูกฎทั้งหมด</Button></div><div className="studio-tabs" role="tablist" aria-label="เครื่องมือสร้างเกม">{(['overview', 'locations', 'abilities'] as StudioTab[]).map((tab) => <button key={tab} role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? 'studio-tab active' : 'studio-tab'} onClick={() => setActiveTab(tab)}>{tab === 'overview' ? 'ภาพรวมกฎ' : tab === 'locations' ? 'สถานที่' : 'ความสามารถ'} </button>)}</div>{activeTab === 'overview' && <div className="studio-cards"><div className="studio-feature"><div className="feature-number">01</div><div><h3>กฎคืนเพลิง</h3><p>กฎมาตรฐานสำหรับเกม 10–12 คน พร้อมระบบเผาสถานที่</p><StatusPill tone="gold">เผยแพร่แล้ว · v2.4</StatusPill></div><ChevronRight /></div><div className="studio-feature"><div className="feature-number">02</div><div><h3>กฎเทศกาลจันทรา</h3><p>ชุดกฎทดลองสำหรับเกมที่มีความสามารถพิเศษมากขึ้น</p><StatusPill>ฉบับร่าง</StatusPill></div><ChevronRight /></div><div className="studio-feature add-feature"><div className="add-circle"><Plus /></div><div><h3>สร้างกฎชุดใหม่</h3><p>เริ่มจากกฎเปล่าหรือทำสำเนาจากกฎเดิม</p></div><ChevronRight /></div></div>}{activeTab === 'locations' && <div className="studio-cards">{locations.map((location) => <div className="studio-feature" key={location.name}><div className={`location-icon location-${location.color}`}><location.icon /></div><div><h3>{location.name}</h3><p>{location.meta} · แก้ไขได้ในตัวแก้ไขสถานที่</p><StatusPill tone="gold">เปิดใช้งาน</StatusPill></div><ChevronRight /></div>)}</div>}{activeTab === 'abilities' && <div className="studio-cards"><div className="studio-feature"><div className="location-icon location-ember"><WandSparkles /></div><div><h3>ผู้พิทักษ์หอคอย</h3><p>ป้องกันสถานที่หนึ่งแห่งจากการถูกเผาในคืนนี้</p><StatusPill tone="gold">On Location Visit</StatusPill></div><ChevronRight /></div><div className="studio-feature"><div className="location-icon location-crimson"><Swords /></div><div><h3>คำสาบานแห่งเงา</h3><p>ปรับเปลี่ยนข้อมูลที่ผู้เล่นได้รับตามเงื่อนไข</p><StatusPill tone="crimson">ฉบับร่าง</StatusPill></div><ChevronRight /></div></div>}          </section>
          <GameSimulation />
        </section>
      </div>
      <footer className="app-footer"><BrandMark /><span>© 2024 Burning Werewolf · คืนนี้… ใครจะรอด?</span></footer>
    </main>
  )
}
