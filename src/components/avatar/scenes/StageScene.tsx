/**
 * Stage Scene - Built-in 3D Background
 * Theatrical stage with curtains and dramatic lighting
 * TODO: Implement full stage design with curtains, spotlights, and stage floor
 */

export interface SceneProps {
  y: number; // Floor Y position
}

export function StageScene({ y }: SceneProps) {
  return (
    <group>
      {/* Wooden stage floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} receiveShadow>
        <planeGeometry args={[12, 8]} />
        <meshStandardMaterial color="#3d2817" roughness={0.7} metalness={0.1} />
      </mesh>

      {/* Back curtain */}
      <mesh position={[0, y + 2.5, -3.5]} receiveShadow>
        <planeGeometry args={[12, 6]} />
        <meshStandardMaterial color="#8b0000" roughness={0.9} />
      </mesh>

      {/* Spotlights from above */}
      <pointLight position={[0, y + 4, 0]} intensity={3} color="#ffeecc" distance={8} decay={2} />
      <pointLight position={[-2, y + 4, -1]} intensity={2} color="#ff6666" distance={6} decay={2} />
      <pointLight position={[2, y + 4, -1]} intensity={2} color="#6666ff" distance={6} decay={2} />
    </group>
  );
}
