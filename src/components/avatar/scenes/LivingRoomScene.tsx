/**
 * Living Room Scene - Built-in 3D Background
 * Cozy living room with sofa, coffee table, floor lamp, and decorations
 */

export interface SceneProps {
  y: number; // Floor Y position
}

export function LivingRoomScene({ y }: SceneProps) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#c4a882" roughness={0.9} />
      </mesh>
      {/* Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y + 0.005, 0.2]} receiveShadow>
        <planeGeometry args={[3, 1.8]} />
        <meshStandardMaterial color="#8b3a3a" roughness={1} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, y + 2, -2.6]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#f0ebe0" roughness={1} />
      </mesh>
      {/* Sofa */}
      <group position={[0.3, y + 0.24, -2.0]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.0, 0.38, 0.75]} />
          <meshStandardMaterial color="#7a7a8a" roughness={0.92} />
        </mesh>
        <mesh position={[0, 0.37, -0.3]} castShadow>
          <boxGeometry args={[2.0, 0.62, 0.16]} />
          <meshStandardMaterial color="#7a7a8a" roughness={0.92} />
        </mesh>
        {([-0.9, 0.9] as number[]).map((ax, i) => (
          <mesh key={i} position={[ax, 0.22, -0.15]} castShadow>
            <boxGeometry args={[0.12, 0.48, 0.6]} />
            <meshStandardMaterial color="#6a6a7a" roughness={0.92} />
          </mesh>
        ))}
      </group>
      {/* Coffee table */}
      <mesh position={[0, y + 0.21, 0.6]} castShadow receiveShadow>
        <boxGeometry args={[0.85, 0.05, 0.45]} />
        <meshStandardMaterial color="#4a3218" roughness={0.45} metalness={0.1} />
      </mesh>
      {/* Table legs */}
      {([ [-0.38,-0.12, 0.18],[ 0.38,-0.12, 0.18],[-0.38,-0.12,-0.18],[ 0.38,-0.12,-0.18] ] as [number,number,number][]).map((p,i)=>(
        <mesh key={i} position={[p[0], y + 0.21 + p[1], p[2]+0.6]} castShadow>
          <boxGeometry args={[0.04, 0.22, 0.04]} />
          <meshStandardMaterial color="#3a2510" roughness={0.6} />
        </mesh>
      ))}
      {/* Floor lamp (left) */}
      <group position={[-1.7, y, -1.9]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.03, 0.03, 1.3, 8]} />
          <meshStandardMaterial color="#c0a060" roughness={0.3} metalness={0.7} />
        </mesh>
        <mesh position={[0, 0.72, 0]} castShadow>
          <coneGeometry args={[0.22, 0.32, 14, 1, true]} />
          <meshStandardMaterial color="#f5e6c8" roughness={0.9} side={2} />
        </mesh>
        <pointLight position={[0, 0.55, 0]} intensity={1.5} color="#ffcc88" distance={4} decay={2} />
      </group>
      {/* Plant (right) */}
      <group position={[2.0, y, -2.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.15, 0.12, 0.3, 12]} />
          <meshStandardMaterial color="#6b4226" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.48, 0]} castShadow>
          <sphereGeometry args={[0.32, 10, 8]} />
          <meshStandardMaterial color="#2d7a2d" roughness={0.95} />
        </mesh>
      </group>
      {/* Picture frame on wall */}
      <group position={[-0.6, y + 1.5, -2.55]}>
        <mesh castShadow>
          <boxGeometry args={[0.7, 0.5, 0.03]} />
          <meshStandardMaterial color="#2a1a0a" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[0.58, 0.38]} />
          <meshStandardMaterial color="#2255aa" roughness={1} emissive="#1a3a88" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}
