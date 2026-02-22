/**
 * Office Scene - Built-in 3D Background
 * Professional office environment with desk, monitor, bookshelf, and plants
 */

export interface SceneProps {
  y: number; // Floor Y position
}

export function OfficeScene({ y }: SceneProps) {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[10, 6]} />
        <meshStandardMaterial color="#1e1a14" roughness={0.85} metalness={0.05} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, y + 2, -2.8]} receiveShadow>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#1a1a2a" roughness={1} />
      </mesh>
      {/* Desk (right, behind avatar) */}
      <group position={[1.3, y + 0.55, -1.0]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[1.4, 0.05, 0.75]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.6} metalness={0.1} />
        </mesh>
        {([ [-0.63,-0.28, 0.32],[ 0.63,-0.28, 0.32],[-0.63,-0.28,-0.32],[ 0.63,-0.28,-0.32] ] as [number,number,number][]).map((p,i)=>(
          <mesh key={i} position={p} castShadow>
            <boxGeometry args={[0.05, 0.52, 0.05]} />
            <meshStandardMaterial color="#3d2810" roughness={0.7} />
          </mesh>
        ))}
      </group>
      {/* Monitor */}
      <group position={[1.1, y + 0.88, -1.2]}>
        <mesh castShadow>
          <boxGeometry args={[0.58, 0.34, 0.04]} />
          <meshStandardMaterial color="#111" roughness={0.3} emissive="#1a4080" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, -0.2, 0.04]}>
          <boxGeometry args={[0.05, 0.09, 0.05]} />
          <meshStandardMaterial color="#555" roughness={0.4} metalness={0.8} />
        </mesh>
        <mesh position={[0, -0.26, 0.09]}>
          <boxGeometry args={[0.18, 0.02, 0.14]} />
          <meshStandardMaterial color="#555" roughness={0.4} metalness={0.8} />
        </mesh>
      </group>
      {/* Bookshelf (left wall) */}
      <group position={[-1.8, y + 0.7, -2.3]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[0.22, 1.4, 0.7]} />
          <meshStandardMaterial color="#5c3d1e" roughness={0.7} />
        </mesh>
        {(['#8b0000','#1a4a8b','#2d6b2d','#7a5200','#6a006a'] as string[]).map((c,i)=>(
          <mesh key={i} position={[0.13, 0.3 - i * 0.28, 0.15 - (i % 2) * 0.25]} castShadow>
            <boxGeometry args={[0.09, 0.24, 0.14]} />
            <meshStandardMaterial color={c} roughness={0.8} />
          </mesh>
        ))}
      </group>
      {/* Plant (right corner) */}
      <group position={[2.0, y, -2.4]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.13, 0.1, 0.28, 12]} />
          <meshStandardMaterial color="#7a4a20" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.44, 0]} castShadow>
          <sphereGeometry args={[0.3, 10, 8]} />
          <meshStandardMaterial color="#1a6b1a" roughness={0.95} />
        </mesh>
        <mesh position={[0.18, 0.32, 0.1]} castShadow>
          <sphereGeometry args={[0.2, 8, 6]} />
          <meshStandardMaterial color="#228b22" roughness={0.95} />
        </mesh>
      </group>
      {/* Window glow (back wall right) */}
      <mesh position={[2.0, y + 1.3, -2.75]}>
        <planeGeometry args={[1.1, 0.85]} />
        <meshStandardMaterial color="#8ab4ff" emissive="#4466cc" emissiveIntensity={0.6} roughness={1} transparent opacity={0.5} />
      </mesh>
      <pointLight position={[2.0, y + 1.3, -2.5]} intensity={1.2} color="#a0c0ff" distance={4} />
      {/* Keyboard */}
      <mesh position={[1.1, y + 0.59, -0.82]} castShadow>
        <boxGeometry args={[0.5, 0.02, 0.18]} />
        <meshStandardMaterial color="#333" roughness={0.5} metalness={0.3} />
      </mesh>
    </group>
  );
}
