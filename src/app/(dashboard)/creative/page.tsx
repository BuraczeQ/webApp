'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

/* -------------------------------------------------------------------------- */
/*  Creative World — a driveable, interactive portfolio inspired by           */
/*  Bruno Simon's 3D world. Pure canvas, no dependencies.                     */
/* -------------------------------------------------------------------------- */

const WORLD = { w: 3800, h: 2700 }

type Station = {
  id: string
  x: number
  y: number
  title: string
  emoji: string
  tag: string
  desc: string
  color: string
  secret?: boolean
}

const STATIONS: Station[] = [
  {
    id: 'welcome',
    x: 1900, y: 1350,
    title: 'Welcome',
    emoji: '✦',
    tag: 'Start here',
    color: '#22d3ee',
    desc: 'You are driving a little car through a hand-built creative world. Use the wheels to explore — every glowing pad reveals something. Take your time and look for secrets.',
  },
  {
    id: 'about',
    x: 850, y: 720,
    title: 'About',
    emoji: '👋',
    tag: 'Who',
    color: '#a78bfa',
    desc: 'An experimental corner of webOnline — built to play with motion, physics and the joy of an interface you can actually drive around in. Inspired by Bruno Simon, Locomotive & friends.',
  },
  {
    id: 'projects',
    x: 2950, y: 700,
    title: 'Projects',
    emoji: '🛠️',
    tag: 'Work',
    color: '#f472b6',
    desc: 'The rest of the app lives next door: Pomodoro, Notes, Calendar, Gallery and a full Pac-Man with online leaderboards. This world ties them together with a playful front door.',
  },
  {
    id: 'playground',
    x: 800, y: 2050,
    title: 'Playground',
    emoji: '🎮',
    tag: 'Fun',
    color: '#fbbf24',
    desc: 'Drift hard around the cones, leave skid-marks, kick up dust. The physics are arcade-simple but tuned to feel good. Hold a turn at speed and feel the back end slide.',
  },
  {
    id: 'lab',
    x: 3050, y: 2050,
    title: 'The Lab',
    emoji: '⚗️',
    tag: 'Tech',
    color: '#34d399',
    desc: 'Everything here is one canvas and a game loop: camera follow, particle trails, a minimap and a tuned car model — all running at 60fps with zero external libraries.',
  },
  {
    id: 'contact',
    x: 1900, y: 2350,
    title: 'Contact',
    emoji: '📡',
    tag: 'Say hi',
    color: '#60a5fa',
    desc: 'Like the vibe? This whole experience is a single React component. Fork it, remix it, make it yours. The best portfolios are the ones that feel like a place, not a page.',
  },
  {
    id: 'secret',
    x: 320, y: 320,
    title: 'You found it!',
    emoji: '🏆',
    tag: 'Secret',
    color: '#fcd34d',
    secret: true,
    desc: 'A hidden corner of the map. Bruno Simon hides easter eggs all over his world — so this one hides here too. Consider yourself a thorough explorer. 🚗💨',
  },
]

/* deterministic PRNG so decorations don't jump between frames */
function mulberry32(seed: number) {
  return function () {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Prop = { x: number; y: number; r: number; kind: 'tree' | 'rock' | 'cone'; hue: number }
type Particle = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number; c: string }
type Skid = { x: number; y: number; a: number; life: number }

function buildProps(): Prop[] {
  const rng = mulberry32(1337)
  const props: Prop[] = []
  // trees + rocks scattered, avoiding the center spawn
  for (let i = 0; i < 90; i++) {
    const x = rng() * WORLD.w
    const y = rng() * WORLD.h
    const dc = Math.hypot(x - 1900, y - 1350)
    if (dc < 260) continue
    const kind = rng() < 0.7 ? 'tree' : 'rock'
    props.push({ x, y, r: kind === 'tree' ? 14 + rng() * 14 : 10 + rng() * 16, kind, hue: 120 + rng() * 40 })
  }
  // a ring of cones around the playground for drifting
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2
    props.push({ x: 800 + Math.cos(a) * 190, y: 2050 + Math.sin(a) * 150, r: 9, kind: 'cone', hue: 0 })
  }
  return props
}

