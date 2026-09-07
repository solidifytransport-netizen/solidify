"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { gsap, ScrollTrigger, EASE, perfTier, dprCap, damp, prefersReducedMotion } from "@/lib/motion";

export type SceneState = { abbr: string; name: string; d: string };

/**
 * The coverage map as real geometry.
 *
 * The 48 contiguous states are extruded from the same path data the SVG map
 * uses, lit with a key/rim/hemisphere rig, and raycast for hover. Focus states
 * stand taller and carry emissive light; everything else is machined graphite.
 * The camera drifts with the pointer, and the whole board rises out of the
 * ground once when it is scrolled into view.
 *
 * Why this and not another shader: coverage is a fact about the business, and
 * a lit solid you can point at communicates it. An abstract light field does
 * not, which is the note this replaced.
 *
 * The SVG map underneath is the fallback and stays in the DOM for assistive
 * tech; this layer only takes over when there is WebGL, motion is allowed, and
 * the device is not the slowest tier.
 */

/** The path data is M/L/Z only (topojson → svg), so no curve handling is needed. */
function parsePath(d: string): THREE.Vector2[][] {
  const rings: THREE.Vector2[][] = [];
  for (const part of d.split("M").slice(1)) {
    const nums = part.replace(/[Zz]/g, "").split("L");
    const ring: THREE.Vector2[] = [];
    for (const pair of nums) {
      const [x, y] = pair.split(",").map(Number);
      if (Number.isFinite(x) && Number.isFinite(y)) ring.push(new THREE.Vector2(x, y));
    }
    if (ring.length >= 3) rings.push(ring);
  }
  return rings;
}

/** Drop points that add nothing at the size this renders at. */
function thin(ring: THREE.Vector2[], min: number): THREE.Vector2[] {
  const out: THREE.Vector2[] = [ring[0]];
  for (let i = 1; i < ring.length; i++) {
    if (ring[i].distanceTo(out[out.length - 1]) >= min) out.push(ring[i]);
  }
  return out.length >= 3 ? out : ring;
}

function ringArea(ring: THREE.Vector2[]): number {
  let a = 0;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    a += (ring[j].x + ring[i].x) * (ring[j].y - ring[i].y);
  }
  return Math.abs(a / 2);
}

