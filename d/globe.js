// P1-D hero globe: a dotted Earth (land only) with trade routes arcing into one hub, goods travelling both ways
// along them. Routes are illustrative and unlabelled. Colours follow the page theme; renders only while on screen.
import * as THREE from 'three';

const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(pointer: fine)').matches;
const DEG = Math.PI / 180;
const HUB = [55.2, 23.9];                                   // the bureau
const ENDS = [[51, 10], [52.5, -1], [47, 2.5], [40.4, -3.7], [42, 12.5], [52.2, 19], [52.3, 5], [59.5, 15], [50, 15], [45, 25],
  [39.5, 33], [24.5, 54.4], [40.7, -74], [61, 25], [38.5, 22.5], [48.5, 31.5], [56.9, 24.1], [43.7, 7.3], [-33.9, 18.4], [31.2, 121.4]];

const vec = (lat, lon, r = 1) => new THREE.Vector3(Math.cos(lat * DEG) * Math.cos(lon * DEG), Math.sin(lat * DEG), -Math.cos(lat * DEG) * Math.sin(lon * DEG)).multiplyScalar(r);
const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#3366FF';

async function landMask() {
  // world-atlas land polygons, drawn into a small equirectangular bitmap we can sample
  const [topo, tc] = await Promise.all([
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json').then(r => r.json()),
    import('https://cdn.jsdelivr.net/npm/topojson-client@3/+esm'),
  ]);
  const W = 720, H = 360, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); ctx.fillStyle = '#000';
  const land = tc.feature(topo, topo.objects.land);
  const polys = land.features ? land.features.flatMap(f => f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates) :
    (land.geometry.type === 'Polygon' ? [land.geometry.coordinates] : land.geometry.coordinates);
  ctx.beginPath();
  for (const poly of polys) for (const ring of poly) {
    let prev = null;
    ring.forEach(([lon, lat], i) => {
      const x = (lon + 180) / 360 * W, y = (90 - lat) / 180 * H;
      if (i === 0 || (prev !== null && Math.abs(x - prev) > W / 2)) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      prev = x;
    });
    ctx.closePath();
  }
  ctx.fill('evenodd');
  const data = ctx.getImageData(0, 0, W, H).data;
  return (lat, lon) => { const x = Math.min(W - 1, Math.floor((lon + 180) / 360 * W)), y = Math.min(H - 1, Math.floor((90 - lat) / 180 * H)); return data[(y * W + x) * 4 + 3] > 0; };
}

