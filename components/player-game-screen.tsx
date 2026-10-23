'use client'

import { useEffect, useState } from 'react'
import { Sun, Moon, ScrollText, Shield, Flame, BookOpen, Castle, Wine, Church, Store, Users, X, ChevronRight } from 'lucide-react'
import { gameLimits } from '@/lib/night-locations'
import { DayVotePanel } from '@/components/day-vote-panel'
import { NightLocationPanel } from '@/components/night-location-panel'
import { NightZeroPanel } from '@/components/night-zero-panel'
import { SpecialLocationPanel } from '@/components/special-location-panel'
import { NeighborLetterPanel } from '@/components/neighbor-letter-panel'
import { SecretLetterPopup } from '@/components/secret-letter-popup'
import { DiscussionTimer } from '@/components/discussion-timer'
import { GameChronicle } from '@/components/game-chronicle'

type Player = {id:string; display_name:string; seat_number:number; status:string}
type Objective = {player_id:string; objective_key:string; title:string; description:string; current:number; target:number; completed:boolean}
export type PlayerScreenData = {
  game:{phase:string;round_number:number;objectives_enabled?:boolean;winner?:'villager'|'werewolf'|null;win_reason?:string|null;bw_timeline_revision?:number};
  players:Player[];selfId:string|null;ownRole?:'villager'|'werewolf'|null;teammates?:string[];objectives?:Objective[];
  burnedCount?:number;latestExileNames?:string[]
}
const locations = [
  {name:'ห้องสมุด',icon:BookOpen}, {name:'ป้อมปราการ',icon:Castle}, {name:'ซ่อง',icon:Wine},
  {name:'โรงเตี๊ยม',icon:Wine}, {name:'โบสถ์',icon:Church}, {name:'ตลาด',icon:Store},
]
export function PlayerGameScreen({code,data,storyOpen,onStoryClose,error}:{code:string;data:PlayerScreenData;storyOpen:boolean;onStoryClose:()=>void;error:string}) {
  const [detail,setDetail] = useState<'role'|'objective'|null>(null)
  const [detailExpanded,setDetailExpanded] = useState(false)
  const [roleSection,setRoleSection] = useState<'win'|'secret'|null>(null)
  const openDetail=(kind:'role'|'objective')=>{setDetailExpanded(kind==='objective');setRoleSection(null);setDetail(kind)}
  const closeDetail=()=>{setDetail(null);setDetailExpanded(false);setRoleSection(null)}
  const [dismissedExile,setDismissedExile] = useState<string|null>(null)
  const phase=data.game.phase
  const night=phase==='night'||phase==='night_zero'
  const isExiled=data.players.some(p=>p.id===data.selfId&&p.status==='eliminated')
  const limit=gameLimits(data.players.length)
  const objective=data.objectives?.find(o=>o.player_id===data.selfId)
  const exileKey=`bw_exile_${code}_${data.game.round_number}`
  const [seenExile,setSeenExile]=useState(false)
  useEffect(()=>{setSeenExile(window.sessionStorage.getItem(exileKey)==='1')},[exileKey])
  const showExile=phase==='night'&&!seenExile&&dismissedExile!==exileKey
  const closeExile=()=>{window.sessionStorage.setItem(exileKey,'1');setSeenExile(true);setDismissedExile(exileKey)}
  const currentNight=Math.max(0,data.game.round_number-(phase==='day'?1:0))
  return <main className={`bw-player-scene ${night?'bw-scene-night':'bw-scene-day'}`}>
    <div className="bw-player-page">
      <header className="bw-player-header">
        <div className="bw-player-brand"><span className="bw-player-overline">THE BURNING VILLAGE</span><h1>Burning <em>Werewolf</em></h1></div>
        <div className="bw-phase-medallion">{night?<Moon size={24}/>:<Sun size={24}/>}<span>{phase==='night_zero'?'คืนที่ 0':phase==='finished'?'สิ้นสุดเกม':`${night?'คืน':'วัน'}ที่ ${data.game.round_number}`}</span></div>
      </header>
      <section className="bw-night-path" aria-label="คืนที่เหลืออยู่"><div className="bw-night-path-title"><span>เส้นทางแห่งรัตติกาล</span><span>คืนที่ผ่านไป {Math.min(limit.nights,currentNight)} / {limit.nights}</span></div><div className="bw-night-symbols">{Array.from({length:limit.nights},(_,i)=><div key={i} className={`bw-night-symbol ${i+1===data.game.round_number?'is-current':''} ${i<currentNight?'is-past':''}`} title={`คืนที่ ${i+1}`}><Moon size={15}/><small>{i+1}</small></div>)}</div></section>
      <div className="bw-player-two-cards"><button className="bw-reveal-card" onClick={()=>openDetail('role')}><Shield size={27}/><span>บทบาทของฉัน</span><small>แตะเพื่อเปิดเผย <ChevronRight size={13}/></small></button><button className="bw-reveal-card bw-objective-card" onClick={()=>openDetail('objective')}><ScrollText size={27}/><span>ภารกิจลับ</span><small>{data.game.objectives_enabled&&objective?`${Math.min(objective.current,objective.target)}/${objective.target}`:data.game.objectives_enabled?'แตะเพื่อเปิดอ่าน':'ไม่ได้เปิดใช้งาน'} <ChevronRight size={13}/></small>{data.game.objectives_enabled&&objective&&<div className="bw-objective-progress" aria-label={`ความคืบหน้า ${objective.current} จาก ${objective.target}`}>{Array.from({length:Math.max(1,objective.target)},(_,i)=><span key={i} className={i<objective.current?'is-done':''}/>)}</div>}</button></div>
      <div className="bw-player-clock"><DiscussionTimer code={code} moderator={false} phase={phase}/></div>
      <section className="bw-player-action">
        {isExiled&&<p className="bw-exiled-note">คุณถูกเนรเทศแล้ว ไม่สามารถลงคะแนนหรือเลือกสถานที่ได้</p>}
        {phase==='day'&&!isExiled&&<DayVotePanel code={code} navigation={null}/>}
        {phase==='night'&&!isExiled&&<NightLocationPanel code={code} moderator={false}/>}
        {phase==='night_zero'&&<NightZeroPanel code={code} moderator={false} phase={phase}/>}
        {phase==='finished'&&<><p className="bw-finale">{data.game.winner==='villager'?'ฝ่ายชาวบ้านเป็นผู้ชนะ':data.game.winner==='werewolf'?'ฝ่ายหมาป่าเป็นผู้ชนะ':'เกมสิ้นสุดลงแล้ว'}</p><GameChronicle code={code}/></>}
        {phase!=='finished'&&phase!=='night_zero'&&<SpecialLocationPanel code={code} moderator={false}/>}
        {isExiled&&phase!=='night_zero'&&phase!=='finished'&&<NeighborLetterPanel code={code} moderator={false} selfId={data.selfId} eliminated={true}/>}
      </section>
      <section className="bw-village-map"><div className="bw-section-label"><Flame size={17}/><h2>สถานที่ในหมู่บ้าน</h2><span>{data.burnedCount??0} แห่งถูกเผา</span></div><div className="bw-place-grid">{locations.slice(0,limit.locations).map(({name,icon:Icon})=><div key={name} className="bw-place-tile"><Icon size={21}/><span>{name}</span></div>)}</div><p className="bw-map-note">สถานะการเผารวม {data.burnedCount??0} แห่ง · รายละเอียดสถานที่ดูได้ในช่วงเลือกสถานที่</p></section>
      <section className="bw-villagers"><div className="bw-section-label"><Users size={17}/><h2>สถานะชาวบ้าน</h2><span>{data.players.filter(p=>p.status!=='eliminated').length} คนที่ยังอยู่</span></div><div className="bw-villager-grid">{data.players.map(p=><div key={p.id} className={`bw-villager-tile ${p.status==='eliminated'?'is-out':''}`}><span className="bw-villager-dot"/><span className="bw-villager-name">{p.display_name}{p.id===data.selfId?' (คุณ)':''}</span></div>)}</div></section>
      {data.selfId&&phase!=='night_zero'&&<SecretLetterPopup code={code} playerId={data.selfId} round={data.game.round_number} phase={phase} revision={data.game.bw_timeline_revision??0}/>}
      {error&&<p role="alert" className="bw-error">{error}</p>}
    </div>
    {detail&&<div className="bw-player-modal bw-modern-detail-overlay" role="dialog" aria-modal="true" aria-label={detail==='role'?'บทบาทของฉัน':'ภารกิจลับ'}><div className="bw-modern-detail-panel"><button className="bw-modal-close" onClick={closeDetail} aria-label="ปิด"><X/></button>{!(detail==='role'&&roleSection!==null)&&<><div className="bw-modern-detail-symbol">{detail==='role'?<Shield size={30}/>:<ScrollText size={30}/>}</div><span className="bw-modern-detail-eyebrow">{detail==='role'?'บทบาทของฉัน':'ภารกิจลับ'}</span><h2>{detail==='role'?(data.ownRole==='werewolf'?'หมาป่า':'ชาวบ้าน'):(data.game.objectives_enabled?(objective?.title||'ยังไม่ได้รับภารกิจ'):'ปิดใช้งานภารกิจลับ')}</h2></>}{!detailExpanded?<><button className="bw-modern-detail-primary" onClick={()=>setDetailExpanded(true)}>อ่านเพิ่มเติม <ChevronRight size={17}/></button></>:<><div className="bw-modern-detail-body">{detail==='role'?<>
        {roleSection===null?<>
          <p>{data.ownRole==='werewolf'?'คุณแฝงตัวอยู่ในหมู่บ้าน และสามารถเผาสถานที่ที่เข้าไปได้สำเร็จ':'คุณไม่มีพลังพิเศษ แต่ใช้การลงคะแนนและความสามารถของสถานที่เพื่อปกป้องหมู่บ้านได้'}</p>
          {data.ownRole==='werewolf'&&<p>เพื่อนหมาป่า: {data.teammates?.join(', ')||'ไม่มี'}</p>}
          <div className="bw-role-detail-choices"><button onClick={()=>setRoleSection('win')}><Shield size={19}/>วิธีชนะ <ChevronRight size={16}/></button><button onClick={()=>setRoleSection('secret')}><ScrollText size={19}/>โหมดภารกิจลับ <ChevronRight size={16}/></button></div>
        </>:<><button className="bw-role-back" onClick={()=>setRoleSection(null)}>‹ กลับไปยังรายละเอียดบทบาท</button>{roleSection==='win'?<p>{data.ownRole==='werewolf'?'หมาป่าชนะเมื่อเผาสถานที่จนถึงเกณฑ์ที่กำหนด หรือเผาสถานที่พิเศษหลังเปิดเผยในวันที่ 5':'ชาวบ้านชนะเมื่อเนรเทศหมาป่าทั้งหมด หรือรักษาสถานที่ให้รอดจนจบคืนสุดท้าย'}</p>:<div className="bw-secret-mode-copy"><p>เมื่อเปิดใช้งานโหมดภารกิจลับ จะเพิ่มเงื่อนไขการชนะดังนี้:</p><p><strong>ชาวบ้าน :</strong> ต้องทำภารกิจให้สำเร็จและฝ่ายชาวบ้านชนะ จึงจะถือว่าเป็นผู้ชนะ</p><p><strong>หมาป่า :</strong> ได้รับภารกิจเช่นกัน แต่ไม่จำเป็นต้องทำเพื่อชนะ</p></div>}</>}
      </>:<p style={{textAlign:'center'}}>{objective?.description||'ไม่มีภารกิจในเกมนี้'}</p>}</div><button className="bw-modern-detail-primary" onClick={closeDetail}>รับทราบ</button></>}</div></div>}
    {showExile&&<div className="bw-player-modal" role="dialog" aria-modal="true" aria-label="ผลการเนรเทศ"><div className="bw-player-parchment"><Flame size={32}/><span className="bw-player-overline">THE VILLAGE VERDICT</span><h2>ผลการเนรเทศ วันที่ {data.game.round_number}</h2><p>{data.latestExileNames?.length?`ผู้ถูกเนรเทศ: ${data.latestExileNames.join(', ')}`:'ไม่มีใครถูกเนรเทศ'}</p><button className="bw-parchment-dismiss" onClick={closeExile}>รับทราบ</button></div></div>}
    {storyOpen&&<div className="bw-player-modal" role="dialog" aria-modal="true" aria-label="บทนำเกม"><div className="bw-player-parchment"><Flame size={36}/><span className="bw-player-overline">BURNING WEREWOLF</span><h2>เมื่อเปลวไฟเริ่มลุกโชน</h2><p>ณ หมู่บ้านเล็ก ๆ แห่งหนึ่ง ผู้คนเคยใช้ชีวิตร่วมกันอย่างสงบสุข จนกระทั่งคืนหนึ่ง เปลวไฟปริศนาได้เผาผลาญสถานที่สำคัญของหมู่บ้าน</p><p>ไม่มีใครรู้ว่าใครเป็นผู้จุดไฟ แต่ข่าวลือเริ่มแพร่สะพัดว่า มีหมาป่าแฝงตัวอยู่ท่ามกลางชาวบ้าน</p><p>จากนี้ไป ทุกคำพูดอาจเป็นคำลวง ทุกความไว้วางใจอาจนำไปสู่หายนะ และทุกคืนอาจเป็นคืนสุดท้ายของหมู่บ้านแห่งนี้</p><h3>แล้วคุณล่ะ… จะเลือกเชื่อใคร?</h3><button className="bw-parchment-dismiss" onClick={()=>{onStoryClose();openDetail('role')}}>เปิดการ์ดบทบาท</button></div></div>}
  </main>
}
