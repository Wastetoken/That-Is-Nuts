import React, { useRef, useEffect, useCallback, useState } from 'react';
import * as THREE from 'three';
import { ExtractionPhysicsEngine, MachineState } from '../utils/physicsEngine';
import { DonorProfile } from '../types';
import { soundManager } from '../utils/audio';
import { hapticManager } from '../utils/haptics';
import { Gauge, Droplet, Sparkles, Beaker } from 'lucide-react';

interface PhysicsViewportProps {
  engine: ExtractionPhysicsEngine;
  state: MachineState;
  activeDonor: DonorProfile;
  onManualStroke: (velocity: number) => void;
  vacuumPowerBonus: number;
  sleeveUpgradeLevel?: number;
  resonatorUpgradeLevel?: number;
  vacuumUpgradeLevel?: number;
}

// Donor skin tone lookup table
const DONOR_SKIN_TONES: Record<string, { base: number; glans: number; roughness: number }> = {
  leo: { base: 0xd6a87e, glans: 0xeb8888, roughness: 0.32 },
  marcus: { base: 0x9a6544, glans: 0xb55e5e, roughness: 0.34 },
  alex: { base: 0xf5caa8, glans: 0xfb9292, roughness: 0.28 },
  thorne: { base: 0x543622, glans: 0x7c4538, roughness: 0.36 },
  jin: { base: 0xe8caa6, glans: 0xf09090, roughness: 0.30 },
};