export function CoverageScene({
  states,
  focus,
  hovered,
  onHover,
  onReady,
  className,
}: {
  states: readonly SceneState[];
  focus: readonly string[];
  /** Hover driven from outside (the state chips beside the map). */
  hovered: string | null;
  onHover: (abbr: string | null) => void;
  /** Called with true once the scene is actually painting, so the caller can
      retire the SVG fallback, and never called when it bails out. */
  onReady?: (ok: boolean) => void;
  className?: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const hoverRef = useRef(hovered);
  hoverRef.current = hovered;
  const onHoverRef = useRef(onHover);
  onHoverRef.current = onHover;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const el = host.current;
    if (!el || prefersReducedMotion()) return;
    const tier = perfTier();
    if (tier < 2) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    } catch {
      return;
    }
    renderer.setPixelRatio(dprCap(tier >= 3 ? 1.75 : 1.25));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    const canvas = renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;";
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 200);
    const CAM = new THREE.Vector3(0, 6.9, 8.4);
    camera.position.copy(CAM);
    camera.lookAt(0, 0, 0);

    /* ---- geometry ------------------------------------------------------- */

    const VB_W = 975;
    const VB_H = 610;
    const SPAN = 15.4; // world units across the full map
    const S = SPAN / VB_W;
    const focusSet = new Set(focus);

    const group = new THREE.Group();
    scene.add(group);

    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3d4654, metalness: 0.38, roughness: 0.58 });
    const focusMat = new THREE.MeshStandardMaterial({
      color: 0x2f5f96,
      metalness: 0.62,
      roughness: 0.28,
      emissive: new THREE.Color(0x11386d),
      emissiveIntensity: 0.75,
    });

    type Piece = { mesh: THREE.Mesh; abbr: string; isFocus: boolean; base: number };
    const pieces: Piece[] = [];
    const geometries: THREE.BufferGeometry[] = [];

    for (const st of states) {
      const isFocus = focusSet.has(st.abbr);
      const rings = parsePath(st.d)
        .map((r) => thin(r, 1.4))
        .filter((r) => ringArea(r) > 12);
      if (!rings.length) continue;

      /* Each ring is its own island, not a hole — the source data has no
         nested rings, so treating them as separate shapes is correct and
         avoids triangulating holes that do not exist. */
      const shapes = rings.map((ring) => {
        const s = new THREE.Shape();
        s.moveTo(ring[0].x, -ring[0].y);
        for (let i = 1; i < ring.length; i++) s.lineTo(ring[i].x, -ring[i].y);
        s.closePath();
        return s;
      });

      const depth = isFocus ? 26 : 12;
      const geo = new THREE.ExtrudeGeometry(shapes, { depth, bevelEnabled: true, bevelThickness: 1.4, bevelSize: 1.2, bevelSegments: 1, curveSegments: 1 });
      geo.computeBoundingBox();
      const bb = geo.boundingBox!;
      const cx = (bb.min.x + bb.max.x) / 2;
      const cy = (bb.min.y + bb.max.y) / 2;
      /* Centre each state on its own origin so it can be scaled to leave a
         seam, and lifted independently on hover. */
      geo.translate(-cx, -cy, 0);
      geo.computeVertexNormals();
      geometries.push(geo);

      const mesh = new THREE.Mesh(geo, isFocus ? focusMat.clone() : baseMat.clone());
      /* Rotating -90° about X sends shape-y to world -z and the extrude axis
         to world +y, so the board lies flat and stands up out of the ground.
         Scaling 0.982 in plan leaves a hairline seam between neighbours, which
         is what separates them without drawing edges. */
      mesh.scale.set(S * 0.982, S * 0.982, S);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set((cx - VB_W / 2) * S, 0, (-cy - VB_H / 2) * S);
      mesh.userData.abbr = st.abbr;
      group.add(mesh);
      pieces.push({ mesh, abbr: st.abbr, isFocus, base: 0 });
    }

    /* Sit the whole board on its own centre. */
    const box = new THREE.Box3().setFromObject(group);
    const centre = box.getCenter(new THREE.Vector3());
    group.position.x -= centre.x;
    group.position.z -= centre.z;

    /* ---- light ---------------------------------------------------------- */

    const hemi = new THREE.HemisphereLight(0x9ec7ff, 0x0a1220, 1.15);
    scene.add(hemi);
    const key = new THREE.DirectionalLight(0xffffff, 2.4);
    key.position.set(6, 12, 7);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x4f97ff, 1.9);
    rim.position.set(-8, 4, -6);
    scene.add(rim);
    const fill = new THREE.PointLight(0xb3d4ff, 34, 44, 2);
    fill.position.set(-4, 3.4, 5);
    scene.add(fill);

    /* ---- state ---------------------------------------------------------- */

    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2(-2, -2);
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    let visible = false;
    let hidden = document.hidden;
    let rise = 0;
    let localHover: string | null = null;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      /* Keep the whole board framed on narrow columns. */
      const fit = Math.min(1, w / 640);
      camera.position.set(CAM.x, CAM.y + (1 - fit) * 3.2, CAM.z + (1 - fit) * 4.4);
      camera.updateProjectionMatrix();
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onPointer = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const x = (e.clientX - r.left) / Math.max(r.width, 1);
      const y = (e.clientY - r.top) / Math.max(r.height, 1);
      pointerTarget.set(x * 2 - 1, -(y * 2 - 1));
      ndc.set(x * 2 - 1, -(y * 2 - 1));
    };
    const onLeave = () => {
      ndc.set(-2, -2);
      pointerTarget.set(0, 0);
      if (localHover) {
        localHover = null;
        onHoverRef.current(null);
      }
    };
    if (fine) {
      el.addEventListener("pointermove", onPointer, { passive: true });
      el.addEventListener("pointerleave", onLeave);
    }

    const onVis = () => (hidden = document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "160px" });
    io.observe(el);

    /* The board rises once, west to east. */
    const riseState = { v: 0 };
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top 80%",
      once: true,
      onEnter: () => gsap.to(riseState, { v: 1, duration: 1.9, ease: EASE.out }),
    });

    const meshes = pieces.map((p) => p.mesh);
    let raycastAt = 0;

    const tick = (_t: number, delta: number) => {
      if (!visible || hidden) return;
      const dt = Math.min(delta / 1000, 1 / 24);
      rise = riseState.v;

      pointer.lerp(pointerTarget, damp(3.4, dt));
      camera.position.x = pointer.x * 1.5;
      camera.position.y = CAM.y - pointer.y * 1.1 + (1 - rise) * 1.4;
      camera.lookAt(0, 0, 0);

      /* Raycast at most ~20/s; a hover test does not need every frame. */
      raycastAt += delta;
      if (fine && raycastAt > 50 && ndc.x > -1.5) {
        raycastAt = 0;
        ray.setFromCamera(ndc, camera);
        const hit = ray.intersectObjects(meshes, false)[0];
        const abbr = (hit?.object.userData.abbr as string | undefined) ?? null;
        if (abbr !== localHover) {
          localHover = abbr;
          onHoverRef.current(abbr);
        }
      }

      const active = hoverRef.current;
      for (let i = 0; i < pieces.length; i++) {
        const p = pieces[i];
        const on = p.abbr === active;
        /* West to east: a state's own x is its delay, so the board assembles
           in the direction the business runs. */
        const delay = 0.35 * (0.5 + p.mesh.position.x / (SPAN * 2));
        const phase = THREE.MathUtils.clamp((rise * 1.4 - delay) * 3.0, 0, 1);
        const target = phase * (on ? 0.62 : 0) + (p.isFocus ? phase * 0.16 : 0);
        p.base += (target - p.base) * damp(9, dt);
        p.mesh.position.y = p.base + (phase - 1) * 2.4;
        const m = p.mesh.material as THREE.MeshStandardMaterial;
        const emis = on ? 2.1 : p.isFocus ? 0.9 : 0;
        m.emissiveIntensity += (emis - m.emissiveIntensity) * damp(8, dt);
        if (on && m.emissive.getHex() === 0x000000) m.emissive.setHex(0x1b4c8f);
        m.opacity = phase;
        m.transparent = phase < 0.999;
      }

      renderer.render(scene, camera);
    };
    gsap.ticker.add(tick);
    onReadyRef.current?.(true);

    return () => {
      onReadyRef.current?.(false);
      gsap.ticker.remove(tick);
      st.kill();
      gsap.killTweensOf(riseState);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      if (fine) {
        el.removeEventListener("pointermove", onPointer);
        el.removeEventListener("pointerleave", onLeave);
      }
      geometries.forEach((g) => g.dispose());
      pieces.forEach((p) => (p.mesh.material as THREE.Material).dispose());
      baseMat.dispose();
      focusMat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      el.removeAttribute("data-gl-ready");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} data-coverage-scene className={className} />;
}
