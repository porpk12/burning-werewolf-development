import { createHash } from 'node:crypto'
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getModerator } from '@/lib/supabase/auth'
export async function GET(request:Request){
 const code=new URL(request.url).searchParams.get('code')?.trim().toUpperCase()??''
 if(!/^[A-Z0-9]{6}$/.test(code))return NextResponse.json({error:'รหัสห้องไม่ถูกต้อง'},{status:400})
 const url=process.env.SUPABASE_URL??process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY
 if(!url||!key)return NextResponse.json({error:'Missing server configuration'},{status:500})
 const db=createClient(url,key,{auth:{autoRefreshToken:false,persistSession:false}})
 const {data:game}=await db.from('games').select('id,moderator_id,phase,round_number').eq('room_code',code).maybeSingle();if(!game)return NextResponse.json({error:'ไม่พบห้อง'},{status:404})
 const mod=await getModerator();const isMod=mod?.id===game.moderator_id
 if(!isMod){const token=request.headers.get('cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith(`bwf_player_${game.id}=`))?.split('=').slice(1).join('=');if(!token)return NextResponse.json({error:'ไม่มีสิทธิ์'},{status:401});const hash=createHash('sha256').update(token).digest('hex');const {data:player}=await db.from('game_players').select('id').eq('game_id',game.id).eq('session_token_hash',hash).neq('status','removed').maybeSingle();if(!player)return NextResponse.json({error:'ไม่มีสิทธิ์'},{status:401})}
 if(game.round_number<4||game.phase==='lobby')return NextResponse.json({announced:false},{headers:{'Cache-Control':'no-store'}})
 const {data:special}=await db.from('bw_special_locations').select('location_id').eq('game_id',game.id).maybeSingle()
 return NextResponse.json(isMod?{announced:!!special,location:special?.location_id??null}:{announced:!!special},{headers:{'Cache-Control':'no-store'}})
}
