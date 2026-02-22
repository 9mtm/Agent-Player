'use client';

import { useRef, useMemo, Suspense, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Grid, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { Loader2 } from 'lucide-react';

interface WorldCanvas3DProps {
  objects: any[];
  groundType: 'color' | 'grid' | 'terrain' | 'sea' | 'desert';
  groundColor: string;
  worldSize: number;
  avatarUrl?: string;
  onGroundClick?: (position: [number, number, number]) => void;
  selectedTool?: string | null;
  onObjectDelete?: (objectId: string) => void;
}

// Avatar Component
function Avatar({ avatarUrl }: { avatarUrl: string }) {
  const [error, setError] = useState<string | null>(null);

  const { scene } = useGLTF(avatarUrl, undefined, undefined, (err) => {
    console.error('[Avatar] Failed to load GLB:', err);
    setError(err.message);
  });

  const cloned = useMemo(() => {
    if (!scene) {
      console.log('[Avatar] Scene is null or undefined');
      return null;
    }

    console.log('[Avatar] Scene loaded successfully:', scene);
    console.log('[Avatar] Scene children count:', scene.children.length);

    try {
      const clonedScene = SkeletonUtils.clone(scene);
      console.log('[Avatar] Scene cloned successfully');
      return clonedScene;
    } catch (err) {
      console.error('[Avatar] Failed to clone scene:', err);
      // Fallback: try regular clone
      try {
        const regularClone = scene.clone(true);
        console.log('[Avatar] Using regular clone as fallback');
        return regularClone;
      } catch (err2) {
        console.error('[Avatar] Regular clone also failed:', err2);
        return null;
      }
    }
  }, [scene]);

  if (error) {
    console.error('[Avatar] Error state:', error);
    return null;
  }

  if (!cloned) {
    console.log('[Avatar] Cloned scene is null, returning null');
    return null;
  }

  console.log('[Avatar] Rendering avatar at position [0, 0, 0] with scale 1');

  return (
    <primitive
      object={cloned}
      position={[0, 0, 0]}
      rotation={[0, 0, 0]}
      scale={1}
    />
  );
}

// Ground Component based on type
function Ground({ type, color, size }: { type: string; color: string; size: number }) {
  const meshRef = useRef<THREE.Mesh>(null);

  // Log ground type changes
  useEffect(() => {
    console.log('═════════════════════════════════════════════════');
    console.log('[Ground] 🌍 Ground type changed to:', type);
    console.log('[Ground] 🎨 Color:', color);
    console.log('[Ground] 📏 Size:', size + 'm');
    console.log('═════════════════════════════════════════════════');
  }, [type, color, size]);

  // Animate sea waves
  useFrame((state) => {
    if (type === 'sea' && meshRef.current) {
      const time = state.clock.getElapsedTime();
      const positions = (meshRef.current.geometry as THREE.PlaneGeometry).attributes.position;

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getY(i);
        const wave = Math.sin(x * 0.5 + time) * Math.cos(y * 0.5 + time * 0.8) * 0.1;
        positions.setZ(i, wave);
      }

      positions.needsUpdate = true;
      meshRef.current.geometry.computeVertexNormals();
    }
  });

  // Create realistic grass terrain texture
  const terrainTexture = useMemo(() => {
    if (type !== 'terrain') return null;

    console.log('[Ground] 🎨 Creating NATURAL GRASS texture (organic noise pattern)...');
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base grass color - rich natural green
    ctx.fillStyle = '#4a8532';
    ctx.fillRect(0, 0, 1024, 1024);

    // Add organic noise texture (simulates real grass variation)
    for (let i = 0; i < 35000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 2.5;
      const brightness = Math.random();

      // Natural color variation - mix of greens
      if (brightness > 0.7) {
        // Light green (sunlit grass)
        ctx.fillStyle = `rgba(90, 156, 61, ${0.1 + Math.random() * 0.25})`;
      } else if (brightness > 0.4) {
        // Medium green
        ctx.fillStyle = `rgba(74, 133, 50, ${0.08 + Math.random() * 0.2})`;
      } else {
        // Dark green (shaded grass)
        ctx.fillStyle = `rgba(61, 110, 40, ${0.08 + Math.random() * 0.18})`;
      }

      ctx.fillRect(x, y, size, size);
    }

    // Add subtle dark patches (dirt/shadow areas)
    for (let i = 0; i < 100; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 15 + Math.random() * 45;
      ctx.fillStyle = `rgba(45, 65, 30, ${0.04 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add light highlights (sunlit areas)
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 10 + Math.random() * 30;
      ctx.fillStyle = `rgba(120, 180, 80, ${0.03 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(size / 3, size / 3);
    console.log('[Ground] ✅ NATURAL GRASS texture created successfully');
    return texture;
  }, [type, size]);

  // Create desert texture
  const desertTexture = useMemo(() => {
    if (type !== 'desert') return null;

    console.log('[Ground] 🏜️ Creating NATURAL DESERT SAND texture (realistic grain)...');
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    // Base sand color - warm desert tone
    ctx.fillStyle = '#d4a574';
    ctx.fillRect(0, 0, 1024, 1024);

    // Add organic sand grain texture
    for (let i = 0; i < 40000; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 2;
      const brightness = Math.random();

      // Natural sand color variation - warm tones
      if (brightness > 0.75) {
        // Light sand (sunlit)
        ctx.fillStyle = `rgba(235, 210, 160, ${0.1 + Math.random() * 0.2})`;
      } else if (brightness > 0.5) {
        // Medium sand
        ctx.fillStyle = `rgba(218, 185, 135, ${0.08 + Math.random() * 0.18})`;
      } else if (brightness > 0.25) {
        // Darker sand
        ctx.fillStyle = `rgba(200, 165, 120, ${0.08 + Math.random() * 0.15})`;
      } else {
        // Deep shadow sand
        ctx.fillStyle = `rgba(180, 145, 100, ${0.06 + Math.random() * 0.12})`;
      }

      ctx.fillRect(x, y, size, size);
    }

    // Add subtle dune shadows (darker patches)
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 20 + Math.random() * 60;
      ctx.fillStyle = `rgba(160, 130, 90, ${0.03 + Math.random() * 0.1})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Add bright highlights (sun-bleached areas)
    for (let i = 0; i < 40; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const radius = 15 + Math.random() * 40;
      ctx.fillStyle = `rgba(245, 225, 180, ${0.03 + Math.random() * 0.08})`;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(size / 4, size / 4);
    console.log('[Ground] ✅ NATURAL DESERT SAND texture created successfully');
    return texture;
  }, [type, size]);

  if (type === 'grid') {
    console.log('[Ground] ✅ Rendering GRID PATTERN (base color:', color, ', grid lines: gray)');
    return (
      <>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[size, size]} />
          <meshStandardMaterial color={color} />
        </mesh>
        <Grid
          args={[size, size]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#6b7280"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#374151"
          fadeDistance={size * 2}
          fadeStrength={1}
          infiniteGrid={false}
        />
      </>
    );
  }

  if (type === 'sea') {
    console.log('[Ground] ✅ Rendering SEA - blue water (#1e88e5) with animated waves (80x80 subdivisions)');
    return (
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.5, 0]}
        receiveShadow
      >
        <planeGeometry args={[size, size, 80, 80]} />
        <meshStandardMaterial
          color="#1e88e5"
          transparent
          opacity={0.85}
          roughness={0.05}
          metalness={0.4}
          envMapIntensity={1.5}
        />
      </mesh>
    );
  }

  if (type === 'terrain') {
    console.log('[Ground] ✅ Rendering TERRAIN - applying grass texture to mesh');
    console.log('[Ground] 🔍 Texture object:', terrainTexture);
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          map={terrainTexture}
          roughness={0.9}
        />
      </mesh>
    );
  }

  if (type === 'desert') {
    console.log('[Ground] ✅ Rendering DESERT - applying sand texture to mesh');
    console.log('[Ground] 🔍 Texture object:', desertTexture);
    return (
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[size, size]} />
        <meshStandardMaterial
          map={desertTexture}
          roughness={0.9}
        />
      </mesh>
    );
  }

  // Default: color only
  console.log('[Ground] ✅ Rendering SOLID COLOR plane (color:', color, ')');
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
      <planeGeometry args={[size, size]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

// Scene object renderer
function SceneObject({ obj, onObjectDelete, selectedTool }: {
  obj: any;
  onObjectDelete?: (objectId: string) => void;
  selectedTool?: string | null;
}) {
  const position = obj.position || [0, 0, 0];
  const rotation = obj.rotation || [0, 0, 0];
  const scale = obj.scale || [1, 1, 1];
  const color = obj.color || '#ffffff';

  // Handle clicks on object
  const handleClick = (event: any) => {
    event.stopPropagation();

    // If Delete tool is selected, delete the object
    if (selectedTool === 'delete' && onObjectDelete) {
      console.log('[SceneObject] Deleting object with Delete tool:', obj.id);
      onObjectDelete(obj.id);
    }
  };

  // Handle right-click on object
  const handleContextMenu = (event: any) => {
    event.stopPropagation();

    // Right-click always deletes (regardless of selected tool)
    if (onObjectDelete) {
      console.log('[SceneObject] Right-click delete:', obj.id);
      onObjectDelete(obj.id);
    }
  };

  // Common interaction props
  const interactionProps = {
    onClick: handleClick,
    onContextMenu: handleContextMenu,
  };

  switch (obj.type) {
    case 'cube':
      return (
        <mesh position={position} rotation={rotation} scale={scale} castShadow {...interactionProps}>
          <boxGeometry args={[1, 1, 1]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );

    case 'sphere':
      return (
        <mesh position={position} rotation={rotation} scale={scale} castShadow {...interactionProps}>
          <sphereGeometry args={[0.5, 32, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );

    case 'cylinder':
      return (
        <mesh position={position} rotation={rotation} scale={scale} castShadow {...interactionProps}>
          <cylinderGeometry args={[0.5, 0.5, 1, 32]} />
          <meshStandardMaterial color={color} />
        </mesh>
      );

    case 'plane':
      return (
        <mesh position={position} rotation={rotation} scale={scale} receiveShadow {...interactionProps}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color={color} side={THREE.DoubleSide} />
        </mesh>
      );

    case 'mountain':
      // Large gray/brown cone (mountain)
      return (
        <mesh position={position} rotation={rotation} scale={[2, 3, 2]} castShadow {...interactionProps}>
          <coneGeometry args={[1, 2, 8]} />
          <meshStandardMaterial color="#8b7355" roughness={0.9} />
        </mesh>
      );

    case 'hill':
      // Green hemisphere (hill)
      return (
        <mesh position={position} rotation={rotation} scale={[1.5, 0.8, 1.5]} castShadow {...interactionProps}>
          <sphereGeometry args={[1, 32, 32, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial color="#4a8532" roughness={0.9} />
        </mesh>
      );

    case 'rock':
      // Gray irregular sphere (rock)
      return (
        <mesh position={position} rotation={rotation} scale={[0.6, 0.5, 0.7]} castShadow {...interactionProps}>
          <dodecahedronGeometry args={[0.5, 0]} />
          <meshStandardMaterial color="#6b7280" roughness={0.95} />
        </mesh>
      );

    case 'water_patch':
      // Blue flat circle (water)
      return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} scale={[2, 2, 1]} {...interactionProps}>
          <circleGeometry args={[0.5, 32]} />
          <meshStandardMaterial
            color="#1e88e5"
            transparent
            opacity={0.7}
            roughness={0.1}
            metalness={0.3}
          />
        </mesh>
      );

    case 'bush':
      // Dark green small sphere (bush)
      return (
        <mesh position={position} rotation={rotation} scale={[0.8, 0.6, 0.8]} castShadow {...interactionProps}>
          <sphereGeometry args={[0.5, 16, 16]} />
          <meshStandardMaterial color="#2d5016" roughness={0.9} />
        </mesh>
      );

    case 'tree':
      // Tree = brown cylinder (trunk) + green cone (leaves)
      return (
        <group position={position} rotation={rotation} scale={scale} {...interactionProps}>
          {/* Trunk */}
          <mesh position={[0, 0.5, 0]} castShadow>
            <cylinderGeometry args={[0.15, 0.2, 1, 8]} />
            <meshStandardMaterial color="#654321" roughness={0.9} />
          </mesh>
          {/* Leaves */}
          <mesh position={[0, 1.5, 0]} castShadow>
            <coneGeometry args={[0.8, 1.5, 8]} />
            <meshStandardMaterial color="#2d5016" roughness={0.9} />
          </mesh>
        </group>
      );

    default:
      return null;
  }
}

// Clickable Plane for object placement
function ClickablePlane({ size, onGroundClick, selectedTool }: {
  size: number;
  onGroundClick?: (position: [number, number, number]) => void;
  selectedTool?: string | null;
}) {
  const handleClick = (event: any) => {
    if (!onGroundClick || !selectedTool) return;

    // Prevent camera rotation
    event.stopPropagation();

    // Get the intersection point
    const point = event.point;
    console.log('[ClickablePlane] Clicked at:', point);

    // Call the callback with the position
    onGroundClick([point.x, point.y + 0.1, point.z]); // +0.1 to place slightly above ground
  };

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0.01, 0]}
      onClick={handleClick}
      visible={false} // Invisible but still captures clicks
    >
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial transparent opacity={0} />
    </mesh>
  );
}

// Main Scene
function Scene({ objects, groundType, groundColor, worldSize, avatarUrl, onGroundClick, selectedTool, onObjectDelete }: WorldCanvas3DProps) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera makeDefault position={[10, 10, 10]} fov={50} />

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={100}
        maxPolarAngle={Math.PI / 2 - 0.1}
        target={[0, 0, 0]}
      />

      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 20, 10]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <hemisphereLight intensity={0.3} groundColor="#444444" />

      {/* Background */}
      <color attach="background" args={['#1a1a2e']} />

      {/* Ground - key forces React to remount when type changes */}
      <Ground key={groundType} type={groundType} color={groundColor} size={worldSize} />

      {/* Clickable Plane for placing objects */}
      <ClickablePlane size={worldSize} onGroundClick={onGroundClick} selectedTool={selectedTool} />

      {/* Avatar or Fallback */}
      {avatarUrl ? (
        avatarUrl.startsWith('http') ? (
          // Try to load user's avatar
          <Suspense fallback={
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[1, 2, 1]} />
              <meshStandardMaterial color="#4a90e2" />
            </mesh>
          }>
            <group>
              <Avatar avatarUrl={avatarUrl} />
            </group>
          </Suspense>
        ) : (
          // Fallback: Simple cube character if URL is not HTTP
          <mesh position={[0, 0.5, 0]} castShadow>
            <boxGeometry args={[1, 2, 1]} />
            <meshStandardMaterial color="#4a90e2" />
          </mesh>
        )
      ) : (
        // Fallback: Simple cube character if no avatar URL
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[1, 2, 1]} />
          <meshStandardMaterial color="#4a90e2" />
        </mesh>
      )}

      {/* Scene Objects */}
      {objects.map((obj) => (
        <SceneObject key={obj.id} obj={obj} onObjectDelete={onObjectDelete} selectedTool={selectedTool} />
      ))}
    </>
  );
}

// Main Canvas Component
export default function WorldCanvas3D(props: WorldCanvas3DProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check WebGL support
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) {
        setError('WebGL is not supported in your browser');
      } else {
        setIsLoading(false);
      }
    } catch (e) {
      setError('Failed to initialize WebGL');
      console.error('WebGL initialization error:', e);
    }
  }, []);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <div className="text-center text-white/70 p-8">
          <p className="text-lg mb-2">3D Canvas Error</p>
          <p className="text-sm">{error}</p>
          <p className="text-xs mt-4">Please try refreshing the page or use a modern browser</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800">
        <Loader2 className="h-12 w-12 text-white/50 animate-spin" />
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          preserveDrawingBuffer: true,
        }}
        onCreated={({ gl }) => {
          gl.setClearColor('#1a1a2e');

          // Handle context loss
          gl.domElement.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.warn('WebGL context lost');
            setError('WebGL context was lost. Please refresh the page.');
          });

          gl.domElement.addEventListener('webglcontextrestored', () => {
            console.log('WebGL context restored');
            setError(null);
            setIsLoading(false);
          });
        }}
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
