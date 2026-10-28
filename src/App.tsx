import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import gsap from 'gsap'

type World = 0 | 1 | 2 | 3 | 4
const worlds = [
  { name: 'La revelación', num: 'I', line: 'Hay cosas que solo se revelan cuando comienzan a desaparecer.', action: 'TOCÁ LA FLOR · DEJÁ QUE LLUEVA' },
  { name: 'La fragilidad', num: 'II', line: 'Somos aquello que intenta permanecer, aun sabiendo que todo cambia.', action: 'MOVÉ EL CURSOR · REUNÍ LOS FRAGMENTOS' },
  { name: 'Lo inmenso', num: 'III', line: 'El universo es inmenso. Nuestra existencia, apenas un instante.', action: 'TOCÁ UNA ESTRELLA · MIRÁ MÁS LEJOS' },
  { name: 'El infinito interior', num: 'IV', line: 'Quizás no somos pequeños. Quizás todavía no aprendimos a mirar.', action: 'ACERCATE · EXPLORÁ LA GOTA' },
  { name: 'Lo efímero', num: 'V', line: 'No somos eternos. Tal vez por eso somos extraordinarios.', action: 'ALTERÁ EL TIEMPO · TOCÁ UN PÉTALO' },
] as const
const thoughts = ['Todo instante contiene una vida.', 'Estamos hechos de distancias.', 'La luz también tarda en encontrarnos.', 'Hasta el silencio tiene memoria.']

function petalGeometry() {
  const vertices: number[] = [], uvs: number[] = [], indices: number[] = []
  const rows = 22, cols = 12
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    const width = Math.sin(Math.PI * Math.pow(t, .82)) * .42 * (1 + t * .3)
    for (let j = 0; j <= cols; j++) {
      const s = j / cols * 2 - 1
      vertices.push(s * width, t * 1.45, Math.sin(Math.PI * t) * .22 + s * s * .18 * t)
      uvs.push(j / cols, t)
      if (i < rows && j < cols) { const a = i * (cols + 1) + j; indices.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2) }
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); g.setIndex(indices); g.computeVertexNormals()
  return g
}
const vertex = `varying vec2 vUv; varying vec3 vNormal; uniform float uTime; void main(){vUv=uv;vNormal=normal;vec3 p=position;p.z+=sin(uTime*.7+uv.y*4.)*.012*uv.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`
const fragment = `varying vec2 vUv; varying vec3 vNormal; uniform float uWet; uniform float uTime; void main(){float central=exp(-pow((vUv.x-.5)*52.,2.));float veins=pow(abs(sin(vUv.y*41.+abs(vUv.x-.5)*32.)),23.)*exp(-abs(vUv.x-.5)*2.);float edge=smoothstep(0.,.12,vUv.x)*smoothstep(0.,.12,1.-vUv.x);float shade=.77+.23*abs(vNormal.z);vec3 cream=vec3(.94,.94,.88);vec3 glass=vec3(.62,.88,.93);vec3 c=mix(cream,glass,uWet*.87)*shade;c=mix(c,vec3(.45,.68,.72),clamp(central*.7+veins*.44,0.,1.));float alpha=mix(.94,.24,uWet)+min(1.,central+veins)*uWet*.55;gl_FragColor=vec4(c,alpha*edge);}`

function Flower({ wet, world, time, onTouch, reduced }: { wet: number, world: World, time: number, onTouch: () => void, reduced: boolean }) {
  const group = useRef<THREE.Group>(null); const mats = useRef<THREE.ShaderMaterial[]>([])
  const geo = useMemo(petalGeometry, [])
  useFrame((s) => {
    mats.current.forEach(m => { if (m) { m.uniforms.uWet.value = wet; m.uniforms.uTime.value = s.clock.elapsedTime } })
    if (group.current && !reduced) { group.current.rotation.y = THREE.MathUtils.lerp(group.current.rotation.y, s.pointer.x * .25, .025); group.current.rotation.x = THREE.MathUtils.lerp(group.current.rotation.x, -.22 + s.pointer.y * .16, .025); group.current.scale.setScalar(1 + Math.sin(s.clock.elapsedTime * .85) * .012) }
  })
  if (world !== 0 && world !== 4) return null
  return <group ref={group} position={[0, -.25, 0]} rotation={[-.22, 0, 0]} onPointerDown={(e) => { e.stopPropagation(); onTouch() }}>
    <mesh position={[0, -.61, -.12]}><cylinderGeometry args={[.018, .028, 2.5, 8]} /><meshStandardMaterial color="#617f79" /></mesh>
    <mesh position={[0, .1, .02]}><sphereGeometry args={[.17, 18, 18]} /><meshStandardMaterial color="#d8ce94" roughness={.75} /></mesh>
    {Array.from({ length: 7 }, (_, i) => <group key={i} rotation={[.2, 0, i * Math.PI * 2 / 7]}>
      <mesh geometry={geo} position={[0, .09, 0]} rotation={[-.24, 0, 0]}>
        <shaderMaterial ref={m => { if (m) mats.current[i] = m }} vertexShader={vertex} fragmentShader={fragment} uniforms={{ uWet: { value: wet }, uTime: { value: 0 } }} side={THREE.DoubleSide} transparent depthWrite={false} />
      </mesh>
    </group>)}
    {world === 4 && Array.from({ length: Math.floor(time * 7) }, (_, i) => <mesh key={i} position={[Math.sin(i * 2.4) * (1 + time), -1.2 - i * .11, .1]} rotation={[0, 0, i]} onPointerDown={e => { e.stopPropagation(); onTouch() }}><sphereGeometry args={[.045, 8, 8]} /><meshBasicMaterial color="#e8c28a" /></mesh>)}
  </group>
}

