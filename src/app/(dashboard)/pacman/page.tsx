'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

const CELL = 20
const COLS = 21
const ROWS = 21

const MAP_TEMPLATE: number[][] = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,3,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,3,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,1,2,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,2,1,1,1,0,0,0,0,0,1,1,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,0,0,1,1,0,0,0,1,1,0,0,2,1,1,1,1],
  [0,0,0,0,2,0,0,1,0,0,0,0,0,1,0,0,2,0,0,0,0],
  [1,1,1,1,2,0,0,1,1,1,1,1,1,1,0,0,2,1,1,1,1],
  [1,1,1,1,2,0,0,0,0,0,0,0,0,0,0,0,2,1,1,1,1],
  [1,1,1,1,2,1,0,0,0,0,0,0,0,0,0,1,2,1,1,1,1],
  [1,1,1,1,2,1,0,1,1,1,1,1,1,1,0,1,2,1,1,1,1],
  [1,2,2,2,2,2,2,2,2,2,1,2,2,2,2,2,2,2,2,2,1],
  [1,2,1,1,2,1,1,1,2,1,1,1,2,1,1,1,2,1,1,2,1],
  [1,3,2,1,2,2,2,2,2,2,0,2,2,2,2,2,2,1,2,3,1],
  [1,1,2,1,2,1,2,1,1,1,1,1,1,1,2,1,2,1,2,1,1],
  [1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1,2,2,2,2,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
]

type Dir = { x: number; y: number }
type Ghost = { x: number; y: number; dir: Dir; color: string; frightened: boolean; frightenTimer: number }
type ScoreRow = { id: string; score: number; played_at: string; profiles: { username: string | null; full_name: string | null } | null }

const DIRS: Record<string, Dir> = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
  a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
}

function freshMap() { return MAP_TEMPLATE.map(r => [...r]) }
function canMove(map: number[][], x: number, y: number) {
  if (y < 0 || y >= ROWS || x < 0 || x >= COLS) return true
  return map[y][x] !== 1
}
function randomDir(map: number[][], x: number, y: number, cur: Dir): Dir {
  const opts = [{ x:1,y:0 },{ x:-1,y:0 },{ x:0,y:1 },{ x:0,y:-1 }]
    .filter(d => !(d.x === -cur.x && d.y === -cur.y) && canMove(map, x+d.x, y+d.y))
  return opts.length ? opts[Math.floor(Math.random()*opts.length)] : { x:-cur.x, y:-cur.y }
}
function initGhosts(): Ghost[] {
  return [
    { x:9, y:9, dir:{x:1,y:0}, color:'#ff0000', frightened:false, frightenTimer:0 },
    { x:10, y:9, dir:{x:-1,y:0}, color:'#ffb8ff', frightened:false, frightenTimer:0 },
    { x:9, y:10, dir:{x:0,y:1}, color:'#00ffff', frightened:false, frightenTimer:0 },
    { x:10, y:10, dir:{x:0,y:-1}, color:'#ffb852', frightened:false, frightenTimer:0 },
  ]
}
function countDots() {
  let n = 0
  MAP_TEMPLATE.forEach(r => r.forEach(c => { if (c===2||c===3) n++ }))
  return n
}

