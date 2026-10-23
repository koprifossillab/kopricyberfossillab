// 움직이지 않는 것 — 바닥·벽·가구. 시제품 agent-office-3d.html 의 bx() 호출을 옮겼다.
import { useMemo } from 'react';
import * as THREE from 'three';
import {
  W, D, DESKS, SOFAS, TABLES, COFFEE, CORE_RACK, BENCH, PLANTS, DOOR,
} from './layout.ts';

const mats = new Map<number, THREE.MeshLambertMaterial>();
export function mat(c: number): THREE.MeshLambertMaterial {
  let m = mats.get(c);
  if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true }); mats.set(c, m); }
  return m;
}

export function Box({ s, p, c, cast = true }: { s: [number, number, number]; p: [number, number, number]; c: number; cast?: boolean }) {
  return (
    <mesh position={p} castShadow={cast} receiveShadow material={mat(c)}>
      <boxGeometry args={s} />
    </mesh>
  );
}

function Desk({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <Box s={[2, 0.1, 0.9]} p={[x, 0.78, z]} c={0xd4a373} />
      <Box s={[0.1, 0.74, 0.8]} p={[x - 0.92, 0.37, z]} c={0xb07a48} />
      <Box s={[0.1, 0.74, 0.8]} p={[x + 0.92, 0.37, z]} c={0xb07a48} />
      <Box s={[0.08, 0.3, 0.08]} p={[x, 0.98, z - 0.25]} c={0x444441} />
      <Box s={[0.8, 0.5, 0.06]} p={[x, 1.35, z - 0.25]} c={0x2c2c2a} />
      <Box s={[0.6, 0.08, 0.6]} p={[x, 0.48, z + 0.85]} c={0x5f5e5a} />
      <Box s={[0.6, 0.55, 0.08]} p={[x, 0.75, z + 1.15]} c={0x5f5e5a} />
      <Box s={[0.08, 0.44, 0.08]} p={[x, 0.22, z + 0.85]} c={0x444441} />
    </group>
  );
}

function Sofa({ x, z }: { x: number; z: number }) {
  const parts: [number, number, number, number, number, number][] = [
    [1.8, 0.35, 0.8, 0, 0.2, 0], [1.8, 0.5, 0.2, 0, 0.5, 0.32], [0.2, 0.45, 0.8, -0.9, 0.35, 0], [0.2, 0.45, 0.8, 0.9, 0.35, 0],
  ];
  return (
    <group position={[x, 0, z]} rotation={[0, Math.PI, 0]}>
      {parts.map(([w, h, d, a, b, c], i) => <Box key={i} s={[w, h, d]} p={[a, b, c]} c={i === 0 ? 0xed93b1 : 0xd4537e} />)}
    </group>
  );
}

function Plant({ x, z, h }: { x: number; z: number; h: number }) {
  return (
    <group>
      <Box s={[0.6, 0.5, 0.6]} p={[x, 0.25, z]} c={0xd85a30} />
      <mesh position={[x, 0.5 + h / 2, z]} castShadow material={mat(0x639922)}><coneGeometry args={[0.5, h, 6]} /></mesh>
      <mesh position={[x, 0.5 + h * 0.75, z]} castShadow material={mat(0x3b6d11)}><coneGeometry args={[0.38, h * 0.7, 6]} /></mesh>
    </group>
  );
}

// 코어 보관대 — 선반 네 단에 시추 코어(원기둥)를 눕혀 둔다
function CoreRack() {
  const { x, z, len } = CORE_RACK;
  const cores = useMemo(() => {
    const out: { y: number; z: number; l: number; c: number }[] = [];
    const colors = [0x8a7a62, 0x6e6a5e, 0xa69272, 0x5c5446, 0xb8a888];
    for (let s = 0; s < 4; s++) for (let k = 0; k < 3; k++) {
      out.push({ y: 0.45 + s * 0.55, z: z - len / 2 + 0.55 + k * 1.05, l: 0.85, c: colors[(s * 3 + k) % colors.length] });
    }
    return out;
  }, [z, len]);
  return (
    <group>
      {[0, 1, 2, 3, 4].map((s) => <Box key={s} s={[0.8, 0.06, len]} p={[x, 0.18 + s * 0.55, z]} c={0x7f77dd} />)}
      <Box s={[0.8, 2.4, 0.08]} p={[x, 1.2, z - len / 2]} c={0x534ab7} />
      <Box s={[0.8, 2.4, 0.08]} p={[x, 1.2, z + len / 2]} c={0x534ab7} />
      {cores.map((c, i) => (
        <mesh key={i} position={[x, c.y + 0.1, c.z]} rotation={[Math.PI / 2, 0, 0]} castShadow material={mat(c.c)}>
          <cylinderGeometry args={[0.12, 0.12, c.l, 8]} />
        </mesh>
      ))}
    </group>
  );
}