export const PhysicsViewport: React.FC<PhysicsViewportProps> = ({
  engine,
  state,
  activeDonor,
  onManualStroke,
  vacuumPowerBonus,
  sleeveUpgradeLevel = 1,
  resonatorUpgradeLevel = 0,
  vacuumUpgradeLevel = 1,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interaction tracking refs for 1:1 thumb slide tracking
  const isDragging = useRef<boolean>(false);
  const lastTouchY = useRef<number | null>(null);
  const lastTouchTime = useRef<number>(0);
  const strokeTravelAccumulator = useRef<number>(0);

  // HUD state
  const [hudSpeed, setHudSpeed] = useState<number>(0);
  const [hudVolume, setHudVolume] = useState<number>(0);
  const [hudSurge, setHudSurge] = useState<boolean>(false);

  // Three.js scene refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Animated 3D mesh refs
  const penisGroupRef = useRef<THREE.Group | null>(null);
  const shaftMeshRef = useRef<THREE.Mesh | null>(null);
  const glansGroupRef = useRef<THREE.Group | null>(null);
  const scrotumGroupRef = useRef<THREE.Group | null>(null);
  const strokerGroupRef = useRef<THREE.Group | null>(null);
  const fingersGroupRef = useRef<THREE.Group | null>(null);
  const beakerGroupRef = useRef<THREE.Group | null>(null);
  const beakerFluidMeshRef = useRef<THREE.Mesh | null>(null);
  const skinMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);
  const glansMaterialRef = useRef<THREE.MeshPhysicalMaterial | null>(null);

  // Semen particle system refs
  const particleSystemRef = useRef<THREE.Points | null>(null);
  const particleDataRef = useRef<{
    positions: Float32Array;
    velocities: Float32Array;
    lifetimes: Float32Array;
    active: boolean[];
    count: number;
  } | null>(null);

  // Launch parabolic semen particles from meatus / suction nozzle into collection beaker
  const launchSpecimenBurst = useCallback((count: number, velocityScale: number = 1.0) => {
    const pData = particleDataRef.current;
    if (!pData) return;

    const { positions, velocities, lifetimes, active, count: maxParticles } = pData;
    let launched = 0;

    // Origin starts along the medical tube nozzle over the beaker
    for (let i = 0; i < maxParticles && launched < count; i++) {
      if (!active[i]) {
        active[i] = true;
        lifetimes[i] = 1.2;

        // Origin at nozzle above the collection beaker (x ~ 1.8, y ~ 1.3, z ~ 0.5)
        positions[i * 3] = 1.8 + (Math.random() - 0.5) * 0.2;
        positions[i * 3 + 1] = 1.3 + (Math.random() - 0.5) * 0.15;
        positions[i * 3 + 2] = 0.5 + (Math.random() - 0.5) * 0.2;

        // Downward trajectory splashing directly into the beaker
        const spreadAngle = (Math.random() - 0.5) * 0.3;
        const downwardSpeed = -(3.2 + Math.random() * 2.0) * velocityScale;
        const sideSpeed = Math.sin(spreadAngle) * 0.4;

        velocities[i * 3] = sideSpeed;
        velocities[i * 3 + 1] = downwardSpeed;
        velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.2;

        launched++;
      }
    }
  }, []);

  // Initialize Three.js Scene, Camera, Lighting & Anatomical Models
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.clientWidth || 400;
    const height = container.clientHeight || 360;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.background = new THREE.Color(0x050811);
    scene.fog = new THREE.FogExp2(0x050811, 0.022);

    // 2. CAMERA SETUP (Framing both the shaft on left and the beaker on right)
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0.15, 0.35, 11.4);
    camera.lookAt(0.15, -0.05, 0);
    cameraRef.current = camera;

    // 3. RENDERER SETUP
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. LIGHTING SETUP
    const ambientLight = new THREE.AmbientLight(0x0f172a, 1.4);
    scene.add(ambientLight);

    // Key Light
    const keyLight = new THREE.DirectionalLight(0xfff5ea, 2.2);
    keyLight.position.set(4, 6, 6);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    scene.add(keyLight);

    // Laboratory Blue Rim Light
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
    rimLight.position.set(-6, 3, -4);
    scene.add(rimLight);

    // Clinical Bottom Uplight
    const bottomLight = new THREE.PointLight(0x0284c7, 1.2, 10);
    bottomLight.position.set(0, -4, 3);
    scene.add(bottomLight);

    // Illuminated Beaker Spot Light
    const beakerLight = new THREE.PointLight(0x67e8f9, 2.4, 8);
    beakerLight.position.set(1.8, 1.8, 2.2);
    scene.add(beakerLight);

    // 5. ANATOMICAL MODEL (Positioned on the left side: X = -1.45)
    const skinTone = DONOR_SKIN_TONES[activeDonor.id] || DONOR_SKIN_TONES.leo;
    const penisGroup = new THREE.Group();
    penisGroup.position.set(-1.45, -0.2, 0);
    penisGroupRef.current = penisGroup;
    scene.add(penisGroup);

    // Skin Material
    const skinMat = new THREE.MeshPhysicalMaterial({
      color: skinTone.base,
      roughness: skinTone.roughness,
      metalness: 0.05,
      clearcoat: 0.45,
      clearcoatRoughness: 0.15,
      subsurface: 0.4,
    } as any);
    skinMaterialRef.current = skinMat;

    // Glans Material
    const glansMat = new THREE.MeshPhysicalMaterial({
      color: skinTone.glans,
      roughness: Math.max(0.1, skinTone.roughness - 0.12),
      metalness: 0.04,
      clearcoat: 0.65,
      clearcoatRoughness: 0.1,
      emissive: 0x000000,
    } as any);
    glansMaterialRef.current = glansMat;

    // Shaft Geometry
    const shaftHeight = 4.0;
    const shaftRadius = 0.68;
    const shaftGeo = new THREE.CylinderGeometry(shaftRadius * 0.94, shaftRadius * 1.06, shaftHeight, 32, 16);
    const shaftMesh = new THREE.Mesh(shaftGeo, skinMat);
    shaftMesh.castShadow = true;
    shaftMesh.receiveShadow = true;
    shaftMeshRef.current = shaftMesh;
    penisGroup.add(shaftMesh);

    // Glans Head & Corona
    const glansGroup = new THREE.Group();
    glansGroup.position.y = shaftHeight / 2 + 0.12;
    glansGroupRef.current = glansGroup;
    penisGroup.add(glansGroup);

    const coronaGeo = new THREE.TorusGeometry(shaftRadius * 1.05, 0.16, 16, 32);
    const coronaMesh = new THREE.Mesh(coronaGeo, glansMat);
    coronaMesh.rotation.x = Math.PI / 2;
    glansGroup.add(coronaMesh);

    const glansCapGeo = new THREE.SphereGeometry(shaftRadius * 1.08, 32, 24, 0, Math.PI * 2, 0, Math.PI * 0.48);
    const glansCapMesh = new THREE.Mesh(glansCapGeo, glansMat);
    glansCapMesh.position.y = 0.05;
    glansCapMesh.castShadow = true;
    glansGroup.add(glansCapMesh);

    // Meatus Slit
    const meatusGeo = new THREE.BoxGeometry(0.04, 0.22, 0.02);
    const meatusMat = new THREE.MeshBasicMaterial({ color: 0x7f1d1d });
    const meatusMesh = new THREE.Mesh(meatusGeo, meatusMat);
    meatusMesh.position.set(0, 0.58, 0.02);
    glansGroup.add(meatusMesh);

    // ANCHORED SCROTUM / TESTICLES (Anchored at base Y = -2.85, completely stationary)
    const scrotumGroup = new THREE.Group();
    scrotumGroup.position.set(0, -shaftHeight / 2 - 0.45, -0.15);
    scrotumGroupRef.current = scrotumGroup;
    penisGroup.add(scrotumGroup);

    const testisGeo = new THREE.SphereGeometry(0.72, 24, 24);
    const leftTestis = new THREE.Mesh(testisGeo, skinMat);
    leftTestis.position.set(-0.52, -0.1, 0);
    leftTestis.scale.set(0.9, 1.15, 0.95);
    leftTestis.castShadow = true;
    scrotumGroup.add(leftTestis);

    const rightTestis = new THREE.Mesh(testisGeo, skinMat);
    rightTestis.position.set(0.52, -0.22, 0);
    rightTestis.scale.set(0.92, 1.18, 0.96);
    rightTestis.castShadow = true;
    scrotumGroup.add(rightTestis);

    // 6. THE STROKER SLEEVE (Directly follows finger up and down along shaft)
    const strokerGroup = new THREE.Group();
    // Initial position matching state.strokePosition
    const initialStrokerY = 1.95 - state.strokePosition * 3.9;
    strokerGroup.position.set(0, initialStrokerY, 0);
    strokerGroupRef.current = strokerGroup;
    penisGroup.add(strokerGroup);

    // Transparent Medical Silicone Sleeve Cylinder
    const sleeveLength = 1.9;
    const sleeveGeo = new THREE.CylinderGeometry(shaftRadius * 1.28, shaftRadius * 1.25, sleeveLength, 32, 8, true);
    const sleeveMat = new THREE.MeshPhysicalMaterial({
      color: sleeveUpgradeLevel > 2 ? 0x06b6d4 : 0x38bdf8,
      transmission: 0.72,
      opacity: 0.88,
      transparent: true,
      roughness: 0.12,
      ior: 1.42,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      thickness: 0.5,
    });
    const sleeveMesh = new THREE.Mesh(sleeveGeo, sleeveMat);
    strokerGroup.add(sleeveMesh);

    // Internal Textured Rib Rings
    const ribMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      roughness: 0.25,
      metalness: 0.2,
    });
    [-0.6, -0.3, 0, 0.3, 0.6].forEach((yPos) => {
      const ribGeo = new THREE.TorusGeometry(shaftRadius * 1.14, 0.04, 12, 32);
      const ribMesh = new THREE.Mesh(ribGeo, ribMat);
      ribMesh.position.y = yPos;
      ribMesh.rotation.x = Math.PI / 2;
      strokerGroup.add(ribMesh);
    });

    // Anatomical Gripping Hand / Fingers wrapped around the sleeve
    const fingersGroup = new THREE.Group();
    fingersGroupRef.current = fingersGroup;
    strokerGroup.add(fingersGroup);

    const fingerMat = new THREE.MeshPhysicalMaterial({
      color: 0xcaa382,
      roughness: 0.4,
      metalness: 0.05,
    });

    [-0.5, -0.15, 0.2, 0.55].forEach((yOffset, i) => {
      const fingerGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.2, 16);
      const fingerMesh = new THREE.Mesh(fingerGeo, fingerMat);
      fingerMesh.rotation.z = Math.PI / 2;
      fingerMesh.rotation.y = (i * 0.15) - 0.2;
      fingerMesh.position.set(0, yOffset, shaftRadius * 1.2);
      fingerMesh.castShadow = true;
      fingersGroup.add(fingerMesh);
    });

    // 7. FLEXIBLE MEDICAL SUCTION TUBING (Connecting glans nozzle to collection beaker)
    const tubeCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.45, 2.3, 0.2),  // Glans tip
      new THREE.Vector3(-0.6, 2.7, 0.5),   // Arching up and over
      new THREE.Vector3(0.7, 2.3, 0.6),    // Crossing to beaker
      new THREE.Vector3(1.8, 1.4, 0.5),    // Entering beaker rim
    ]);
    const tubeGeo = new THREE.TubeGeometry(tubeCurve, 32, 0.11, 16, false);
    const tubeMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.85,
      transparent: true,
      opacity: 0.88,
      roughness: 0.1,
      clearcoat: 1.0,
    });
    const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
    scene.add(tubeMesh);

    // 8. 3D GRADUATED SPECIMEN COLLECTION CUP / BEAKER (Prominently mounted on the right: X = 1.8)
    const beakerGroup = new THREE.Group();
    beakerGroup.position.set(1.8, -0.65, 0.5);
    beakerGroupRef.current = beakerGroup;
    scene.add(beakerGroup);

    // Borosilicate Laboratory Glass Cylinder
    const beakerGeo = new THREE.CylinderGeometry(1.22, 1.08, 3.2, 32, 1, true);
    const beakerGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      transmission: 0.88,
      transparent: true,
      opacity: 0.94,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      ior: 1.52,
    });
    const beakerMesh = new THREE.Mesh(beakerGeo, beakerGlassMat);
    beakerMesh.castShadow = true;
    beakerGroup.add(beakerMesh);

    // Glass Rim Ring with pouring spout
    const rimGeo = new THREE.TorusGeometry(1.22, 0.08, 16, 32);
    const rimMesh = new THREE.Mesh(rimGeo, beakerGlassMat);
    rimMesh.position.y = 1.6;
    rimMesh.rotation.x = Math.PI / 2;
    beakerGroup.add(rimMesh);

    // Glass Base Bottom
    const baseGeo = new THREE.CylinderGeometry(1.08, 1.08, 0.16, 32);
    const baseMesh = new THREE.Mesh(baseGeo, beakerGlassMat);
    baseMesh.position.y = -1.6;
    beakerGroup.add(baseMesh);

    // Graduated Measurement Markings on the glass (10mL, 20mL, 30mL, 40mL, 50mL)
    const markYOffsets = [
      { y: -1.1, label: '10' },
      { y: -0.5, label: '20' },
      { y: 0.1, label: '30' },
      { y: 0.7, label: '40' },
      { y: 1.3, label: '50' },
    ];
    markYOffsets.forEach(({ y }) => {
      const markGeo = new THREE.TorusGeometry(1.16 + (y / 3.2) * 0.1, 0.022, 8, 32);
      const markMat = new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        emissive: 0x0284c7,
        emissiveIntensity: 0.6,
      });
      const markMesh = new THREE.Mesh(markGeo, markMat);
      markMesh.position.y = y;
      markMesh.rotation.x = Math.PI / 2;
      beakerGroup.add(markMesh);
    });

    // Laboratory Stand Bracket
    const standMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      metalness: 0.85,
      roughness: 0.25,
    });
    const standRingGeo = new THREE.TorusGeometry(1.28, 0.09, 12, 32);
    const standRingMesh = new THREE.Mesh(standRingGeo, standMat);
    standRingMesh.position.y = -0.7;
    standRingMesh.rotation.x = Math.PI / 2;
    beakerGroup.add(standRingMesh);

    const standRodGeo = new THREE.CylinderGeometry(0.08, 0.08, 3.4, 16);
    const standRodMesh = new THREE.Mesh(standRodGeo, standMat);
    standRodMesh.position.set(1.4, -0.4, 0);
    beakerGroup.add(standRodMesh);

    // 3D SEMEN LIQUID SPECIMEN INSIDE THE BEAKER (Viscous, pearlescent milky white)
    const fluidMaxHeight = 2.8;
    const fluidGeo = new THREE.CylinderGeometry(1.12, 1.0, fluidMaxHeight, 32);
    const fluidMat = new THREE.MeshPhysicalMaterial({
      color: 0xf8fafc,
      roughness: 0.16,
      clearcoat: 0.95,
      clearcoatRoughness: 0.05,
      transmission: 0.18,
      opacity: 0.98,
      transparent: true,
      sheen: 0.5,
      sheenColor: new THREE.Color(0xffffff),
    });
    const beakerFluidMesh = new THREE.Mesh(fluidGeo, fluidMat);
    beakerFluidMesh.position.y = -1.6 + 0.1;
    beakerFluidMesh.scale.set(1, 0.05, 1);
    beakerFluidMeshRef.current = beakerFluidMesh;
    beakerGroup.add(beakerFluidMesh);

    // 9. PARTICLE SYSTEM FOR PHYSICAL SEMEN JETS INTO BEAKER
    const particleCount = 800;
    const pPositions = new Float32Array(particleCount * 3);
    const pVelocities = new Float32Array(particleCount * 3);
    const pLifetimes = new Float32Array(particleCount);
    const pActive = new Array(particleCount).fill(false);

    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = 0;
      pPositions[i * 3 + 1] = -1000;
      pPositions[i * 3 + 2] = 0;
    }

    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));

    // Milky fluid droplet texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 64;
    pCanvas.height = 64;
    const pCtx = pCanvas.getContext('2d');
    if (pCtx) {
      const grad = pCtx.createRadialGradient(32, 32, 2, 32, 32, 30);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)');
      grad.addColorStop(0.5, 'rgba(240, 245, 255, 0.9)');
      grad.addColorStop(0.85, 'rgba(220, 235, 250, 0.5)');
      grad.addColorStop(1, 'rgba(200, 225, 245, 0)');
      pCtx.fillStyle = grad;
      pCtx.beginPath();
      pCtx.arc(32, 32, 30, 0, Math.PI * 2);
      pCtx.fill();
    }
    const pTex = new THREE.CanvasTexture(pCanvas);

    const pMat = new THREE.PointsMaterial({
      size: 0.35,
      map: pTex,
      transparent: true,
      blending: THREE.NormalBlending,
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(pGeo, pMat);
    scene.add(particleSystem);
    particleSystemRef.current = particleSystem;
    particleDataRef.current = {
      positions: pPositions,
      velocities: pVelocities,
      lifetimes: pLifetimes,
      active: pActive,
      count: particleCount,
    };

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      scene.clear();
    };
  }, [activeDonor.id, sleeveUpgradeLevel]);

  // Main Render Loop (Smooth visuals, 1:1 sync, particle physics, semen cup update)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let burstTimer = 0;

    const loop = () => {
      const now = performance.now();
      const dt = Math.min((now - lastTime) / 1000, 0.08);
      lastTime = now;

      // 1. Skin & Glans material sheen and arousal flush
      if (skinMaterialRef.current && glansMaterialRef.current) {
        const lubeRatio = Math.min(1.0, Math.max(0, state.lubeLevel / 100));
        skinMaterialRef.current.clearcoat = 0.25 + lubeRatio * 0.75;
        skinMaterialRef.current.roughness = Math.max(0.12, 0.35 - lubeRatio * 0.23);

        glansMaterialRef.current.clearcoat = 0.6 + lubeRatio * 0.4;
        glansMaterialRef.current.roughness = Math.max(0.08, 0.26 - lubeRatio * 0.18);

        const arousalRatio = Math.min(1.0, state.resonance / 100);
        glansMaterialRef.current.emissive.setRGB(
          arousalRatio * 0.3,
          arousalRatio * 0.06,
          arousalRatio * 0.09
        );
      }

      // 2. Synchronize Stroker Sleeve position along shaft
      // When not dragging, gently reflect state.strokePosition
      if (strokerGroupRef.current) {
        const targetStrokerY = 1.95 - state.strokePosition * 3.9;
        if (!isDragging.current) {
          // Subtle organic breathing motion if idle
          strokerGroupRef.current.position.y += (targetStrokerY - strokerGroupRef.current.position.y) * 0.35;
        } else {
          // Direct 1:1 position lock when dragging
          strokerGroupRef.current.position.y = targetStrokerY;
        }

        // Biological grip squeezing & corona response
        const strokePhase = 1 - state.strokePosition; // 1 = near glans, 0 = at base
        const squeeze = Math.sin(strokePhase * Math.PI);

        if (fingersGroupRef.current) {
          const gripScale = 1.0 - squeeze * 0.06;
          fingersGroupRef.current.scale.set(gripScale, 1.0, gripScale);
        }

        if (glansGroupRef.current) {
          const engorgement = 1.0 + squeeze * 0.08 + (state.resonance / 100) * 0.06;
          glansGroupRef.current.scale.set(engorgement, 1.0 + squeeze * 0.04, engorgement);
        }
      }

      // 3. ANCHORED SCROTUM / TESTICLES (Fixed at base, NEVER moved by finger drag)
      if (scrotumGroupRef.current) {
        scrotumGroupRef.current.position.y = -2.85 + Math.sin(now * 0.001) * 0.015;
      }

      // 4. Update Semen Particle System
      const pData = particleDataRef.current;
      const pSys = particleSystemRef.current;
      if (pData && pSys) {
        const { positions, velocities, lifetimes, active, count: maxParticles } = pData;
        let anyActive = false;

        for (let i = 0; i < maxParticles; i++) {
          if (active[i]) {
            anyActive = true;
            positions[i * 3] += velocities[i * 3] * dt * 2.8;
            positions[i * 3 + 1] += velocities[i * 3 + 1] * dt * 2.8;
            positions[i * 3 + 2] += velocities[i * 3 + 2] * dt * 2.8;

            // Downward gravity into the beaker
            velocities[i * 3 + 1] -= dt * 9.8;
            velocities[i * 3] *= 0.98;
            velocities[i * 3 + 1] *= 0.98;
            velocities[i * 3 + 2] *= 0.98;

            lifetimes[i] -= dt * 0.8;

            // Landing into beaker (x ~ 1.8, y < -0.6)
            if (positions[i * 3 + 1] < -0.8 && Math.abs(positions[i * 3] - 1.8) < 1.2) {
              active[i] = false;
              positions[i * 3 + 1] = -1000;
              // Increment beaker fluid level
              state.liquidLevelMl = Math.min(
                state.maxBeakerCapacity,
                state.liquidLevelMl + 0.04
              );
            } else if (lifetimes[i] <= 0 || positions[i * 3 + 1] < -4) {
              active[i] = false;
              positions[i * 3 + 1] = -1000;
            }
          }
        }

        if (anyActive) {
          pSys.geometry.attributes.position.needsUpdate = true;
        }
      }

      // 5. Automatic Ejaculation Streams during Surge
      if (state.isSurging) {
        setHudSurge(true);
        burstTimer += dt;
        if (burstTimer > 0.08) {
          burstTimer = 0;
          launchSpecimenBurst(12, 1.5);
          soundManager.playViscousSpurt();
        }
      } else {
        setHudSurge(false);
      }

      // 6. UPDATE 3D FLUID MESH IN THE SPECIMEN COLLECTION BEAKER
      if (beakerFluidMeshRef.current) {
        const fillFraction = Math.min(1.0, Math.max(0.04, state.liquidLevelMl / state.maxBeakerCapacity));
        const maxFluidHeight = 2.8;
        beakerFluidMeshRef.current.scale.set(1.0, fillFraction, 1.0);
        // Position rises from base (-1.6) upward
        beakerFluidMeshRef.current.position.y = -1.6 + (fillFraction * maxFluidHeight) / 2;
        beakerFluidMeshRef.current.rotation.z = state.sloshAngle * 0.25;
      }

      // HUD Sync
      setHudSpeed(Math.abs(state.strokeVelocity));
      setHudVolume(state.liquidLevelMl);

      // Render Three.js frame
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [state, launchSpecimenBurst]);

  // DIRECT 1:1 TOUCH / POINTER HANDLERS
  // When sliding finger/thumb up/down, the sleeve moves at the EXACT same speed!
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    state.isManualDragging = true;
    lastTouchY.current = e.clientY;
    lastTouchTime.current = performance.now();
    strokeTravelAccumulator.current = 0;

    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    // Initial touch registers immediate manual stroke sensation
    onManualStroke(1.2);
    soundManager.playStroke(1.2, state.lubeLevel);
    hapticManager.triggerRibPass();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current || lastTouchY.current === null) return;

    const now = performance.now();
    const dy = e.clientY - lastTouchY.current;
    const dt = Math.max(0.008, (now - lastTouchTime.current) / 1000);
    lastTouchY.current = e.clientY;
    lastTouchTime.current = now;

    if (Math.abs(dy) < 0.5) return;

    // Direct 1:1 stroke mapping:
    // Moving thumb UP (dy < 0) -> moves sleeve UP towards glans (0.0)
    // Moving thumb DOWN (dy > 0) -> moves sleeve DOWN towards base (1.0)
    const activeStrokeZonePixels = 160; // Natural mobile thumb stroke range
    const deltaNormalized = dy / activeStrokeZonePixels;
    const prevPosition = state.strokePosition;
    const newPosition = Math.max(0.0, Math.min(1.0, prevPosition + deltaNormalized));
    state.strokePosition = newPosition;

    // Instantly set 3D sleeve mesh position with ZERO lag
    if (strokerGroupRef.current) {
      strokerGroupRef.current.position.y = 1.95 - newPosition * 3.9;
    }

    // Instantaneous velocity calculation
    const instantaneousVelocity = Math.min(5.0, (Math.abs(dy) / (dt * 1000)) * 16);
    state.strokeVelocity = (-dy / dt) * 0.015;

    // Accumulate travel distance to trigger rhythmic stroke milestones & audio
    const travel = Math.abs(newPosition - prevPosition);
    strokeTravelAccumulator.current += travel;

    if (strokeTravelAccumulator.current >= 0.16) {
      strokeTravelAccumulator.current = 0;
      onManualStroke(instantaneousVelocity);
      engine.recordStroke(instantaneousVelocity);
      soundManager.playStroke(instantaneousVelocity, state.lubeLevel);

      // Rib texture haptic vibration
      hapticManager.triggerRibPass();
      hapticManager.triggerStrokeResistance({
        vacuumPressure: state.vacuumPressure,
        lubeLevel: state.lubeLevel,
        strokeVelocity: instantaneousVelocity,
        sleeveUpgradeLevel,
        resonatorUpgradeLevel,
        vacuumUpgradeLevel,
      });

      // If stimulated, pre-cum drops trickle into the collection cup
      if (state.resonance > 35 && Math.random() < 0.3) {
        launchSpecimenBurst(1, 0.7);
        state.liquidLevelMl = Math.min(state.maxBeakerCapacity, state.liquidLevelMl + 0.05);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = false;
    state.isManualDragging = false;
    lastTouchY.current = null;
    strokeTravelAccumulator.current = 0;

    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const maxSpeed = 12;
  const speedPercent = Math.min(100, (hudSpeed / maxSpeed) * 100);

  return (
    <div
      ref={containerRef}
      id="physics-viewport-container"
      className="relative w-full h-80 sm:h-96 bg-slate-950 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block cursor-ns-resize" />

      {/* TOP HUD: SPEEDOMETER & CADENCE */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10">
        <div className="flex items-center gap-1.5 text-[11px] font-mono uppercase tracking-wider text-slate-300 bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full border border-slate-800 shadow-lg">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span>Stroke Speed</span>
          <span className="text-cyan-400 font-bold ml-1">{hudSpeed.toFixed(1)}</span>
        </div>
        {/* Speedometer Fill Bar */}
        <div className="w-36 sm:w-44 h-2 bg-slate-900/90 rounded-full border border-slate-800 mt-1.5 overflow-hidden shadow-inner">
          <div
            className="h-full rounded-full transition-all duration-75 bg-gradient-to-r from-cyan-400 via-pink-400 to-amber-300"
            style={{ width: `${speedPercent}%` }}
          />
        </div>
      </div>

      {/* TOP RIGHT HUD: SPECIMEN CUP WITH LIVE FILLING LEVEL */}
      <div className="absolute top-3 right-3 text-xs font-mono pointer-events-none z-10 bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-xl border border-cyan-500/40 shadow-xl flex items-center gap-2">
        <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-300">
          <Beaker className="w-4 h-4" />
        </div>
        <div>
          <div className="text-[10px] text-slate-400 uppercase leading-none font-bold">Specimen Cup</div>
          <div className="text-cyan-300 font-bold leading-tight">
            {hudVolume.toFixed(1)} <span className="text-slate-400 text-[10px]">/ {state.maxBeakerCapacity} mL</span>
          </div>
        </div>
      </div>

      {/* CLIMAX / EXTRACTION SURGE BANNER */}
      {hudSurge && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-20 text-center animate-bounce">
          <div className="text-2xl sm:text-3xl font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-amber-300 to-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.9)]">
            ⚡ EXTRACTION SURGE ⚡
          </div>
          <div className="text-xs font-mono font-bold text-white bg-pink-600/80 px-3 py-0.5 rounded-full border border-white/50 inline-block mt-1 shadow-lg">
            PHYSICAL FLUID STREAM INTO CUP
          </div>
        </div>
      )}

      {/* BOTTOM HUD: INTERACTION GUIDANCE & LUBE STATUS */}
      <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between pointer-events-none z-10 text-xs font-mono">
        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-slate-300">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-[11px]">Slide thumb up/down to stroke sleeve 1:1</span>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/85 backdrop-blur px-2.5 py-1 rounded-lg border border-slate-800 text-slate-400 text-[11px]">
          <Droplet className={`w-3 h-3 ${state.lubeLevel > 30 ? 'text-cyan-400' : 'text-amber-500'}`} />
          <span>Lube:</span>
          <span className={state.lubeLevel > 30 ? 'text-cyan-300 font-bold' : 'text-amber-400 font-bold'}>
            {Math.round(state.lubeLevel)}%
          </span>
        </div>
      </div>
    </div>
  );
};
