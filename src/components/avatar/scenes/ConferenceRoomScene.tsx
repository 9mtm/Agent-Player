/**
 * Conference Room Scene - Built-in 3D Background
 * Professional conference room with large table, chairs, presentation screen
 */

export interface SceneProps {
  y: number; // Floor Y position
}

export function ConferenceRoomScene({ y }: SceneProps) {
  return (
    <group>
      {/* Floor - modern gray tile */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#d0d5dd" roughness={0.3} metalness={0.15} />
      </mesh>
      {/* Back wall - clean white */}
      <mesh position={[0, y + 2.5, -7.0]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#f8f9fa" roughness={0.95} />
      </mesh>

      {/* Large conference table - glossy dark wood */}
      <group position={[0, y + 0.75, -3.5]}>
        <mesh receiveShadow castShadow>
          <boxGeometry args={[8.0, 0.1, 3.5]} />
          <meshStandardMaterial color="#2a2218" roughness={0.2} metalness={0.4} />
        </mesh>
        {/* Table legs (4 corners) */}
        {([ [-3.8,-0.68, 1.6],[ 3.8,-0.68, 1.6],[-3.8,-0.68,-1.6],[ 3.8,-0.68,-1.6] ] as [number,number,number][]).map((p,i)=>(
          <mesh key={i} position={p} castShadow>
            <boxGeometry args={[0.15, 1.35, 0.15]} />
            <meshStandardMaterial color="#1a1410" roughness={0.4} metalness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Chairs around table (6 chairs) - scaled to match larger table */}
      {([
        [-3.0, 0.25, -1.2],  // left front
        [ 0.0, 0.25, -1.2],  // center front
        [ 3.0, 0.25, -1.2],  // right front
        [-3.0, 0.25, -5.8],  // left back
        [ 0.0, 0.25, -5.8],  // center back
        [ 3.0, 0.25, -5.8],  // right back
      ] as [number,number,number][]).map((pos, i) => (
        <group key={i} position={[pos[0], y + pos[1], pos[2]]}>
          {/* Seat */}
          <mesh castShadow>
            <boxGeometry args={[0.6, 0.08, 0.6]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
          </mesh>
          {/* Backrest */}
          <mesh position={[0, 0.5, -0.26]} castShadow>
            <boxGeometry args={[0.6, 1.0, 0.06]} />
            <meshStandardMaterial color="#3a3a3a" roughness={0.7} />
          </mesh>
          {/* Legs (4) */}
          {([[-0.24,-0.29, 0.24],[ 0.24,-0.29, 0.24],[-0.24,-0.29,-0.24],[ 0.24,-0.29,-0.24]] as [number,number,number][]).map((lp,j)=>(
            <mesh key={j} position={lp} castShadow>
              <cylinderGeometry args={[0.03, 0.03, 0.54, 8]} />
              <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.7} />
            </mesh>
          ))}
        </group>
      ))}

      {/* Large presentation screen on back wall */}
      <group position={[0, y + 2.0, -6.9]}>
        {/* Frame */}
        <mesh castShadow>
          <boxGeometry args={[5.0, 3.0, 0.12]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.3} metalness={0.7} />
        </mesh>
        {/* Screen */}
        <mesh position={[0, 0, 0.07]}>
          <planeGeometry args={[4.7, 2.7]} />
          <meshStandardMaterial color="#0a1a2a" roughness={0.1} emissive="#1a3a5a" emissiveIntensity={0.4} />
        </mesh>
      </group>

      {/* Ceiling lights (3 modern panels) */}
      {([ [-1.5, y+4.5, -3.5], [0, y+4.5, -3.5], [1.5, y+4.5, -3.5] ] as [number,number,number][]).map((lpos, i) => (
        <group key={i} position={lpos}>
          <mesh>
            <boxGeometry args={[0.8, 0.06, 0.8]} />
            <meshStandardMaterial color="#ffffff" roughness={0.9} emissive="#ffffff" emissiveIntensity={0.8} />
          </mesh>
          <pointLight position={[0, -0.1, 0]} intensity={2.5} color="#fff8e7" distance={6} decay={2} />
        </group>
      ))}

      {/* Window with soft daylight (right side) */}
      <mesh position={[4.2, y + 1.5, -4.0]}>
        <planeGeometry args={[2.2, 2.6]} />
        <meshStandardMaterial color="#c8d8e8" emissive="#a0c8e8" emissiveIntensity={0.5} roughness={0.8} transparent opacity={0.7} />
      </mesh>
      <pointLight position={[3.8, y + 1.5, -4.0]} intensity={1.8} color="#d8e8f8" distance={7} />

      {/* Plant (left corner) - scaled up */}
      <group position={[-4.5, y, -6.5]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.35, 0.32, 0.8, 14]} />
          <meshStandardMaterial color="#5a4a30" roughness={0.9} />
        </mesh>
        <mesh position={[0, 1.0, 0]} castShadow>
          <sphereGeometry args={[0.7, 12, 10]} />
          <meshStandardMaterial color="#2a5a2a" roughness={0.95} />
        </mesh>
        <mesh position={[0.38, 0.78, 0.24]} castShadow>
          <sphereGeometry args={[0.45, 10, 8]} />
          <meshStandardMaterial color="#357a35" roughness={0.95} />
        </mesh>
      </group>

      {/* Coffee station (right corner) - scaled up */}
      <group position={[4.5, y + 0.75, -6.5]}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.1, 0.8]} />
          <meshStandardMaterial color="#3a2a1a" roughness={0.5} />
        </mesh>
        {/* Coffee machine */}
        <mesh position={[0, 0.3, 0]} castShadow>
          <boxGeometry args={[0.4, 0.55, 0.42]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.4} metalness={0.6} />
        </mesh>
      </group>
    </group>
  );
}