function Field({ world, wet, memory, onDiscover, reduced }: { world: World, wet: number, memory: number, onDiscover: (n: number) => void, reduced: boolean }) {
  const points = useRef<THREE.Points>(null); const { pointer } = useThree()
  const count = 850
  const positions = useMemo(() => { const a = new Float32Array(count * 3); for (let i = 0; i < count; i++) { const r = Math.sqrt(Math.random()) * 7; const angle = Math.random() * Math.PI * 2; a[i * 3] = Math.cos(angle) * r; a[i * 3 + 1] = Math.sin(angle) * r; a[i * 3 + 2] = (Math.random() - .5) * 5 } return a }, [])
  useFrame(s => { if (points.current && !reduced) { points.current.rotation.z = s.clock.elapsedTime * .004 + pointer.x * .025; points.current.rotation.y = pointer.y * .045; points.current.scale.setScalar(world === 1 ? 1 + Math.sin(s.clock.elapsedTime) * .025 : 1) } })
  const color = world === 1 ? '#e7b6bc' : world === 2 ? '#d4bd91' : world === 3 ? '#7ce5b2' : world === 4 ? '#dba66b' : '#a8dce8'
  return <group><points ref={points} positions-z={-2}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={color} size={world === 1 ? .038 : .022} transparent opacity={world === 0 ? .38 : .78} sizeAttenuation depthWrite={false} /></points>
    {world === 2 && Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[Math.cos(i * 2.4 + memory) * (1.5 + i * .3), Math.sin(i * 2.4) * (1.1 + i * .2), -.2]} onPointerDown={e => { e.stopPropagation(); onDiscover(i) }}><sphereGeometry args={[.034 + i % 3 * .015, 12, 12]} /><meshBasicMaterial color="#fff4d9" /></mesh>)}
    {world === 3 && <group><mesh><sphereGeometry args={[1.38, 48, 48]} /><meshPhysicalMaterial color="#37b8ae" transparent opacity={.13} roughness={.1} transmission={.4} side={THREE.DoubleSide} /></mesh><mesh><torusGeometry args={[1.05, .006, 6, 90]} /><meshBasicMaterial color="#7ce5b2" transparent opacity={.5} /></mesh></group>}
    {world === 0 && wet > 0 && Array.from({ length: 70 }, (_, i) => <mesh key={i} position={[Math.sin(i * 71.7) * 4.8, ((i * .34 - wet * 8) % 9 + 9) % 9 - 4, -1]}><sphereGeometry args={[.012, 5, 5]} /><meshBasicMaterial color="#a8dce8" transparent opacity={.6} /></mesh>)}
  </group>
}

function Scene(props: { world: World, wet: number, time: number, memory: number, onTouch: () => void, onDiscover: (n: number) => void, reduced: boolean }) {
  return <Canvas camera={{ position: [0, 0, 6.1], fov: 45 }} dpr={[1, 1.7]} gl={{ antialias: true, alpha: true }}><ambientLight intensity={2} /><pointLight position={[2, 3, 4]} intensity={25} color="#b6deea" /><Flower {...props} /><Field {...props} /></Canvas>
}