export async function initGlobe(box) {
  const canvas = box.querySelector('canvas');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 50); camera.position.set(0, 0, 4.4);
  const globe = new THREE.Group(); scene.add(globe);

  let isLand = () => true;
  try { isLand = await landMask(); } catch (e) { /* no map data: a plain dotted sphere still reads as a globe */ }

  // dots on land (Fibonacci sphere)
  const N = 22000, pts = [];
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = Math.PI * (3 - Math.sqrt(5)) * i;
    const x = Math.cos(th) * r, z = Math.sin(th) * r;
    const lat = Math.asin(y) / DEG, lon = Math.atan2(-z, x) / DEG;
    if (isLand(lat, lon)) pts.push(x, y, z);
  }
  const dotGeo = new THREE.BufferGeometry(); dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const dotMat = new THREE.PointsMaterial({ size: .019, transparent: true, opacity: 1, sizeAttenuation: true });
  globe.add(new THREE.Points(dotGeo, dotMat));
  // a solid inner sphere hides the far side; a faint rim gives it an edge
  const coreMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: .92 });
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(.985, 64, 48), coreMat));
  const rimMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .5 });
  const rim = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(Array.from({ length: 129 }, (_, i) => new THREE.Vector3(Math.cos(i / 128 * Math.PI * 2), Math.sin(i / 128 * Math.PI * 2), 0))), rimMat);
  scene.add(rim);

  // routes: great-circle arcs lifted by distance, all meeting at the hub
  const hub = vec(...HUB);
  const arcMat = new THREE.LineBasicMaterial({ transparent: true, opacity: .75 });
  const curves = ENDS.map(([la, lo]) => {
    const a = vec(la, lo), ang = a.angleTo(hub), lift = .08 + ang * .32, P = [];
    for (let i = 0; i <= 64; i++) { const t = i / 64, p = new THREE.Vector3().copy(a).lerp(hub, t).normalize(); P.push(p.multiplyScalar(1 + Math.sin(Math.PI * t) * lift)); }
    globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(P), arcMat));
    return new THREE.CatmullRomCurve3(P);
  });
  // goods: small cubes moving along the routes, some towards the hub (selling), some away from it (buying)
  const goodMat = new THREE.MeshBasicMaterial();
  const goods = new THREE.InstancedMesh(new THREE.BoxGeometry(.022, .022, .022), goodMat, curves.length * 2); globe.add(goods);
  const seeds = Array.from({ length: curves.length * 2 }, (_, i) => ({ c: curves[i % curves.length], off: Math.random(), dir: i < curves.length ? 1 : -1, sp: .1 + Math.random() * .08 }));
  // the hub: a ring and a bright point
  const hubMat = new THREE.MeshBasicMaterial();
  const hubDot = new THREE.Mesh(new THREE.SphereGeometry(.028, 16, 12), hubMat); hubDot.position.copy(hub).multiplyScalar(1.005); globe.add(hubDot);
  const ringMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
  const ring = new THREE.Mesh(new THREE.RingGeometry(.05, .058, 48), ringMat); ring.position.copy(hubDot.position); ring.lookAt(hub.clone().multiplyScalar(2)); globe.add(ring);

  function colours() {
    const brand = new THREE.Color(css('--brand-2')), accent = new THREE.Color(css('--accent')), paper = new THREE.Color(css('--paper')), frame = new THREE.Color(css('--frame'));
    dotMat.color.copy(brand); coreMat.color.copy(new THREE.Color(css('--surface'))).lerp(paper, .35); rimMat.color.copy(frame); arcMat.color.copy(accent);
    goodMat.color.copy(accent); hubMat.color.set('#3366FF'); ringMat.color.copy(accent);
  }
  colours(); addEventListener('p1:theme', () => { colours(); kick(); });

  // face Europe: the hub turned towards the viewer, tilted so the north reads
  const baseY = -(HUB[1] + 90) * DEG + .25, baseX = HUB[0] * DEG * .85;
  const p = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  if (fine && !reduce) addEventListener('pointermove', e => { p.x = e.clientX / innerWidth - .5; p.y = e.clientY / innerHeight - .5; }, { passive: true });

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), v = new THREE.Vector3();
  let t = 0, last = performance.now(), on = false, raf = 0;
  function frame(now) {
    const dt = Math.max(0, Math.min(.05, (now - last) / 1000)); last = now; t += dt;   // a restart can hand us an earlier timestamp
    cur.x += (p.x - cur.x) * .04; cur.y += (p.y - cur.y) * .04;
    const sc = Math.min(1, scrollY / innerHeight);
    globe.rotation.set(baseX + cur.y * .15 + sc * .15, baseY + (reduce ? 0 : Math.sin(t * .12) * .35) + cur.x * .35 + sc * .6, 0);
    seeds.forEach((g, i) => {
      let k = (((g.off + t * g.sp) % 1) + 1) % 1; if (g.dir < 0) k = 1 - k;   // always 0..1 along the route
      g.c.getPointAt(k, v); m.compose(v, q, s.setScalar(Math.sin(Math.PI * k) > .08 ? 1 : 0)); goods.setMatrixAt(i, m);
    });
    goods.instanceMatrix.needsUpdate = true;
    const pulse = reduce ? 1 : 1 + (t * .8 % 1) * 1.6; ring.scale.setScalar(pulse); ringMat.opacity = reduce ? .8 : .9 * (1 - (t * .8 % 1));
    renderer.render(scene, camera);
    if (on && !reduce) raf = requestAnimationFrame(frame);
  }
  const kick = () => { cancelAnimationFrame(raf); last = performance.now(); requestAnimationFrame(frame); };
  const size = () => { const w = box.clientWidth, h = box.clientHeight; if (!w) return; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); kick(); };
  new ResizeObserver(size).observe(box); size();
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) kick(); else cancelAnimationFrame(raf); }).observe(box);
  box.classList.add('ready');
}
