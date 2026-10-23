// 3D 장면 — 정사영 카메라로 비스듬히 내려다보는 디오라마 (시제품과 같은 구도).
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, OrthographicCamera, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Agent, Terminal } from '../types.ts';
import { Room } from './Room.tsx';
import { Character, seated, type CastMember } from './Characters.tsx';
import { direct, colorOf, doorSpot } from './director.ts';
import { W, D, DESKS, SCREEN, SCREEN_OFF } from './layout.ts';

const CX = W / 2, CZ = D / 2;

function Screens() {
  const meshes = useRef<THREE.Mesh[]>([]);
  const t = useRef(0);
  useFrame((_, dt) => {
    t.current += dt;
    meshes.current.forEach((m, i) => {
      if (!m) return;
      const act = seated.get(i);
      const c = (m.material as THREE.MeshBasicMaterial).color;
      c.setHex(act ? SCREEN[act] : SCREEN_OFF);
      if (act === 'code' && Math.sin(t.current * 14 + i) > 0.6) c.offsetHSL(0, 0, 0.06);   // 타자 깜빡임
    });
  });
  return (
    <>
      {DESKS.map(([x, z], i) => (
        <mesh key={i} ref={(m) => { if (m) meshes.current[i] = m; }} position={[x, 1.35, z - 0.215]}>
          <planeGeometry args={[0.7, 0.4]} />
          <meshBasicMaterial color={SCREEN_OFF} />
        </mesh>
      ))}
    </>
  );
}

// tmux 세션 — 왼쪽 벽의 모니터. 붙어 있으면 초록, claude 가 돌면 보라 테두리
function TerminalWall({ terminals }: { terminals: Terminal[] }) {
  return (
    <>
      {terminals.slice(0, 4).map((t, i) => {
        const z = 1.7 + i * 1.15;
        return (
          <group key={t.name} position={[0.04, 1.85, z]} rotation={[0, Math.PI / 2, 0]}>
            <mesh position={[0, 0, -0.01]}>
              <planeGeometry args={[0.98, 0.66]} />
              <meshBasicMaterial color={t.claude ? 0x7f77dd : 0x2c2c2a} />
            </mesh>
            <mesh>
              <planeGeometry args={[0.86, 0.54]} />
              <meshBasicMaterial color={t.attached ? 0x9fe1cb : 0x2a3a52} />
            </mesh>
            <Html position={[0, -0.5, 0]} center zIndexRange={[5, 0]} style={{ pointerEvents: 'none' }}>
              <div className="tlbl">{t.name}</div>
            </Html>
          </group>
        );
      })}
    </>
  );
}

// 창 크기에 맞춰 장면이 들어오게 확대값을 잡는다 (휠 확대는 OrbitControls 가)
function Fit() {
  const { camera, size } = useThree();
  useEffect(() => {
    const asp = size.width / size.height;
    const f = asp > 1.2 ? 8.6 : 11.5;
    (camera as THREE.OrthographicCamera).zoom = size.height / (2 * f);
    camera.updateProjectionMatrix();
  }, [camera, size.width, size.height]);
  return null;
}

export function Office({ agents, terminals, selected, onSelect }: {
  agents: Agent[]; terminals: Terminal[]; selected: string | null; onSelect: (id: string | null) => void;
}) {
  // 사라진 에이전트는 문까지 걸어 나간 뒤 지운다
  const [leaving, setLeaving] = useState<Map<string, CastMember>>(new Map());
  const prev = useRef<Map<string, CastMember>>(new Map());
  const first = useRef(true);

  const cast = useMemo(() => {
    const places = direct(agents);
    const now = new Map<string, CastMember>();
    for (const a of agents) {
      const old = prev.current.get(a.id);
      now.set(a.id, {
        agent: a,
        place: places.get(a.id)!,
        color: colorOf(a, agents),
        leaving: false,
        enterAt: old ? old.enterAt : first.current ? null : doorSpot(),
      });
    }
    first.current = false;
    return now;
  }, [agents]);

  useEffect(() => {
    const gone = [...prev.current.values()].filter((m) => !cast.has(m.agent.id));
    if (gone.length) {
      setLeaving((l) => {
        const n = new Map(l);
        for (const m of gone) n.set(m.agent.id, { ...m, leaving: true, place: { ...m.place, target: doorSpot(), pose: 'stand', desk: null } });
        return n;
      });
    }
    prev.current = cast;
  }, [cast]);

  const done = (id: string) => setLeaving((l) => { const n = new Map(l); n.delete(id); return n; });
  const members = [...cast.values(), ...[...leaving.values()].filter((m) => !cast.has(m.agent.id))];

  return (
    <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: true }} onPointerMissed={() => onSelect(null)}>
      <OrthographicCamera makeDefault position={[CX + 18, 17, CZ + 18]} near={0.1} far={200} />
      <Fit />
      <OrbitControls target={[CX, 0.5, CZ]} enableDamping enablePan={false}
        minZoom={15} maxZoom={120} minPolarAngle={0.5} maxPolarAngle={1.15} />
      <hemisphereLight args={[0xffffff, 0xb4b2a9, 0.75 * Math.PI]} />
      <directionalLight position={[CX + 10, 18, CZ + 6]} intensity={0.7 * Math.PI} castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0008}
        shadow-camera-left={-16} shadow-camera-right={16} shadow-camera-top={16} shadow-camera-bottom={-16}
        shadow-camera-near={1} shadow-camera-far={70}
        onUpdate={(l) => { l.target.position.set(CX, 0, CZ); l.target.updateMatrixWorld(); }} />
      <Room />
      <Screens />
      <TerminalWall terminals={terminals} />
      {members.map((m) => (
        <Character key={m.agent.id} m={m} selected={selected === m.agent.id}
          onArrivedOut={done} onSelect={onSelect} />
      ))}
    </Canvas>
  );
}