function App() {
  const [entered, setEntered] = useState(false), [world, setWorld] = useState<World>(0), [wet, setWet] = useState(0), [memory, setMemory] = useState(0), [time, setTime] = useState(.25), [menu, setMenu] = useState(false), [thought, setThought] = useState(''), [reduced, setReduced] = useState(matchMedia('(prefers-reduced-motion: reduce)').matches)
  const [audio, setAudio] = useState(false), [volume, setVolume] = useState(.25)
  const audioCtx = useRef<AudioContext | null>(null), oscillator = useRef<OscillatorNode | null>(null), gain = useRef<GainNode | null>(null)
  const root = useRef<HTMLDivElement>(null), lock = useRef(false)
  useEffect(() => { if (root.current && entered && !reduced) gsap.fromTo(root.current.querySelectorAll('.animate'), { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 1.15, stagger: .13, ease: 'power2.out' }) }, [world, entered, reduced])
  useEffect(() => { if (!audio) { gain.current?.gain.setTargetAtTime(0, audioCtx.current?.currentTime || 0, .2); return } if (!audioCtx.current) { const c = new AudioContext(); const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = 72; g.gain.value = 0; o.connect(g).connect(c.destination); o.start(); audioCtx.current = c; oscillator.current = o; gain.current = g } audioCtx.current.resume(); gain.current!.gain.setTargetAtTime(volume * .09, audioCtx.current.currentTime, .5); oscillator.current!.frequency.setTargetAtTime([72, 88, 55, 110, 65][world], audioCtx.current.currentTime, 1) }, [audio, volume, world])
  useEffect(() => () => { oscillator.current?.stop(); audioCtx.current?.close() }, [])
  const go = (n: number) => { setWorld((((n % 5) + 5) % 5) as World); setMenu(false); setThought(''); setMemory(m => m + .07) }
  useEffect(() => { const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); if (e.key === 'ArrowRight') go(world + 1); if (e.key === 'ArrowLeft') go(world - 1); if ((e.key === 'Enter' || e.key === ' ') && !entered) setEntered(true) }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key) }, [world, entered])
  const onWheel = (e: React.WheelEvent) => { if (!entered || menu || lock.current || Math.abs(e.deltaY) < 8) return; lock.current = true; if (world === 3) setMemory(m => m + e.deltaY * .0001); go(world + Math.sign(e.deltaY)); setTimeout(() => { lock.current = false }, 950) }
  const touch = () => { setMemory(m => m + .12); if (world === 0) setWet(w => Math.min(1, w + .24)); if (world === 4) { setTime(t => Math.min(1, t + .12)); setThought(thoughts[Math.floor(Math.random() * thoughts.length)]) } }
  return <div ref={root} className={`app world-${world}`} onWheel={onWheel}>
    <div className="grain" /><div className="orb orb-one" /><div className="orb orb-two" />
    <div className="scene"><Scene world={world} wet={wet} time={time} memory={memory} onTouch={touch} onDiscover={n => setThought(thoughts[n % thoughts.length])} reduced={reduced} /></div>
    {!entered ? <div className="intro"><div className="eyebrow animate">UNA EXPERIENCIA SOBRE EXISTIR <span>— 001 / ∞</span></div><h1>La flor<br/><em>esqueleto.</em></h1><p>A veces, para revelar lo que somos,<br/> tenemos que volvernos transparentes.</p><button className="enter" onClick={() => setEntered(true)}>ENTRAR EN LA OBRA <span>↗</span></button><div className="intro-foot">UNA OBRA PARA EXPLORAR DESPACIO <span>✳</span> USÁ AURICULARES SI QUERÉS</div></div> : <>
      <header><button className="mark" aria-label="Abrir mundos" aria-expanded={menu} onClick={() => setMenu(!menu)}>✳</button><div className="brand">LA FLOR ESQUELETO <span> / UNA OBRA VIVA</span></div><div className="header-right"><button onClick={() => setAudio(!audio)} aria-label={audio ? 'Silenciar sonido' : 'Activar sonido'}>{audio ? 'SONIDO ON' : 'SONIDO OFF'}</button>{audio && <input aria-label="Volumen" type="range" min="0" max="1" step=".01" value={volume} onChange={e => setVolume(+e.target.value)} />}<button onClick={() => setReduced(!reduced)} aria-label="Alternar movimiento reducido">{reduced ? 'MOVIMIENTO OFF' : 'MOVIMIENTO ON'}</button></div></header>
      {menu && <nav className="world-menu" aria-label="Mundos">{worlds.map((w, i) => <button key={i} onClick={() => go(i)} className={i === world ? 'selected' : ''}><span>{w.num}</span>{w.name}<span>↗</span></button>)}</nav>}
      <main><div className="side-label animate">{worlds[world].num} / V <span>—</span> {worlds[world].name.toUpperCase()}</div><div className="copy"><div className="chapter animate">CAPÍTULO {worlds[world].num} <span>✳</span> {worlds[world].name.toUpperCase()}</div><h2 className="animate">{world === 0 ? <>La belleza de<br/><em>volverse visible.</em></> : world === 1 ? <>Todo cambia.<br/><em>Todo permanece.</em></> : world === 2 ? <>Un instante<br/><em>en el universo.</em></> : world === 3 ? <>Un universo<br/><em>en un instante.</em></> : <>La forma de<br/><em>desaparecer.</em></>}</h2><p className="poem animate">{worlds[world].line}</p>{thought && <p className="thought" onClick={() => setThought('')}>{thought} ×</p>}</div>
      <div className="interaction animate">{worlds[world].action} <span className="line" /></div>
      {world === 0 && <button className="rain-button" onClick={touch}>{wet > .85 ? 'LA FLOR RECUERDA LA LLUVIA' : 'DEJÁ QUE LLUEVA'} <span>↗</span></button>}
      {world === 4 && <label className="time-control">PASO DEL TIEMPO <input type="range" min="0" max="1" step=".01" value={time} onChange={e => setTime(+e.target.value)} /></label>}
      </main><footer><div className="progress">{worlds.map((w, i) => <button key={w.num} title={w.name} aria-label={`Ir a ${w.name}`} onClick={() => go(i)} className={i === world ? 'active' : ''} />)}</div><span>DESLIZÁ PARA CONTINUAR</span><button onClick={() => go(world + 1)}>{world === 4 ? 'VOLVER A EMPEZAR' : 'SIGUIENTE MUNDO'} <b>↗</b></button></footer>
    </>}
  </div>
}
export default App