type Coin = { x: number; y: number; taken: boolean; spin: number }
type BoostPad = { x: number; y: number; angle: number }

function buildCoins(): Coin[] {
  const rng = mulberry32(99)
  const coins: Coin[] = []
  // scattered coins across the world, away from the spawn pad
  for (let i = 0; i < 46; i++) {
    const x = 120 + rng() * (WORLD.w - 240)
    const y = 120 + rng() * (WORLD.h - 240)
    if (Math.hypot(x - 1900, y - 1350) < 180) continue
    coins.push({ x, y, taken: false, spin: rng() * Math.PI })
  }
  // a tempting wavy trail of coins through the middle
  for (let i = 0; i < 12; i++) {
    coins.push({ x: 1320 + i * 110, y: 1350 + Math.sin(i * 0.6) * 160, taken: false, spin: 0 })
  }
  return coins
}

function buildBoosts(): BoostPad[] {
  return [
    { x: 1500, y: 900, angle: 0 },
    { x: 2450, y: 1150, angle: Math.PI / 2 },
    { x: 1100, y: 1700, angle: -Math.PI / 4 },
    { x: 2650, y: 1700, angle: Math.PI },
    { x: 1900, y: 1880, angle: -Math.PI / 2 },
    { x: 700, y: 1150, angle: Math.PI / 6 },
  ]
}