// 현미경 책상
function Bench() {
  const { x, z, len } = BENCH;
  return (
    <group>
      <Box s={[0.8, 0.1, len]} p={[x, 0.8, z]} c={0xe8e6df} />
      <Box s={[0.7, 0.75, 0.08]} p={[x, 0.38, z - len / 2 + 0.1]} c={0x888780} />
      <Box s={[0.7, 0.75, 0.08]} p={[x, 0.38, z + len / 2 - 0.1]} c={0x888780} />
      {[z - 0.4, z + 0.45].map((mz, i) => (
        <group key={i}>
          <Box s={[0.3, 0.06, 0.3]} p={[x, 0.88, mz]} c={0x2c2c2a} />
          <Box s={[0.07, 0.4, 0.07]} p={[x + 0.08, 1.1, mz]} c={0x2c2c2a} />
          <mesh position={[x - 0.02, 1.28, mz]} rotation={[0, 0, 0.6]} castShadow material={mat(0x444441)}>
            <cylinderGeometry args={[0.05, 0.06, 0.3, 8]} />
          </mesh>
          <Box s={[0.18, 0.02, 0.18]} p={[x - 0.05, 0.98, mz]} c={0x9fe1cb} cast={false} />
        </group>
      ))}
    </group>
  );
}

export function Room() {
  return (
    <group>
      <Box s={[W, 0.5, D]} p={[W / 2, -0.25, D / 2]} c={0xd3d1c7} cast={false} />
      <gridHelper args={[W, W, 0xbdbbb2, 0xbdbbb2]} scale={[1, 1, D / W]} position={[W / 2, 0.005, D / 2]}
        onUpdate={(g) => { (g.material as THREE.Material).transparent = true; (g.material as THREE.Material).opacity = 0.45; }} />
      <Box s={[W, 3.2, 0.25]} p={[W / 2, 1.6, -0.125]} c={0xcecbf6} />
      <Box s={[0.25, 3.2, D]} p={[-0.125, 1.6, D / 2]} c={0xafa9ec} />
      {/* 화이트보드와 메모 */}
      <Box s={[5, 1.6, 0.06]} p={[W / 2, 1.7, 0.04]} c={0xfafafa} />
      <Box s={[5.2, 0.08, 0.12]} p={[W / 2, 0.88, 0.08]} c={0x888780} />
      {([[6.4, 1.4, 0xfac775], [7.6, 2.0, 0x9fe1cb], [8.6, 1.6, 0xf4c0d1]] as const).map(([x, y, c]) => (
        <Box key={x} s={[0.7, 0.5, 0.03]} p={[x, y, 0.09]} c={c} cast={false} />
      ))}
      {/* 책장 */}
      <Box s={[0.9, 2.6, 0.6]} p={[0.6, 1.3, 0.45]} c={0x7f77dd} />
      {[0xd85a30, 0x378add, 0x1d9e75, 0xef9f27].map((c, i) => <Box key={i} s={[0.7, 0.22, 0.4]} p={[0.6, 0.5 + i * 0.6, 0.55]} c={c} cast={false} />)}
      {DESKS.map(([x, z]) => <Desk key={`${x},${z}`} x={x} z={z} />)}
      {/* 라운지 */}
      <Box s={[9, 0.04, 3.2]} p={[8, 0.02, 12.1]} c={0xfaeeda} cast={false} />
      {SOFAS.map(([x, z]) => <Sofa key={x} x={x} z={z} />)}
      {TABLES.map(([x, z]) => <Box key={x} s={[1.2, 0.35, 0.7]} p={[x, 0.18, z]} c={0xb07a48} />)}
      <Box s={[0.5, 0.12, 0.04]} p={[5.1, 0.4, 11.4]} c={0xfac775} cast={false} />
      {/* 커피 머신 */}
      <Box s={[0.9, 1.1, 0.6]} p={[COFFEE[0], 0.55, COFFEE[1]]} c={0x888780} />
      <Box s={[0.5, 0.3, 0.15]} p={[COFFEE[0], 1.0, COFFEE[1] - 0.3]} c={0x2c2c2a} />
      <Box s={[0.2, 0.12, 0.2]} p={[COFFEE[0], 0.72, COFFEE[1] - 0.35]} c={0xffffff} />
      <CoreRack />
      <Bench />
      {PLANTS.map(([x, z, h]) => <Plant key={`${x},${z}`} x={x} z={z} h={h} />)}
      {/* 문 앞 깔개 */}
      <Box s={[1.2, 0.03, 0.8]} p={[DOOR[0] - 0.1, 0.015, DOOR[1]]} c={0x5f5e5a} cast={false} />
    </group>
  );
}
