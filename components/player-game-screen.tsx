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
import { VillageLocationStatus } from '@/components/village-location-status'

type Player = {id:string; display_name:string; seat_number:number; status:string}
type Objective = {player_id:string; objective_key:string; title:string; description:string; current:number; target:number; completed:boolean}
export type PlayerScreenData = {
  game:{phase:string;round_number:number;objectives_enabled?:boolean;winner?:'villager'|'werewolf'|null;win_reason?:string|null;bw_timeline_revision?:number;started_at?:string|null;results_announced?:boolean};
  players:Player[];selfId:string|null;ownRole?:'villager'|'werewolf'|null;teammates?:string[];objectives?:Objective[];
  burnedCount?:number;burnedLocations?:string[];latestExileNames?:string[]
}
export function PlayerGameScreen({code,data,storyOpen,onStoryClose,error,onBackToLobby}:{code:string;data:PlayerScreenData;storyOpen:boolean;onStoryClose:()=>void;error:string;onBackToLobby:()=>void}) {
  const [confirmHome,setConfirmHome] = useState(false)
  const [detail,setDetail] = useState<'role'|'objective'|null>(null)
  const [detailExpanded,setDetailExpanded] = useState(false)
  const [roleSection,setRoleSection] = useState<'win'|'secret'|null>(null)
  const openDetail=(kind:'role'|'objective')=>{setDetailExpanded(kind==='objective');setRoleSection(null);setDetail(kind)}
  const closeDetail=()=>{setDetail(null);setDetailExpanded(false);setRoleSection(null)}
  const [dismissedExile,setDismissedExile] = useState<string|null>(null)
  const [dismissedEvent,setDismissedEvent]=useState<string|null>(null)
  const [eventSeen,setEventSeen]=useState(false)
  const phase=data.game.phase
  const finalDay=phase==='day'&&data.game.round_number===gameLimits(data.players.length).nights
  const omenDay=phase==='day'&&data.game.round_number===5&&!finalDay
  const resultReady=phase==='finished'&&data.game.results_announced===true
  const eventName=resultReady?'result':finalDay?'final':omenDay?'omen':null
  const eventKey=`bw_event_${code}_${data.game.started_at??'unknown'}_${eventName}`
  useEffect(()=>{setEventSeen(eventName===null||window.sessionStorage.getItem(eventKey)==='1')},[eventKey,eventName])
  const showEvent=eventName!==null&&!eventSeen&&dismissedEvent!==eventKey
  const closeEvent=()=>{window.sessionStorage.setItem(eventKey,'1');setEventSeen(true);setDismissedEvent(eventKey)}
  const personalWin=data.game.winner===data.ownRole&&(data.ownRole==='werewolf'||!data.game.objectives_enabled||Boolean(data.objectives?.find(o=>o.player_id===data.selfId)?.completed))
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
      {confirmHome && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5" role="presentation" onMouseDown={(e)=>{if(e.target===e.currentTarget)setConfirmHome(false)}}>
        <section role="alertdialog" aria-modal="true" aria-labelledby="confirm-home-title" aria-describedby="confirm-home-description" className="w-full max-w-sm rounded-2xl border border-[#896a47] bg-[#211b18] p-6 text-[#e8d7bb] shadow-2xl">
          <div className="mb-3 flex items-center justify-between"><h2 id="confirm-home-title" className="text-xl font-bold text-[#eac589]">กลับหน้าหลัก?</h2><button type="button" aria-label="ปิด" onClick={()=>setConfirmHome(false)} className="rounded-md p-1 text-[#d8c5aa] hover:bg-white/10"><X size={20}/></button></div>
          <p id="confirm-home-description" className="mb-5 text-sm leading-7 text-[#c9b8a3]">ต้องการกลับไปหน้าหลักของ Burning Werewolf จริงหรือไม่? เกมจะยังดำเนินต่อไปตามปกติ และคุณสามารถกลับเข้าห้องเดิมได้ภายหลัง</p>
          <div className="flex gap-3"><button type="button" autoFocus onClick={()=>setConfirmHome(false)} className="flex-1 rounded-lg border border-[#78614c] px-3 py-3 text-sm font-semibold text-[#e7d3b7]">อยู่ในเกมต่อ</button><button type="button" onClick={()=>window.location.assign('/')} className="flex-1 rounded-lg bg-[#cba15e] px-3 py-3 text-sm font-bold text-[#211810]">ยืนยันกลับหน้าหลัก</button></div>
        </section>
      </div>}
      <header className="bw-player-header">
        <div className="bw-player-brand"><span className="bw-player-overline">THE BURNING VILLAGE</span><h1>Burning <em>Werewolf</em></h1></div>
        <div className="bw-phase-medallion">{night?<Moon size={24}/>:<Sun size={24}/>}<span>{phase==='night_zero'?'คืนที่ 0':phase==='finished'?'สิ้นสุดเกม':`${night?'คืน':'วัน'}ที่ ${data.game.round_number}`}</span></div>
      </header>
      <div className="mb-3 flex justify-end"><button type="button" onClick={() => setConfirmHome(true)} className="rounded-lg border border-[#7a6148] bg-[#211b18] px-3 py-2 text-xs font-medium text-[#e4cda8] hover:bg-[#30241d] focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400">← กลับหน้าหลัก</button></div>
      <section className="bw-night-path" aria-label="คืนที่เหลืออยู่"><div className="bw-night-path-title"><span>เส้นทางแห่งรัตติกาล</span><span>คืนที่ผ่านไป {Math.min(limit.nights,currentNight)} / {limit.nights}</span></div><div className="bw-night-symbols">{Array.from({length:limit.nights},(_,i)=><div key={i} className={`bw-night-symbol ${i+1===data.game.round_number?'is-current':''} ${i<currentNight?'is-past':''}`} title={`คืนที่ ${i+1}`}><Moon size={15}/>{i+1===5&&limit.nights>5&&<Flame size={11} className="text-red-400" aria-label="ลางแห่งหายนะ"/>}<small>{i+1}</small></div>)}</div></section>
      <div className="bw-player-two-cards"><button className="bw-reveal-card" onClick={()=>openDetail('role')}><Shield size={27}/><span>บทบาทของฉัน</span><small>แตะเพื่อเปิดเผย <ChevronRight size={13}/></small></button><button className="bw-reveal-card bw-objective-card" onClick={()=>openDetail('objective')}><ScrollText size={27}/><span>ภารกิจลับ</span><small>{data.game.objectives_enabled&&objective?`${Math.min(objective.current,objective.target)}/${objective.target}`:data.game.objectives_enabled?'แตะเพื่อเปิดอ่าน':'ไม่ได้เปิดใช้งาน'} <ChevronRight size={13}/></small>{data.game.objectives_enabled&&objective&&<div className="bw-objective-progress" aria-label={`ความคืบหน้า ${objective.current} จาก ${objective.target}`}>{Array.from({length:Math.max(1,objective.target)},(_,i)=><span key={i} className={i<objective.current?'is-done':''}/>)}</div>}</button></div>
      <VillageLocationStatus playerCount={data.players.length} burnedLocations={data.burnedLocations} burnedCount={data.burnedCount}/>
      <section className="bw-player-action"><div className="bw-key-action-label"><h2>{phase==='day'?'☀️ ลงคะแนนประจำวัน':phase==='night'?'🌙 สำรวจหมู่บ้านยามราตรี':phase==='night_zero'?'🌙 คืนแห่งการเปิดเผย':'บทสรุปของหมู่บ้าน'}</h2></div>
        {isExiled&&<p className="bw-exiled-note">คุณถูกเนรเทศแล้ว ไม่สามารถลงคะแนนหรือเลือกสถานที่ได้</p>}
        {phase==='day'&&!isExiled&&<DayVotePanel code={code} navigation={null}/>}
        {phase==='night'&&!isExiled&&<NightLocationPanel code={code} moderator={false}/>}
        {phase==='night_zero'&&<NightZeroPanel code={code} moderator={false} phase={phase}/>}
        {phase==='finished'&&!data.game.results_announced&&<p className="text-center text-amber-200">รอ Moderator ประกาศผลการแข่งขัน</p>}
        {phase==='finished'&&data.game.results_announced&&<><p className="bw-finale">{data.game.winner==='villager'?'ฝ่ายชาวบ้านเป็นผู้ชนะ':data.game.winner==='werewolf'?'ฝ่ายหมาป่าเป็นผู้ชนะ':'เกมสิ้นสุดลงแล้ว'}</p><GameChronicle code={code}/></>}
        {phase!=='finished'&&phase!=='night_zero'&&<SpecialLocationPanel code={code} moderator={false}/>}
        {isExiled&&phase!=='night_zero'&&phase!=='finished'&&<NeighborLetterPanel code={code} moderator={false} selfId={data.selfId} eliminated={true}/>}
      </section>
      <div className="bw-player-clock"><DiscussionTimer code={code} moderator={false} phase={phase}/></div>
      <section className="bw-villagers"><div className="bw-section-label"><Users size={17}/><h2>สถานะชาวบ้าน</h2><span>{data.players.filter(p=>p.status!=='eliminated').length} คนที่ยังอยู่</span></div><div className="bw-villager-grid">{data.players.map(p=><div key={p.id} className={`bw-villager-tile ${p.status==='eliminated'?'is-out':''}`}><span className="bw-villager-dot"/><span className="bw-villager-name">{p.display_name}{p.id===data.selfId?' (คุณ)':''}</span></div>)}</div></section>
      {data.selfId&&phase!=='night_zero'&&<SecretLetterPopup code={code} playerId={data.selfId} round={data.game.round_number} phase={phase} revision={data.game.bw_timeline_revision??0}/>}
      {error&&<p role="alert" className="bw-error">{error}</p>}
    </div>
    {detail&&<div className="bw-player-modal bw-modern-detail-overlay" role="dialog" aria-modal="true" aria-label={detail==='role'?'บทบาทของฉัน':'ภารกิจลับ'}><div className="bw-modern-detail-panel"><button className="bw-modal-close" onClick={closeDetail} aria-label="ปิด"><X/></button>{!(detail==='role'&&roleSection!==null)&&<><div className="bw-modern-detail-symbol">{detail==='role'?<Shield size={30}/>:<ScrollText size={30}/>}</div><span className="bw-modern-detail-eyebrow">{detail==='role'?'บทบาทของฉัน':'ภารกิจลับ'}</span><h2>{detail==='role'?(data.ownRole==='werewolf'?'หมาป่า':'ชาวบ้าน'):(data.game.objectives_enabled?(objective?.title||'ยังไม่ได้รับภารกิจ'):'ปิดใช้งานภารกิจลับ')}</h2></>}{!detailExpanded?<><button className="bw-modern-detail-primary" onClick={()=>setDetailExpanded(true)}>อ่านเพิ่มเติม <ChevronRight size={17}/></button></>:<><div className="bw-modern-detail-body">{detail==='role'?<>
        {roleSection===null?<>
          <p>{data.ownRole==='werewolf'?'คุณแฝงตัวอยู่ในหมู่บ้าน และสามารถเผาสถานที่ที่เข้าไปได้สำเร็จ':'คุณไม่มีพลังพิเศษ แต่ใช้การลงคะแนนและความสามารถของสถานที่เพื่อปกป้องหมู่บ้านได้'}</p>
          {data.ownRole==='werewolf'&&<p>เพื่อนหมาป่า: {data.teammates?.join(', ')||'ไม่มี'}</p>}
          <div className="bw-role-detail-choices"><button onClick={()=>setRoleSection('win')}><Shield size={19}/>วิธีชนะ <ChevronRight size={16}/></button><button onClick={()=>setRoleSection('secret')}><ScrollText size={19}/>โหมดภารกิจลับ <ChevronRight size={16}/></button></div>
        </>:<>{roleSection==='win'?<p>{data.ownRole==='werewolf'?limit.nights===5?'หมาป่าชนะเมื่อเผาสถานที่จนถึงเกณฑ์ที่กำหนด':'หมาป่าชนะเมื่อเผาสถานที่จนถึงเกณฑ์ที่กำหนด หรือเผาสถานที่พิเศษหลังเปิดเผยในวันที่ 5':'ชาวบ้านชนะเมื่อเนรเทศหมาป่าทั้งหมด หรือรักษาสถานที่ให้รอดจนจบคืนสุดท้าย'}</p>:<div className="bw-secret-mode-copy"><p>เมื่อเปิดใช้งานโหมดภารกิจลับ จะเพิ่มเงื่อนไขการชนะดังนี้:</p><p><strong>ชาวบ้าน :</strong> ต้องทำภารกิจให้สำเร็จและฝ่ายชาวบ้านชนะ จึงจะถือว่าเป็นผู้ชนะ</p><p><strong>หมาป่า :</strong> ได้รับภารกิจเช่นกัน แต่ไม่จำเป็นต้องทำเพื่อชนะ</p></div>}</>}
      </>:<p style={{textAlign:'center'}}>{objective?.description||'ไม่มีภารกิจในเกมนี้'}</p>}</div>{detail==='role'&&roleSection!==null&&<button className="bw-modern-detail-primary" onClick={()=>setRoleSection(null)}>ย้อนกลับ</button>}</>}</div></div>}
    {showEvent&&!storyOpen&&<div className="bw-player-modal" role="dialog" aria-modal="true" aria-label="เหตุการณ์สำคัญ"><div className="bw-player-parchment"><Flame size={34}/><span className="bw-player-overline">{eventName==='omen'?'DAY V · THE OMEN':eventName==='final'?'FINAL DAY · THE LAST DAWN':'THE FINAL VERDICT'}</span><h2>{eventName==='omen'?'ลางแห่งหายนะ':eventName==='final'?'รุ่งอรุณแห่งคำตัดสิน':personalWin?'คุณชนะ!':'คุณไม่ชนะ'}</h2>{eventName==='omen'?<><p>ห้าราตรีผ่านพ้น เปลวเพลิงยังคงกัดกินหมู่บ้านแห่งนี้อย่างไม่รู้จักพอ</p><p>ท่ามกลางเถ้าถ่านและเสียงกระซิบ บางสิ่งที่หลับใหลมาเนิ่นนานกำลังตื่นขึ้น</p><p><strong>นับจากวันนี้เป็นต้นไป ชะตาของหมู่บ้านอาจถูกตัดสินได้ด้วยเปลวไฟเพียงครั้งเดียว</strong></p><p>จงระวังทุกย่างก้าว เพราะบางความลับไม่ควรถูกปลุกให้ตื่น</p></>:eventName==='final'?<><p>รุ่งอรุณสุดท้ายมาถึงแล้ว หมู่บ้านที่เคยสงบสุขบัดนี้เหลือเพียงร่องรอยแห่งความหวาดระแวง และเปลวเพลิงที่ยังไม่ดับมอด</p><p><strong>นี่คือโอกาสสุดท้ายของทุกฝ่าย</strong></p><p>ผู้ที่คิดจะปกป้อง จงลงมือก่อนทุกสิ่งจะสายเกินไป ผู้ที่ซ่อนเขี้ยวเล็บ จงอย่าปล่อยให้โอกาสสุดท้ายหลุดลอย</p><p>เมื่อราตรีนี้สิ้นสุดลง จะไม่มีโอกาสให้แก้ตัวอีกแล้ว จงเลือกให้ดี เพราะทุกการตัดสินใจอาจเป็นครั้งสุดท้าย</p></>:<><p>{data.game.winner==='villager'?'ฝ่ายชาวบ้านได้รับชัยชนะ':'ฝ่ายหมาป่าได้รับชัยชนะ'}</p><p>{personalWin?'ยินดีด้วย คุณผ่านพ้นรัตติกาลและได้รับชัยชนะ':'รัตติกาลนี้สิ้นสุดลงแล้ว แต่ชัยชนะไม่ได้ตกเป็นของคุณ'}</p>{data.game.objectives_enabled&&data.ownRole==='villager'&&data.game.winner==='villager'&&!personalWin&&<p>ฝ่ายชาวบ้านชนะ แต่ภารกิจลับของคุณยังไม่สำเร็จ</p>}</>}<button className="bw-parchment-dismiss" onClick={closeEvent}>{eventName==='result'?'ดูสรุปผลการแข่งขัน':eventName==='final'?'เผชิญหน้าวันสุดท้าย':'รับรู้ลางแห่งหายนะ'}</button></div></div>}
    {showExile&&!showEvent&&<div className="bw-player-modal" role="dialog" aria-modal="true" aria-label="ผลการเนรเทศ"><div className="bw-player-parchment"><Flame size={32}/><span className="bw-player-overline">THE VILLAGE VERDICT</span><h2>ผลการเนรเทศ วันที่ {data.game.round_number}</h2><p>{data.latestExileNames?.length?`ผู้ถูกเนรเทศ: ${data.latestExileNames.join(', ')}`:'ไม่มีใครถูกเนรเทศ'}</p><button className="bw-parchment-dismiss" onClick={closeExile}>รับทราบ</button></div></div>}
    {storyOpen&&<div className="bw-player-modal" role="dialog" aria-modal="true" aria-label="บทนำเกม"><div className="bw-player-parchment"><Flame size={36}/><span className="bw-player-overline">BURNING WEREWOLF</span><h2>เมื่อเปลวไฟเริ่มลุกโชน</h2><p>ณ หมู่บ้านเล็ก ๆ แห่งหนึ่ง ผู้คนเคยใช้ชีวิตร่วมกันอย่างสงบสุข จนกระทั่งคืนหนึ่ง เปลวไฟปริศนาได้เผาผลาญสถานที่สำคัญของหมู่บ้าน</p><p>ไม่มีใครรู้ว่าใครเป็นผู้จุดไฟ แต่ข่าวลือเริ่มแพร่สะพัดว่า มีหมาป่าแฝงตัวอยู่ท่ามกลางชาวบ้าน</p><p>จากนี้ไป ทุกคำพูดอาจเป็นคำลวง ทุกความไว้วางใจอาจนำไปสู่หายนะ และทุกคืนอาจเป็นคืนสุดท้ายของหมู่บ้านแห่งนี้</p><h3>แล้วคุณล่ะ… จะเลือกเชื่อใคร?</h3><button className="bw-parchment-dismiss" onClick={onStoryClose}>เข้าสู่หมู่บ้าน</button></div></div>}
  </main>
}