export default function CreativePage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const wrapRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef(0)

  const [started, setStarted] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [found, setFound] = useState<Set<string>>(new Set())
  const [speedKmh, setSpeedKmh] = useState(0)
  const [coins, setCoins] = useState(0)
  const [soundOn, setSoundOn] = useState(false)

  // mutable game state kept out of React for 60fps updates
  const g = useRef({
    car: { x: 1900, y: 1500, angle: -Math.PI / 2, speed: 0 },
    cam: { x: 1900, y: 1500 },
    keys: new Set<string>(),
    props: buildProps(),
    coins: buildCoins(),
    boosts: buildBoosts(),
    particles: [] as Particle[],
    skids: [] as Skid[],
    view: { w: 800, h: 600 },
    nearest: null as Station | null,
    foundLocal: new Set<string>(),
    coinCount: 0,
    boostTimer: 0,
    t: 0,
  })

  // WebAudio — created on first user gesture, muted (master gain 0) by default
  const audioRef = useRef<{
    ctx: AudioContext
    master: GainNode
    engOsc: OscillatorNode
    engOsc2: OscillatorNode
    filter: BiquadFilterNode
  } | null>(null)

  const initAudio = useCallback(() => {
    if (audioRef.current) return
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      const ctx = new Ctx()
      const master = ctx.createGain()
      master.gain.value = 0 // muted until the user turns sound on
      master.connect(ctx.destination)

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.value = 700
      const engGain = ctx.createGain()
      engGain.gain.value = 0.05
      const engOsc = ctx.createOscillator()
      engOsc.type = 'sawtooth'
      engOsc.frequency.value = 55
      const engOsc2 = ctx.createOscillator()
      engOsc2.type = 'square'
      engOsc2.frequency.value = 82
      engOsc.connect(filter)
      engOsc2.connect(filter)
      filter.connect(engGain)
      engGain.connect(master)
      engOsc.start()
      engOsc2.start()
      audioRef.current = { ctx, master, engOsc, engOsc2, filter }
    } catch {
      // audio unavailable — game still works silently
    }
  }, [])

  const toggleSound = useCallback(() => {
    initAudio()
    setSoundOn((on) => {
      const next = !on
      const a = audioRef.current
      if (a) {
        a.ctx.resume().catch(() => {})
        a.master.gain.setTargetAtTime(next ? 0.5 : 0, a.ctx.currentTime, 0.05)
      }
      return next
    })
  }, [initAudio])

  /* ----- input ----- */
  const press = useCallback((k: string, down: boolean) => {
    const keys = g.current.keys
    if (down) keys.add(k)
    else keys.delete(k)
  }, [])

  useEffect(() => {
    const map: Record<string, string> = {
      ArrowUp: 'up', w: 'up', W: 'up',
      ArrowDown: 'down', s: 'down', S: 'down',
      ArrowLeft: 'left', a: 'left', A: 'left',
      ArrowRight: 'right', d: 'right', D: 'right',
    }
    const kd = (e: KeyboardEvent) => {
      const k = map[e.key]
      if (k) { e.preventDefault(); press(k, true) }
    }
    const ku = (e: KeyboardEvent) => {
      const k = map[e.key]
      if (k) { e.preventDefault(); press(k, false) }
    }
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    return () => {
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
    }
  }, [press])

  /* ----- resize ----- */
  useEffect(() => {
    const onResize = () => {
      const wrap = wrapRef.current
      const canvas = canvasRef.current
      if (!wrap || !canvas) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = wrap.clientWidth
      const h = wrap.clientHeight
      canvas.width = w * dpr
      canvas.height = h * dpr
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      const ctx = canvas.getContext('2d')!
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      g.current.view = { w, h }
    }
    onResize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  /* ----- main loop ----- */
  useEffect(() => {
    if (!started) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!

    const ACCEL = 0.22
    const REVERSE = 0.14
    const MAX = 7.6
    const BOOST = MAX * 1.8
    const BOOST_MAX = MAX * 1.9
    const FRICTION = 0.94
    const TURN = 0.052

    // short sound effects routed through the (possibly muted) master gain
    const playBlip = (freq: number) => {
      const a = audioRef.current
      if (!a) return
      const o = a.ctx.createOscillator()
      const gain = a.ctx.createGain()
      o.type = 'triangle'
      o.frequency.setValueAtTime(freq, a.ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(freq * 2, a.ctx.currentTime + 0.08)
      gain.gain.setValueAtTime(0.0001, a.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.3, a.ctx.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + 0.18)
      o.connect(gain); gain.connect(a.master)
      o.start(); o.stop(a.ctx.currentTime + 0.2)
    }
    const playWhoosh = () => {
      const a = audioRef.current
      if (!a) return
      const o = a.ctx.createOscillator()
      const gain = a.ctx.createGain()
      o.type = 'sawtooth'
      o.frequency.setValueAtTime(180, a.ctx.currentTime)
      o.frequency.exponentialRampToValueAtTime(900, a.ctx.currentTime + 0.25)
      gain.gain.setValueAtTime(0.0001, a.ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.22, a.ctx.currentTime + 0.03)
      gain.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + 0.35)
      o.connect(gain); gain.connect(a.master)
      o.start(); o.stop(a.ctx.currentTime + 0.36)
    }

    const step = () => {
      const s = g.current
      const car = s.car
      s.t++
      if (s.boostTimer > 0) s.boostTimer--

      // physics
      const up = s.keys.has('up'), down = s.keys.has('down')
      const left = s.keys.has('left'), right = s.keys.has('right')
      if (up && car.speed < MAX) car.speed += ACCEL
      if (down) car.speed -= REVERSE
      car.speed *= FRICTION
      if (Math.abs(car.speed) < 0.02) car.speed = 0
      // clamp allows temporary boost above MAX; friction decays it back down
      car.speed = Math.max(-MAX * 0.5, Math.min(BOOST_MAX, car.speed))

      const moving = Math.abs(car.speed) > 0.15
      let steer = 0
      if (left) steer -= 1
      if (right) steer += 1
      const drifting = moving && steer !== 0 && Math.abs(car.speed) > MAX * 0.55
      if (moving) {
        const grip = drifting ? 0.78 : 1
        car.angle += steer * TURN * grip * (car.speed >= 0 ? 1 : -1) * Math.min(1, Math.abs(car.speed) / 2)
      }

      const nx = car.x + Math.cos(car.angle) * car.speed
      const ny = car.y + Math.sin(car.angle) * car.speed
      car.x = Math.max(40, Math.min(WORLD.w - 40, nx))
      car.y = Math.max(40, Math.min(WORLD.h - 40, ny))

      // skid marks while drifting
      if (drifting && s.t % 2 === 0) {
        const back = car.angle + Math.PI
        const ox = Math.cos(car.angle + Math.PI / 2) * 7
        const oy = Math.sin(car.angle + Math.PI / 2) * 7
        s.skids.push({ x: car.x + Math.cos(back) * 12 + ox, y: car.y + Math.sin(back) * 12 + oy, a: car.angle, life: 1 })
        s.skids.push({ x: car.x + Math.cos(back) * 12 - ox, y: car.y + Math.sin(back) * 12 - oy, a: car.angle, life: 1 })
      }
      if (s.skids.length > 600) s.skids.splice(0, s.skids.length - 600)

      // dust / exhaust particles
      if (Math.abs(car.speed) > 1 && s.t % 2 === 0) {
        const back = car.angle + Math.PI
        const spread = drifting ? 1.2 : 0.4
        s.particles.push({
          x: car.x + Math.cos(back) * 16,
          y: car.y + Math.sin(back) * 16,
          vx: Math.cos(back) * 0.6 + (Math.random() - 0.5) * spread,
          vy: Math.sin(back) * 0.6 + (Math.random() - 0.5) * spread,
          life: 1, max: 26 + Math.random() * 16,
          r: 3 + Math.random() * 4,
          c: drifting ? '255,255,255' : '180,170,150',
        })
      }
      for (const p of s.particles) {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.95; p.vy *= 0.95
        p.life -= 1 / p.max
      }
      s.particles = s.particles.filter((p) => p.life > 0)

      // camera follow (look ahead a touch in travel direction)
      const lookX = car.x + Math.cos(car.angle) * car.speed * 8
      const lookY = car.y + Math.sin(car.angle) * car.speed * 8
      s.cam.x += (lookX - s.cam.x) * 0.08
      s.cam.y += (lookY - s.cam.y) * 0.08

      // nearest station detection
      let nearest: Station | null = null
      let best = Infinity
      for (const st of STATIONS) {
        const d = Math.hypot(st.x - car.x, st.y - car.y)
        if (d < 95 && d < best) { best = d; nearest = st }
      }
      if (nearest && !s.foundLocal.has(nearest.id)) {
        s.foundLocal.add(nearest.id)
        setFound(new Set(s.foundLocal))
      }
      if ((nearest?.id ?? null) !== s.nearest?.id) {
        s.nearest = nearest
        setActiveId(nearest?.id ?? null)
      }

      // collectibles
      for (const c of s.coins) {
        if (c.taken) continue
        if (Math.hypot(c.x - car.x, c.y - car.y) < 24) {
          c.taken = true
          s.coinCount++
          setCoins(s.coinCount)
          playBlip(620 + Math.min(8, s.coinCount) * 30)
          for (let i = 0; i < 10; i++) {
            const a2 = Math.random() * Math.PI * 2
            const sp = 1 + Math.random() * 2.4
            s.particles.push({
              x: c.x, y: c.y, vx: Math.cos(a2) * sp, vy: Math.sin(a2) * sp,
              life: 1, max: 20 + Math.random() * 12, r: 2 + Math.random() * 2, c: '253,224,71',
            })
          }
        }
      }

      // boost pads
      for (const b of s.boosts) {
        if (Math.hypot(b.x - car.x, b.y - car.y) < 32) {
          if (s.boostTimer < 14) playWhoosh() // fire once per entry, not every frame
          car.speed = Math.max(car.speed, BOOST)
          s.boostTimer = 34
          const back = car.angle + Math.PI
          for (let i = 0; i < 6; i++) {
            const sp = 2 + Math.random() * 2.5
            s.particles.push({
              x: car.x + Math.cos(back) * 14, y: car.y + Math.sin(back) * 14,
              vx: Math.cos(back) * sp + (Math.random() - 0.5),
              vy: Math.sin(back) * sp + (Math.random() - 0.5),
              life: 1, max: 16 + Math.random() * 8, r: 3 + Math.random() * 3, c: '34,211,238',
            })
          }
        }
      }

      // engine sound follows speed (silent while master gain is 0)
      const a = audioRef.current
      if (a) {
        const rev = 55 + Math.min(1, Math.abs(car.speed) / MAX) * 150 + (s.boostTimer > 0 ? 90 : 0)
        a.engOsc.frequency.setTargetAtTime(rev, a.ctx.currentTime, 0.08)
        a.engOsc2.frequency.setTargetAtTime(rev * 1.5, a.ctx.currentTime, 0.08)
        a.filter.frequency.setTargetAtTime(500 + Math.abs(car.speed) * 130, a.ctx.currentTime, 0.1)
      }

      setSpeedKmh(Math.round(Math.abs(car.speed) * 18))

      draw(ctx)
      rafRef.current = requestAnimationFrame(step)
    }

    const draw = (ctx: CanvasRenderingContext2D) => {
      const s = g.current
      const { w, h } = s.view
      const camX = s.cam.x - w / 2
      const camY = s.cam.y - h / 2

      // background
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, '#0b1020')
      bg.addColorStop(1, '#0a1530')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      ctx.save()
      ctx.translate(-camX, -camY)

      // ground grid
      const grid = 80
      const x0 = Math.floor(camX / grid) * grid
      const y0 = Math.floor(camY / grid) * grid
      ctx.strokeStyle = 'rgba(120,160,255,0.06)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let x = x0; x < camX + w + grid; x += grid) { ctx.moveTo(x, camY); ctx.lineTo(x, camY + h) }
      for (let y = y0; y < camY + h + grid; y += grid) { ctx.moveTo(camX, y); ctx.lineTo(camX + w, y) }
      ctx.stroke()

      // world border
      ctx.strokeStyle = 'rgba(120,160,255,0.25)'
      ctx.lineWidth = 4
      ctx.strokeRect(0, 0, WORLD.w, WORLD.h)

      // skid marks (under everything)
      ctx.lineCap = 'round'
      for (const sk of s.skids) {
        ctx.strokeStyle = `rgba(20,20,30,${0.35 * sk.life})`
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(sk.x, sk.y)
        ctx.lineTo(sk.x - Math.cos(sk.a) * 6, sk.y - Math.sin(sk.a) * 6)
        ctx.stroke()
        sk.life -= 0.0015
      }
      s.skids = s.skids.filter((sk) => sk.life > 0)

      // boost pads (ground level)
      for (const b of s.boosts) {
        if (b.x < camX - 60 || b.x > camX + w + 60 || b.y < camY - 60 || b.y > camY + h + 60) continue
        ctx.save()
        ctx.translate(b.x, b.y)
        ctx.rotate(b.angle)
        ctx.fillStyle = 'rgba(8,47,73,0.65)'
        roundRect(ctx, -24, -18, 48, 36, 9)
        ctx.fill()
        ctx.strokeStyle = 'rgba(34,211,238,0.5)'
        ctx.lineWidth = 2
        ctx.stroke()
        for (let i = 0; i < 3; i++) {
          const off = i * 13 - 14
          const al = 0.35 + 0.55 * (0.5 + 0.5 * Math.sin(s.t * 0.18 - i * 0.7))
          ctx.fillStyle = `rgba(34,211,238,${al})`
          ctx.beginPath()
          ctx.moveTo(off - 5, -12)
          ctx.lineTo(off + 7, 0)
          ctx.lineTo(off - 5, 12)
          ctx.lineTo(off - 1, 12)
          ctx.lineTo(off + 11, 0)
          ctx.lineTo(off - 1, -12)
          ctx.closePath()
          ctx.fill()
        }
        ctx.restore()
      }

      // station pads
      for (const st of STATIONS) {
        const pulse = 0.5 + 0.5 * Math.sin(s.t * 0.05 + st.x)
        const near = s.nearest?.id === st.id
        // glow pad
        const grad = ctx.createRadialGradient(st.x, st.y, 4, st.x, st.y, 90)
        grad.addColorStop(0, hexA(st.color, 0.45))
        grad.addColorStop(1, hexA(st.color, 0))
        ctx.fillStyle = grad
        ctx.beginPath(); ctx.arc(st.x, st.y, 90, 0, Math.PI * 2); ctx.fill()
        // ring
        ctx.strokeStyle = hexA(st.color, near ? 0.9 : 0.5)
        ctx.lineWidth = near ? 4 : 2
        ctx.beginPath(); ctx.arc(st.x, st.y, 50 + pulse * 8, 0, Math.PI * 2); ctx.stroke()
        // emoji marker
        ctx.font = '30px serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(st.emoji, st.x, st.y)
        // label
        ctx.font = '600 14px ui-sans-serif, system-ui'
        ctx.fillStyle = '#fff'
        ctx.fillText(st.title, st.x, st.y - 66)
      }

      // coins
      for (const c of s.coins) {
        if (c.taken) continue
        if (c.x < camX - 40 || c.x > camX + w + 40 || c.y < camY - 40 || c.y > camY + h + 40) continue
        const spin = Math.cos(s.t * 0.1 + c.spin)
        const width = Math.abs(spin) * 7 + 2
        const bob = Math.sin(s.t * 0.08 + c.spin) * 3
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.22)'
        ctx.beginPath(); ctx.ellipse(c.x, c.y + 9, 6, 2.5, 0, 0, Math.PI * 2); ctx.fill()
        // coin face (squash to fake spin)
        ctx.fillStyle = spin >= 0 ? '#fde047' : '#eab308'
        ctx.beginPath(); ctx.ellipse(c.x, c.y - 4 + bob, width, 9, 0, 0, Math.PI * 2); ctx.fill()
        ctx.strokeStyle = '#a16207'; ctx.lineWidth = 1.5; ctx.stroke()
      }

      // decorations
      for (const p of s.props) {
        if (p.x < camX - 60 || p.x > camX + w + 60 || p.y < camY - 60 || p.y > camY + h + 60) continue
        // shadow
        ctx.fillStyle = 'rgba(0,0,0,0.25)'
        ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + p.r * 0.5, p.r, p.r * 0.45, 0, 0, Math.PI * 2); ctx.fill()
        if (p.kind === 'tree') {
          ctx.fillStyle = `hsl(${p.hue},45%,32%)`
          ctx.beginPath(); ctx.arc(p.x, p.y - p.r * 0.4, p.r, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = `hsl(${p.hue},50%,42%)`
          ctx.beginPath(); ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.6, p.r * 0.7, 0, Math.PI * 2); ctx.fill()
        } else if (p.kind === 'rock') {
          ctx.fillStyle = '#3a4358'
          ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = '#4d586f'
          ctx.beginPath(); ctx.arc(p.x - p.r * 0.25, p.y - p.r * 0.25, p.r * 0.6, 0, Math.PI * 2); ctx.fill()
        } else {
          // cone
          ctx.fillStyle = '#f97316'
          ctx.beginPath()
          ctx.moveTo(p.x, p.y - p.r)
          ctx.lineTo(p.x + p.r * 0.7, p.y + p.r * 0.7)
          ctx.lineTo(p.x - p.r * 0.7, p.y + p.r * 0.7)
          ctx.closePath(); ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.fillRect(p.x - p.r * 0.5, p.y - p.r * 0.05, p.r, p.r * 0.28)
        }
      }

      // particles
      for (const p of s.particles) {
        ctx.fillStyle = `rgba(${p.c},${0.5 * p.life})`
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + p.life), 0, Math.PI * 2); ctx.fill()
      }

      // the car
      drawCar(ctx, s.car, s.boostTimer > 0)

      ctx.restore()

      // minimap
      drawMinimap(ctx, s, w)
    }

    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [started])

  const resetCar = () => {
    const s = g.current
    s.car = { x: 1900, y: 1500, angle: -Math.PI / 2, speed: 0 }
    s.cam = { x: 1900, y: 1500 }
    s.skids = []
    s.particles = []
    s.boostTimer = 0
  }

  // tear down the audio context when leaving the page
  useEffect(() => {
    return () => { audioRef.current?.ctx.close().catch(() => {}) }
  }, [])

  const total = STATIONS.length
  const coinTotal = g.current.coins.length

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Creative World</h1>
        <span className="hidden text-sm text-neutral-500 sm:inline">
          Drive a little car to explore — inspired by Bruno Simon&apos;s portfolio
        </span>
        <div className="ml-auto flex items-center gap-3 text-sm">
          <span className="rounded-full bg-neutral-900 px-3 py-1 font-mono text-white">
            {speedKmh} km/h
          </span>
          <span className="rounded-full border border-neutral-300 px-3 py-1">
            🪙 {coins}/{coinTotal}
          </span>
          <span className="hidden rounded-full border border-neutral-300 px-3 py-1 sm:inline">
            Discovered {found.size}/{total}
          </span>
          <button
            onClick={toggleSound}
            title={soundOn ? 'Mute' : 'Enable sound'}
            className="rounded-full border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
          >
            {soundOn ? '🔊 Sound' : '🔇 Muted'}
          </button>
          <button
            onClick={resetCar}
            className="rounded-full border border-neutral-300 px-3 py-1 hover:bg-neutral-100"
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div
        ref={wrapRef}
        className="relative flex-1 overflow-hidden rounded-2xl border border-neutral-800 bg-[#0b1020] shadow-inner"
      >
        <canvas ref={canvasRef} className="block h-full w-full touch-none" />

        {/* intro overlay */}
        {!started && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-gradient-to-b from-[#0b1020]/95 to-[#0a1530]/95 text-center">
            <div className="text-6xl">🚗💨</div>
            <h2 className="text-3xl font-bold text-white">Creative World</h2>
            <p className="max-w-md text-neutral-300">
              An interactive, driveable portfolio. Cruise around an open world, roll over the
              glowing pads to discover each section, grab the coins, and hit the cyan boost
              strips for a speed rush. There&apos;s even a hidden section — happy hunting.
            </p>
            <button
              onClick={() => { initAudio(); setStarted(true) }}
              className="rounded-xl bg-cyan-400 px-8 py-3 text-lg font-bold text-neutral-900 transition hover:bg-cyan-300"
            >
              Start driving
            </button>
            <p className="text-xs text-neutral-400">
              WASD / Arrows to drive · hold a turn at speed to drift · 🪙 collect coins · ⚡ hit boost pads · 🔊 sound is off by default
            </p>
          </div>
        )}

        {/* active station panel */}
        {started && activeId && (() => {
          const st = STATIONS.find((x) => x.id === activeId)!
          return (
            <div
              className="pointer-events-none absolute left-4 top-4 max-w-xs rounded-2xl border border-white/10 bg-black/55 p-4 text-white backdrop-blur-md transition"
              style={{ boxShadow: `0 0 0 1px ${hexA(st.color, 0.4)}, 0 8px 40px ${hexA(st.color, 0.25)}` }}
            >
              <div className="mb-1 flex items-center gap-2">
                <span className="text-2xl">{st.emoji}</span>
                <div>
                  <div className="text-xs uppercase tracking-widest" style={{ color: st.color }}>{st.tag}</div>
                  <div className="text-lg font-bold leading-none">{st.title}</div>
                </div>
              </div>
              <p className="text-sm text-neutral-200">{st.desc}</p>
            </div>
          )
        })()}

        {/* on-screen controls (touch / click) */}
        {started && (
          <div className="absolute bottom-4 right-4 grid grid-cols-3 gap-1.5 select-none">
            <div />
            <ControlBtn label="↑" onChange={(d) => press('up', d)} />
            <div />
            <ControlBtn label="←" onChange={(d) => press('left', d)} />
            <ControlBtn label="↓" onChange={(d) => press('down', d)} />
            <ControlBtn label="→" onChange={(d) => press('right', d)} />
          </div>
        )}
      </div>
    </div>
  )
}

