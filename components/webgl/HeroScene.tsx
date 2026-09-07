"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import { gsap, perfTier, dprCap, damp, EASE } from "@/lib/motion";
import scene from "@/lib/hero-scene.json";

/**
 * The hero as one lit scene: the hauler photograph on a fullscreen quad with
 * depth parallax (pointer + scroll), a scroll dolly about the load, road-light
 * traces confined to the road, a specular sweep across the steel, a cool
 * grade, and a five-slat diagonal reveal. Mask channels: R hauler, G road,
 * B depth (see scripts/masks.mjs). Rendered on GSAP's ticker; parked when
 * off-screen; disposed completely on unmount.
 *
 * Never mounted under reduced motion or without WebGL — the caller gates it
 * and the <picture> beneath is the complete fallback.
 */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uPhoto;
  uniform sampler2D uMask;
  uniform vec2 uRes;
  uniform vec2 uImg;
  uniform vec2 uFocal;
  uniform vec2 uVanish;
  uniform vec2 uPointer;
  uniform float uScroll;
  uniform float uTime;
  uniform float uReveal;
  uniform float uSweep;
  uniform float uZoom;
  uniform float uTraces;
  uniform float uOpacity;
  varying vec2 vUv;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  /* object-fit: cover with a focal point, plus a base over-scan so parallax never shows an edge. */
  vec2 coverUV(vec2 uv, float zoom) {
    float sa = uRes.x / uRes.y;
    float ia = uImg.x / uImg.y;
    vec2 span = (sa > ia) ? vec2(1.0, ia / sa) : vec2(sa / ia, 1.0);
    span /= zoom;
    vec2 origin = uFocal * (1.0 - span);
    return origin + uv * span;
  }

  void main() {
    vec2 screen = vUv;                     // 0..1, y up
    vec2 focalGl = vec2(uFocal.x, 1.0 - uFocal.y);

    /* dolly about the focal point */
    float zoom = uZoom * (1.0 + uScroll * 0.16);
    vec2 base = coverUV(screen, zoom);

    /* depth from the mask at the un-displaced sample */
    vec4 m0 = texture2D(uMask, base);
    float depth = m0.b;
    vec2 shift = (depth - 0.5) * (uPointer * vec2(0.014, 0.010) + vec2(0.0, -uScroll * 0.028));
    vec2 uv = base + shift;

    vec4 mask = texture2D(uMask, uv);
    vec3 col = texture2D(uPhoto, uv).rgb;

    /* cool grade: lift blacks toward midnight, desaturate slightly */
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(vec3(lum), col, 0.9);
    col *= vec3(0.94, 0.97, 1.04);
    col = col * 0.94 + vec3(0.016, 0.022, 0.04);

    /* steel sweep across the hauler */
    float diag = screen.x * 0.8 + (1.0 - screen.y) * 0.45;
    float band = exp(-pow((diag - (uSweep * 1.6 - 0.2)) * 6.5, 2.0));
    col += mask.r * band * vec3(0.55, 0.68, 0.9) * 0.42;
    /* faint constant rim light on the load, so the steel reads even at rest */
    col += mask.r * (0.03 + 0.03 * sin(uTime * 0.6)) * vec3(0.5, 0.65, 1.0);

    /* road light traces: stripes streaming from the vanishing point along the road */
    if (uTraces > 0.5 && mask.g > 0.02) {
      vec2 vp = vec2(uVanish.x, 1.0 - uVanish.y);
      vec2 d = screen - vp;
      float dist = length(d);
      float ang = atan(d.y, d.x);
      float lanes = sin(ang * 42.0 + 1.7) * 0.5 + 0.5;
      float run = fract(dist * 6.0 - uTime * (0.9 + uScroll * 2.2));
      float streak = smoothstep(0.55, 1.0, run) * smoothstep(1.0, 0.92, run);
      float glow = pow(lanes, 6.0) * streak * smoothstep(0.02, 0.25, dist);
      col += mask.g * glow * vec3(0.55, 0.72, 1.0) * 0.7;
      col += mask.g * 0.05 * vec3(0.4, 0.6, 1.0);
    }

    /* vignette + grain */
    float vig = smoothstep(1.25, 0.35, length((screen - 0.5) * vec2(1.15, 1.0)));
    col *= mix(0.72, 1.0, vig);
    col += (hash(screen * uRes.xy * 0.5 + uTime) - 0.5) * 0.02;

    /* five-slat diagonal reveal */
    float k = screen.x * 0.9 + (1.0 - screen.y) * 0.35;
    float slot = floor(k * 5.0);
    float local = fract(k * 5.0);
    float prog = clamp(uReveal * 1.5 - slot * 0.09, 0.0, 1.1);
    float edge = smoothstep(prog, prog - 0.06, local);
    float alpha = edge * uOpacity;

    gl_FragColor = vec4(col, alpha);
  }
