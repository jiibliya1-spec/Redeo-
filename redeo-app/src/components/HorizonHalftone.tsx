import { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const fragmentShader = `
uniform float uTime;
uniform sampler2D uTexture;
uniform vec2 uResolution;
varying vec2 vUv;

float circle(in vec2 _st, in float _radius) {
  vec2 dist = _st - vec2(0.5);
  return 1.0 - smoothstep(
    _radius - (_radius * 0.01),
    _radius + (_radius * 0.01),
    dot(dist, dist) * 4.0
  );
}

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 st = vUv;
  vec3 videoColor = texture2D(uTexture, st).rgb;
  float gray = dot(videoColor, vec3(0.299, 0.587, 0.114));
  vec2 aspectUV = vUv * vec2(1.0, uResolution.y / uResolution.x);

  // Fluid sine warp
  vec2 distortion = vec2(
    sin(aspectUV.y * 4.0 + uTime * 0.5) * 0.05,
    cos(aspectUV.x * 4.0 + uTime * 0.5) * 0.05
  );
  vec2 warpedUV = aspectUV + distortion;

  // Domain-warping turbulence
  float angle = 0.0;
  float radius = 0.5;
  warpedUV = aspectUV + vec2(sin(angle) * radius, cos(angle) * radius);
  warpedUV += vec2(
    hash(warpedUV * 10.0 + uTime * 0.1) * 0.1,
    hash(warpedUV * 10.0 + uTime * 0.1 + 100.0) * 0.1
  );

  // Halftone grid
  float scale = 40.0;
  vec2 gridUV = fract(warpedUV * scale);
  vec2 gridID = floor(warpedUV * scale);
  float dotRadius = (gray * 0.7) + 0.3;
  dotRadius *= 0.8 + 0.2 * sin(gridID.x * 0.5 + uTime) * cos(gridID.y * 0.5 + uTime);

  float dots = circle(gridUV, dotRadius);
  vec3 dotColor = vec3(0.0, 0.878, 1.0);

  // Ambient background glow
  float ambientGlow = 0.1 + 0.05 * sin(uTime * 0.5);
  vec3 finalColor = mix(vec3(ambientGlow), dotColor, dots);

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

function HalftoneMesh() {
  const meshRef = useRef<THREE.Mesh>(null);
  const { size } = useThree();

  const videoTexture = useMemo(() => {
    const video = document.createElement('video');
    video.src = '/videos/hero-road.mp4';
    video.crossOrigin = 'anonymous';
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.play().catch(() => {});
    return new THREE.VideoTexture(video);
  }, []);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTexture: { value: videoTexture },
    uResolution: { value: new THREE.Vector2(1, 1) },
  }), [videoTexture]);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.ShaderMaterial;
      mat.uniforms.uTime.value = elapsed;
      if (size.width > 0 && size.height > 0) {
        mat.uniforms.uResolution.value.set(size.width * 0.5, size.height * 0.5);
      }
    }
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
}

export function HorizonHalftone() {
  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        gl={{ antialias: false, alpha: false }}
        dpr={Math.min(window.devicePixelRatio, 1.5)}
        camera={{ position: [0, 0, 1] }}
        style={{ width: '100%', height: '100%' }}
      >
        <HalftoneMesh />
      </Canvas>
    </div>
  );
}