export default function PacmanPage() {
  const supabase = createClient()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const s = useRef({
    map: freshMap(), pacX:10, pacY:15,
    pacDir:{x:0,y:0} as Dir, nextDir:{x:0,y:0} as Dir,
    ghosts: initGhosts(), score:0, lives:3,
    phase:'idle' as 'idle'|'playing'|'dead'|'won'|'gameover',
    mouthAngle:0.02, mouthOpen:true, frame:0, dotsLeft: countDots(),
  })
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  const [display, setDisplay] = useState({ score:0, lives:3 })
  const [phase, setPhase] = useState<'idle'|'playing'|'dead'|'won'|'gameover'>('idle')
  const [myBest, setMyBest] = useState(0)
  const [leaderboard, setLeaderboard] = useState<ScoreRow[]>([])
  const [showBoard, setShowBoard] = useState(false)

  const loadLeaderboard = useCallback(async () => {
    const { data, error } = await supabase
      .from('pacman_scores')
      .select('id, score, played_at, profiles!pacman_scores_profile_fk(username, full_name)')
      .order('score', { ascending: false })
      .limit(10)
    if (error) console.error('leaderboard error', error)
    setLeaderboard((data as unknown as ScoreRow[]) ?? [])
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('pacman_scores').select('score')
        .eq('user_id', user.id).order('score',{ascending:false}).limit(1)
        .then(({ data }) => { if (data?.[0]) setMyBest(data[0].score) })
    })
    loadLeaderboard()
  }, [supabase, loadLeaderboard])

  const saveScore = useCallback(async (score: number) => {
    if (score === 0) return
    await supabase.from('pacman_scores').insert({ score })
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data } = await supabase.from('pacman_scores').select('score')
        .eq('user_id', user.id).order('score',{ascending:false}).limit(1)
      if (data?.[0]) setMyBest(data[0].score)
    }
    await loadLeaderboard()
  }, [supabase, loadLeaderboard])

  const resetLevel = useCallback(() => {
    const r = s.current
    r.map = freshMap(); r.pacX=10; r.pacY=15
    r.pacDir={x:0,y:0}; r.nextDir={x:0,y:0}
    r.ghosts=initGhosts(); r.score=0; r.lives=3
    r.dotsLeft=countDots(); r.mouthAngle=0.02; r.mouthOpen=true; r.frame=0
  }, [])

  const startGame = useCallback(() => {
    resetLevel()
    s.current.phase='playing'
    setPhase('playing')
    setDisplay({ score:0, lives:3 })
  }, [resetLevel])

  const draw = useCallback(() => {
    const canvas = canvasRef.current; if (!canvas) return
    const ctx = canvas.getContext('2d')!
    const r = s.current
    ctx.fillStyle='#000'; ctx.fillRect(0,0,COLS*CELL,ROWS*CELL)
    for (let row=0;row<ROWS;row++) for (let col=0;col<COLS;col++) {
      const cell=r.map[row][col], cx=col*CELL, cy=row*CELL
      if (cell===1) {
        ctx.fillStyle='#1a1aff'; ctx.fillRect(cx,cy,CELL,CELL)
        ctx.strokeStyle='#4444ff'; ctx.strokeRect(cx+1,cy+1,CELL-2,CELL-2)
      } else if (cell===2) {
        ctx.fillStyle='#ffff99'; ctx.beginPath()
        ctx.arc(cx+CELL/2,cy+CELL/2,2,0,Math.PI*2); ctx.fill()
      } else if (cell===3) {
        ctx.fillStyle='#ffaaff'; ctx.beginPath()
        ctx.arc(cx+CELL/2,cy+CELL/2,5,0,Math.PI*2); ctx.fill()
      }
    }
    for (const g of r.ghosts) {
      const gx=g.x*CELL+CELL/2, gy=g.y*CELL+CELL/2, gr=CELL/2-1
      ctx.fillStyle=g.frightened?(r.frame%20<10?'#0000ff':'#fff'):g.color
      ctx.beginPath(); ctx.arc(gx,gy-2,gr,Math.PI,0,false)
      ctx.lineTo(gx+gr,gy+gr)
      for (let i=0;i<=3;i++) { const wx=gx+gr-(i*2*gr/3); ctx.lineTo(wx,i%2===0?gy+gr:gy+gr-5) }
      ctx.lineTo(gx-gr,gy+gr); ctx.closePath(); ctx.fill()
      if (!g.frightened) {
        ctx.fillStyle='#fff'
        ctx.beginPath(); ctx.arc(gx-4,gy-4,3,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(gx+4,gy-4,3,0,Math.PI*2); ctx.fill()
        ctx.fillStyle='#00f'
        ctx.beginPath(); ctx.arc(gx-4+g.dir.x,gy-4+g.dir.y,1.5,0,Math.PI*2); ctx.fill()
        ctx.beginPath(); ctx.arc(gx+4+g.dir.x,gy-4+g.dir.y,1.5,0,Math.PI*2); ctx.fill()
      }
    }
    const px=r.pacX*CELL+CELL/2, py=r.pacY*CELL+CELL/2
    let rot=0
    if (r.pacDir.x===-1) rot=Math.PI
    else if (r.pacDir.y===-1) rot=-Math.PI/2
    else if (r.pacDir.y===1) rot=Math.PI/2
    ctx.save(); ctx.translate(px,py); ctx.rotate(rot)
    ctx.fillStyle='#ffe000'; ctx.beginPath()
    ctx.moveTo(0,0); ctx.arc(0,0,CELL/2-1,r.mouthAngle,Math.PI*2-r.mouthAngle)
    ctx.closePath(); ctx.fill(); ctx.restore()
  }, [])

  const gameLoop = useCallback((ts: number) => {
    const r = s.current
    if (r.phase!=='playing') return
    r.frame++
    if (r.mouthOpen) { r.mouthAngle+=0.12; if(r.mouthAngle>=0.4) r.mouthOpen=false }
    else { r.mouthAngle-=0.12; if(r.mouthAngle<=0.02) r.mouthOpen=true }
    if (ts - lastRef.current > 150) {
      lastRef.current=ts
      const nd=r.nextDir
      if ((nd.x||nd.y) && canMove(r.map,r.pacX+nd.x,r.pacY+nd.y)) r.pacDir=nd
      const d=r.pacDir
      if (d.x||d.y) {
        let nx=r.pacX+d.x; const ny=r.pacY+d.y
        if (nx<0) nx=COLS-1; if (nx>=COLS) nx=0
        if (canMove(r.map,nx,ny)) {
          r.pacX=nx; r.pacY=ny
          const cell=r.map[ny]?.[nx]
          if (cell===2) { r.map[ny][nx]=0; r.score+=10; r.dotsLeft-- }
          else if (cell===3) { r.map[ny][nx]=0; r.score+=50; r.dotsLeft--; r.ghosts.forEach(g=>{g.frightened=true;g.frightenTimer=40}) }
        }
      }
      for (const g of r.ghosts) {
        if (g.frightened) { g.frightenTimer--; if (g.frightenTimer<=0) g.frightened=false }
        const nx=g.x+g.dir.x, ny=g.y+g.dir.y
        if (!canMove(r.map,nx,ny)||Math.random()<0.25) g.dir=randomDir(r.map,g.x,g.y,g.dir)
        else { g.x=((nx%COLS)+COLS)%COLS; g.y=((ny%ROWS)+ROWS)%ROWS }
        if (Math.abs(g.x-r.pacX)<1&&Math.abs(g.y-r.pacY)<1) {
          if (g.frightened) { g.frightened=false; g.x=9; g.y=9; r.score+=200 }
          else {
            r.lives--
            if (r.lives<=0) {
              r.phase='gameover'; setPhase('gameover')
              saveScore(r.score)
            } else {
              r.pacX=10; r.pacY=15; r.pacDir={x:0,y:0}; r.nextDir={x:0,y:0}
              r.ghosts=initGhosts(); r.phase='dead'; setPhase('dead')
              setTimeout(()=>{ r.phase='playing'; setPhase('playing') },1200)
            }
            setDisplay({ score:r.score, lives:r.lives })
          }
        }
      }
      if (r.dotsLeft<=0) { r.phase='won'; setPhase('won'); saveScore(r.score) }
      setDisplay({ score:r.score, lives:r.lives })
    }
    draw()
    rafRef.current=requestAnimationFrame(gameLoop)
  }, [draw, saveScore])

  useEffect(()=>{
    if (phase!=='playing') return
    lastRef.current=performance.now()
    rafRef.current=requestAnimationFrame(gameLoop)
    return ()=>cancelAnimationFrame(rafRef.current)
  },[phase,gameLoop])

  useEffect(()=>{ if (phase!=='playing') draw() },[phase,draw])

  useEffect(()=>{
    const fn=(e:KeyboardEvent)=>{
      const d=DIRS[e.key]; if(d){e.preventDefault(); s.current.nextDir=d}
    }
    window.addEventListener('keydown',fn)
    return ()=>window.removeEventListener('keydown',fn)
  },[])

  const setDir=(k:string)=>{ const d=DIRS[k]; if(d) s.current.nextDir=d }

  function playerName(row: ScoreRow) {
    return row.profiles?.username ?? row.profiles?.full_name ?? 'Player'
  }

  return (
    <div className="flex gap-8">
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center gap-6 w-full">
          <h1 className="text-2xl font-semibold tracking-tight">Pac-Man</h1>
          <div className="flex gap-5 ml-auto text-sm">
            <span>Score: <strong>{display.score}</strong></span>
            <span>Best: <strong>{myBest}</strong></span>
            <span>Lives: <strong>{'●'.repeat(Math.max(0,display.lives))}</strong></span>
          </div>
        </div>

        <div className="relative">
          <canvas ref={canvasRef} width={COLS*CELL} height={ROWS*CELL} className="rounded-xl border-2 border-blue-800" />
          {phase==='idle'&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 rounded-xl gap-4">
              <p className="text-yellow-400 text-3xl font-bold">PAC-MAN</p>
              {myBest>0&&<p className="text-white text-sm">Your best: {myBest}</p>}
              <button onClick={startGame} className="rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black hover:bg-yellow-300 transition">Start Game</button>
              <p className="text-neutral-400 text-xs">Arrow keys or WASD</p>
            </div>
          )}
          {phase==='dead'&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl">
              <p className="text-red-400 text-2xl font-bold">Ouch!</p>
              <p className="text-white text-sm mt-1">{display.lives} lives left</p>
            </div>
          )}
          {(phase==='gameover'||phase==='won')&&(
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 rounded-xl gap-3">
              <p className={`text-3xl font-bold ${phase==='won'?'text-green-400':'text-red-400'}`}>
                {phase==='won'?'YOU WIN!':'GAME OVER'}
              </p>
              <p className="text-white">Score: {display.score}</p>
              {display.score>0&&display.score>=myBest&&<p className="text-yellow-400 font-semibold">New high score!</p>}
              <button onClick={startGame} className="rounded-xl bg-yellow-400 px-8 py-3 font-bold text-black hover:bg-yellow-300 transition">Play Again</button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div/><button onPointerDown={()=>setDir('ArrowUp')} className="rounded-lg bg-neutral-200 py-3 text-lg font-bold hover:bg-neutral-300">↑</button><div/>
          <button onPointerDown={()=>setDir('ArrowLeft')} className="rounded-lg bg-neutral-200 py-3 text-lg font-bold hover:bg-neutral-300">←</button>
          <button onPointerDown={()=>setDir('ArrowDown')} className="rounded-lg bg-neutral-200 py-3 text-lg font-bold hover:bg-neutral-300">↓</button>
          <button onPointerDown={()=>setDir('ArrowRight')} className="rounded-lg bg-neutral-200 py-3 text-lg font-bold hover:bg-neutral-300">→</button>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="w-64 shrink-0">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Leaderboard</h2>
          <button onClick={loadLeaderboard} className="text-xs text-neutral-400 hover:text-neutral-700">↻ Refresh</button>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {leaderboard.length===0?(
            <p className="p-4 text-sm text-neutral-400">No scores yet. Play first!</p>
          ):(
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50">
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">#</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500">Player</th>
                  <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500">Score</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row,i)=>(
                  <tr key={row.id} className={`border-b border-neutral-100 last:border-0 ${i===0?'bg-yellow-50':''}`}>
                    <td className="px-3 py-2 text-neutral-400 font-mono">{i===0?'🏆':i+1}</td>
                    <td className="px-3 py-2 font-medium truncate max-w-[100px]">{playerName(row)}</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold">{row.score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <button
          onClick={()=>{ setShowBoard(b=>!b); loadLeaderboard() }}
          className="mt-3 w-full rounded-lg border border-neutral-200 py-2 text-xs text-neutral-500 hover:bg-neutral-100"
        >
          {showBoard?'Hide':'Show'} all-time scores
        </button>
      </div>
    </div>
  )
}