/* on-screen drive button — works for mouse + touch */
function ControlBtn({ label, onChange }: { label: string; onChange: (down: boolean) => void }) {
  return (
    <button
      onPointerDown={(e) => { e.preventDefault(); onChange(true) }}
      onPointerUp={() => onChange(false)}
      onPointerLeave={() => onChange(false)}
      onPointerCancel={() => onChange(false)}
      className="h-12 w-12 rounded-xl border border-white/15 bg-white/10 text-xl font-bold text-white backdrop-blur transition active:bg-cyan-400 active:text-neutral-900"
    >
      {label}
    </button>
  )
}

/* ----- draw helpers ----- */
function drawCar(ctx: CanvasRenderingContext2D, car: { x: number; y: number; angle: number }, boost = false) {
  ctx.save()
  ctx.translate(car.x, car.y)
  ctx.rotate(car.angle)
  // shadow
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath(); ctx.ellipse(2, 4, 20, 12, 0, 0, Math.PI * 2); ctx.fill()
  // boost flames out the back (local -x is the rear)
  if (boost) {
    const len = 14 + Math.random() * 12
    ctx.fillStyle = 'rgba(34,211,238,0.85)'
    ctx.beginPath(); ctx.moveTo(-18, -7); ctx.lineTo(-18 - len, 0); ctx.lineTo(-18, 7); ctx.closePath(); ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.9)'
    ctx.beginPath(); ctx.moveTo(-18, -4); ctx.lineTo(-18 - len * 0.6, 0); ctx.lineTo(-18, 4); ctx.closePath(); ctx.fill()
  }
  // wheels
  ctx.fillStyle = '#111'
  ctx.fillRect(-14, -13, 9, 6)
  ctx.fillRect(-14, 7, 9, 6)
  ctx.fillRect(8, -13, 9, 6)
  ctx.fillRect(8, 7, 9, 6)
  // body
  const body = ctx.createLinearGradient(-18, 0, 18, 0)
  body.addColorStop(0, '#ef4444')
  body.addColorStop(1, '#f97316')
  ctx.fillStyle = body
  roundRect(ctx, -18, -11, 36, 22, 7)
  ctx.fill()
  // windshield / cabin
  ctx.fillStyle = '#bae6fd'
  roundRect(ctx, -2, -8, 12, 16, 4)
  ctx.fill()
  // headlights
  ctx.fillStyle = '#fff7cc'
  ctx.beginPath(); ctx.arc(17, -6, 2.2, 0, Math.PI * 2); ctx.fill()
  ctx.beginPath(); ctx.arc(17, 6, 2.2, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  s: { car: { x: number; y: number }; boosts: BoostPad[] },
  w: number,
) {
  const mw = 150, mh = (WORLD.h / WORLD.w) * 150
  const x = w - mw - 16, y = 16
  const sx = mw / WORLD.w, sy = mh / WORLD.h
  ctx.save()
  ctx.fillStyle = 'rgba(10,16,32,0.7)'
  roundRect(ctx, x - 6, y - 6, mw + 12, mh + 12, 10)
  ctx.fill()
  ctx.strokeStyle = 'rgba(120,160,255,0.3)'
  ctx.lineWidth = 1
  ctx.strokeRect(x, y, mw, mh)
  // boost pads
  for (const b of s.boosts) {
    ctx.fillStyle = 'rgba(34,211,238,0.7)'
    ctx.fillRect(x + b.x * sx - 1.5, y + b.y * sy - 1.5, 3, 3)
  }
  // stations
  for (const st of STATIONS) {
    ctx.fillStyle = st.secret ? 'rgba(252,211,77,0.5)' : hexA(st.color, 0.9)
    ctx.beginPath(); ctx.arc(x + st.x * sx, y + st.y * sy, st.secret ? 2 : 3, 0, Math.PI * 2); ctx.fill()
  }
  // car
  ctx.fillStyle = '#fff'
  ctx.beginPath(); ctx.arc(x + s.car.x * sx, y + s.car.y * sy, 3, 0, Math.PI * 2); ctx.fill()
  ctx.restore()
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function hexA(hex: string, a: number) {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16)
  const g = parseInt(m.slice(2, 4), 16)
  const b = parseInt(m.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