`;

export function HeroScene({
  className,
  scrollRef,
  onReady,
}: {
  className?: string;
  /** 0..1 progress of the hero's pinned scroll, written by the hero. */
  scrollRef: MutableRefObject<number>;
  onReady?: () => void;
}) {
  const host = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const section = el.closest<HTMLElement>("[data-hero]") ?? el.parentElement!;
    const tier = perfTier();
    if (tier === 0) return;

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true, powerPreference: "high-performance", stencil: false, depth: false });
    renderer.setPixelRatio(dprCap(tier >= 3 ? 2 : 1.5));
    renderer.setClearColor(0x000000, 0);
    const canvas = renderer.domElement;
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none;";
    el.appendChild(canvas);

    const uniforms = {
      uPhoto: { value: null as THREE.Texture | null },
      uMask: { value: null as THREE.Texture | null },
      uRes: { value: new THREE.Vector2(1, 1) },
      uImg: { value: new THREE.Vector2(scene.textureWidth, scene.textureWidth) },
      uFocal: { value: new THREE.Vector2(scene.focal[0], scene.focal[1]) },
      uVanish: { value: new THREE.Vector2(scene.vanish[0], scene.vanish[1]) },
      uPointer: { value: new THREE.Vector2() },
      uScroll: { value: 0 },
      uTime: { value: 0 },
      uReveal: { value: 0 },
      uSweep: { value: -0.6 },
      uZoom: { value: 1.1 },
      uTraces: { value: tier >= 2 ? 1 : 0 },
      uOpacity: { value: 1 },
    };
    const mat = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms, transparent: true, depthWrite: false, depthTest: false });
    const geo = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geo, mat);
    const stage = new THREE.Scene();
    stage.add(quad);
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    let ready = false;
    let disposed = false;
    const loader = new THREE.TextureLoader();
    /* Never ask for a width the ladder did not produce: the master caps the
       ladder, and a missing texture is a 404 plus a hero that never appears. */
    const width = Math.min(tier >= 3 ? 2400 : 1800, scene.textureWidth);
    const photoUrl = `/media/gen/${scene.photo}-${width}.jpg`;
    const maskUrl = `/media/gen/mask-${scene.photo}.png`;
    const textures: THREE.Texture[] = [];

    Promise.all([
      new Promise<THREE.Texture>((res, rej) => loader.load(photoUrl, res, undefined, rej)),
      new Promise<THREE.Texture>((res, rej) => loader.load(maskUrl, res, undefined, rej)),
    ])
      .then(([photo, mask]) => {
        if (disposed) {
          photo.dispose();
          mask.dispose();
          return;
        }
        photo.colorSpace = THREE.SRGBColorSpace;
        photo.minFilter = THREE.LinearFilter;
        photo.generateMipmaps = false;
        mask.minFilter = THREE.LinearFilter;
        mask.generateMipmaps = false;
        textures.push(photo, mask);
        uniforms.uPhoto.value = photo;
        uniforms.uMask.value = mask;
        const img = photo.image as { width: number; height: number };
        uniforms.uImg.value.set(img.width, img.height);
        ready = true;
        onReady?.();
        intro.play();
      })
      .catch(() => {
        /* the <picture> beneath remains; nothing else to do */
      });

    /* ---- state ---- */
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const lastPointer = new THREE.Vector2();
    let visible = true;
    let hidden = document.hidden;
    let t = 0;
    let scroll = 0;
    let sweeping = false;
    let idle = 0;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h, false);
      uniforms.uRes.value.set(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onPointer = (e: PointerEvent) => {
      pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -((e.clientY / window.innerHeight) * 2 - 1));
    };
    if (fine) window.addEventListener("pointermove", onPointer, { passive: true });
    const onVis = () => (hidden = document.hidden);
    document.addEventListener("visibilitychange", onVis);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: "80px" });
    io.observe(section);

    const sweep = () => {
      if (sweeping) return;
      sweeping = true;
      gsap.fromTo(uniforms.uSweep, { value: -0.6 }, { value: 1.4, duration: 1.7, ease: EASE.inOut, onComplete: () => (sweeping = false) });
    };

    const intro = gsap
      .timeline({ paused: true })
      .to(uniforms.uReveal, { value: 1, duration: 1.25, ease: EASE.veil }, 0.15)
      .to(uniforms.uZoom, { value: 1.04, duration: 2.4, ease: EASE.out }, 0.15)
      .add(sweep, 0.9);

    const tick = (_time: number, dt: number) => {
      if (!visible || hidden || !ready) return;
      const d = Math.min(dt / 1000, 1 / 30);
      t += d;
      idle += d;
      pointer.lerp(pointerTarget, damp(4.5, d));
      scroll += (scrollRef.current - scroll) * damp(8, d);
      // pointer velocity → a sweep, at most every few seconds
      const speed = pointer.distanceTo(lastPointer) / Math.max(d, 1e-3);
      lastPointer.copy(pointer);
      if (fine && speed > 2.2 && idle > 4.5) {
        idle = 0;
        sweep();
      } else if (idle > 9) {
        idle = 0;
        sweep();
      }
      uniforms.uTime.value = t;
      uniforms.uScroll.value = scroll;
      uniforms.uPointer.value.copy(pointer);
      renderer.render(stage, cam);
    };
    gsap.ticker.add(tick);

    return () => {
      disposed = true;
      intro.kill();
      gsap.killTweensOf(uniforms.uSweep);
      gsap.ticker.remove(tick);
      io.disconnect();
      ro.disconnect();
      if (fine) window.removeEventListener("pointermove", onPointer);
      document.removeEventListener("visibilitychange", onVis);
      textures.forEach((tx) => tx.dispose());
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={host} aria-hidden className={className} />;
}
