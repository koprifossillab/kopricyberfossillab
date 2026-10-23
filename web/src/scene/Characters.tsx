// 캐릭터 — 시제품의 원기둥 몸·구 머리·반구 머리카락·빨간 링. 걸음은 A* 길(nav.ts)을 따른다.
import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Agent } from '../types.ts';
import { findPath } from './nav.ts';
import { mat } from './Room.tsx';
import { STATE_TEXT } from './layout.ts';
import type { Placement } from './director.ts';

const SPEED = 2.2;
const RM = typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;

// 화면(모니터)이 읽는 공유 상태: 지금 어느 책상에 누가 앉아 있나
export const seated = new Map<number, Agent['activity']>();

export interface CastMember {
  agent: Agent;
  place: Placement;
  color: number;
  leaving: boolean;      // 사라진 에이전트 — 문까지 걸어간 뒤 지운다
  enterAt: [number, number] | null;   // 새로 온 에이전트는 문에서 나타난다
}

export function Character({ m, selected, onArrivedOut, onSelect }: {
  m: CastMember; selected: boolean; onArrivedOut: (id: string) => void; onSelect: (id: string) => void;
}) {
  const g = useRef<THREE.Group>(null!);
  const body = useRef<THREE.Mesh>(null!);
  const ring = useRef<THREE.Mesh>(null!);
  const st = useRef({ x: 0, z: 0, path: [] as [number, number][], init: false, t: Math.random() * 10 });
  const scale = m.agent.kind === 'subagent' ? 0.72 : 1;
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({ color: 0xe24b4a, transparent: true, opacity: 0 }), []);
  const hair = m.agent.kind === 'job' ? 0x2c2c2a : m.agent.kind === 'foreign' ? 0x888780 : 0x4a1b0c;

  if (!st.current.init) {
    const p = m.enterAt ?? m.place.target;
    st.current.x = p[0]; st.current.z = p[1]; st.current.init = true;
  }

  const [tx, tz] = m.place.target;
  useEffect(() => {
    const s = st.current;
    s.path = Math.hypot(s.x - tx, s.z - tz) < 0.01 ? [] : findPath([s.x, s.z], [tx, tz]);
  }, [tx, tz]);

  useFrame((_, dtRaw) => {
    const dt = Math.min(0.05, dtRaw);
    const s = st.current;
    s.t += dt;
    let moving = false;
    if (s.path.length) {
      const [px, pz] = s.path[0];
      const dx = px - s.x, dz = pz - s.z, d = Math.hypot(dx, dz), sp = SPEED * dt;
      if (d <= sp) { s.x = px; s.z = pz; s.path.shift(); }
      else { s.x += (dx / d) * sp; s.z += (dz / d) * sp; moving = true; g.current.rotation.y = Math.atan2(dx, dz); }
      if (!s.path.length && m.leaving) onArrivedOut(m.agent.id);
    } else {
      let diff = m.place.face - g.current.rotation.y;
      diff = Math.atan2(Math.sin(diff), Math.cos(diff));
      g.current.rotation.y += diff * Math.min(1, dt * 6);
    }
    const sit = !moving && !m.leaving && m.place.pose === 'sit';
    const bob = moving && !RM ? Math.abs(Math.sin(s.t * 10)) * 0.08 : 0;
    g.current.position.set(s.x, bob + (sit ? 0.12 : 0), s.z);
    body.current.scale.y = sit ? 0.82 : 1;
    const waiting = m.agent.activity === 'wait' && !moving && !m.leaving;
    ringMat.opacity = waiting ? (RM ? 0.8 : 0.5 + 0.4 * Math.sin(s.t * 5)) : selected ? 0.35 : 0;
    ringMat.color.setHex(waiting ? 0xe24b4a : 0x534ab7);
    if (m.place.desk !== null) {
      if (sit) seated.set(m.place.desk, m.agent.activity);
      else if (seated.get(m.place.desk) !== undefined) seated.delete(m.place.desk);
    }
  });

  useEffect(() => () => { if (m.place.desk !== null) seated.delete(m.place.desk); }, [m.place.desk]);

  const wait = m.agent.activity === 'wait';
  const hex = '#' + m.color.toString(16).padStart(6, '0');
  return (
    <group ref={g} scale={scale} onClick={(e) => { e.stopPropagation(); onSelect(m.agent.id); }}>
      <mesh ref={body} position={[0, 0.42, 0]} castShadow material={mat(m.color)}>
        <cylinderGeometry args={[0.26, 0.32, 0.75, 8]} />
      </mesh>
      <mesh position={[0, 1.03, 0]} castShadow material={mat(0xf5c4b3)}>
        <sphereGeometry args={[0.24, 10, 8]} />
      </mesh>
      <mesh position={[0, 1.06, 0]} rotation={[-0.25, 0, 0]} material={mat(hair)}>
        <sphereGeometry args={[0.25, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2.2]} />
      </mesh>
      <mesh ref={ring} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={ringMat}>
        <ringGeometry args={[0.42, 0.5, 24]} />
      </mesh>
      {m.agent.kind !== 'subagent' && (
        <Html position={[0, 1.6, 0]} center zIndexRange={[10, 0]} style={{ pointerEvents: 'none' }}>
          <div className={'lbl' + (wait ? ' wait' : '') + (selected ? ' sel' : '')}>
            <i style={{ background: hex }} />
            {m.agent.name}
            {wait && <span> · {STATE_TEXT.wait}{m.agent.guessed ? '?' : ''}</span>}
          </div>
        </Html>
      )}
    </group>
  );
}
