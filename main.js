// load Three.js from CDN since we aren't bundling
import * as THREE from 'https://unpkg.com/three@0.183.2/build/three.module.js';

console.log('Three.js version', THREE.REVISION);

// create scene, camera, renderer
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x000011, 0.001);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/window.innerHeight, 0.1, 5000);
camera.position.set(0, 50, 200);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000);
document.body.appendChild(renderer.domElement);

// wireframe material for ships/stations
const wireMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });

// helper to create wireframe sphere
function createWireSphere(radius, segments) {
    const geo = new THREE.SphereGeometry(radius, segments, segments);
    return new THREE.Mesh(geo, wireMat);
}

// helper to create station-like box
function createWireBox(x,y,z) {
    const geo = new THREE.BoxGeometry(x,y,z);
    return new THREE.Mesh(geo, wireMat);
}

function createRustedMaterial(hexColor) {
    const texture = createRustedSurfaceTexture(192);
    return new THREE.MeshStandardMaterial({
        color: hexColor,
        map: texture,
        roughness: 0.95,
        metalness: 0.15
    });
}

function createRustedSurfaceTexture(size = 192) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    // High-contrast grayscale camouflage texture, similar to the reference.
    const levels = [132, 164, 192, 218, 242];
    const scale1 = 0.05 + Math.random() * 0.025;
    const scale2 = scale1 * 2.4;
    const ox = Math.random() * 1000;
    const oy = Math.random() * 1000;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const nx = x * scale1 + ox;
            const ny = y * scale1 + oy;
            const v1 = Math.sin(nx * 1.7) * Math.cos(ny * 1.3);
            const v2 = Math.sin((x * scale2 + ox * 0.7) * 0.9 + Math.cos((y * scale2 + oy * 0.4) * 1.2));
            const v3 = Math.sin((x + y) * 0.045 + ox * 0.03) * 0.35;
            let n = 0.5 + 0.5 * (0.55 * v1 + 0.35 * v2 + v3);
            n = Math.max(0, Math.min(0.999, n));
            const idx = Math.min(levels.length - 1, Math.floor(n * levels.length));
            const g = levels[idx];
            ctx.fillStyle = `rgb(${g},${g},${g})`;
            ctx.fillRect(x, y, 1, 1);
        }
    }

    // Add subtle micro-grain so flat zones don't look digital.
    for (let i = 0; i < 3000; i++) {
        const x = (Math.random() * size) | 0;
        const y = (Math.random() * size) | 0;
        const d = (Math.random() > 0.5 ? 1 : -1) * (2 + (Math.random() * 8) | 0);
        const c = 128 + d;
        ctx.fillStyle = `rgba(${c},${c},${c},0.09)`;
        ctx.fillRect(x, y, 1, 1);
    }

    // Keep only very small rust hints, not dominant.
    const rustColors = ['rgba(106,49,37,0.18)', 'rgba(79,35,25,0.22)', 'rgba(122,63,47,0.16)'];
    for (let i = 0; i < 22; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const w = 2 + Math.random() * 12;
        const h = 2 + Math.random() * 8;
        const rot = (Math.random() - 0.5) * 1.2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rot);
        ctx.fillStyle = rustColors[(Math.random() * rustColors.length) | 0];
        ctx.fillRect(-w * 0.5, -h * 0.5, w, h);
        ctx.restore();
    }

    // Panel seams for manufactured look.
    ctx.strokeStyle = 'rgba(18, 18, 20, 0.28)';
    for (let i = 0; i < 6; i++) {
        const y = (i + 1) * (size / 7);
        ctx.beginPath();
        ctx.moveTo(0, y + (Math.random() - 0.5) * 2);
        ctx.lineTo(size, y + (Math.random() - 0.5) * 2);
        ctx.stroke();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1 + Math.random() * 0.35, 1 + Math.random() * 0.35);
    return tex;
}

function createRustedSegment(size, pos, color) {
    const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
    const mesh = new THREE.Mesh(geo, createRustedMaterial(color));
    mesh.position.copy(pos);
    mesh.userData.baseColor = color;
    mesh.add(
        new THREE.LineSegments(
            new THREE.EdgesGeometry(geo),
            new THREE.LineBasicMaterial({ color: 0x1a1c1f })
        )
    );
    return mesh;
}

function createWavePlanetTexture(size = 1024, palette = null) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const p = palette || {
        bgTop: '#0b1f4d',
        bgMid: '#0f3a72',
        bgBottom: '#082243',
        waveHueMin: 180,
        waveHueSpan: 35,
        cloud: 'rgba(160, 230, 255, 0.24)'
    };
    const bg = ctx.createLinearGradient(0, 0, 0, size);
    bg.addColorStop(0, p.bgTop);
    bg.addColorStop(0.45, p.bgMid);
    bg.addColorStop(1, p.bgBottom);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, size, size);

    // continent mask and land masses
    const landHue = (p.waveHueMin + 80 + Math.random() * 90) % 360;
    const continentCount = 7 + Math.floor(Math.random() * 6);
    for (let i = 0; i < continentCount; i++) {
        const cx = Math.random() * size;
        const cy = Math.random() * size;
        const rx = 80 + Math.random() * 230;
        const ry = 45 + Math.random() * 160;
        const rot = (Math.random() - 0.5) * Math.PI;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
        grad.addColorStop(0, `hsla(${landHue}, 36%, ${30 + Math.random() * 16}%, 0.85)`);
        grad.addColorStop(0.65, `hsla(${landHue + 18}, 42%, ${24 + Math.random() * 14}%, 0.68)`);
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(rot);
        ctx.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry));
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(rx, ry), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    // layered sinusoidal bands inspired by ocean wave patterns
    for (let i = 0; i < 180; i++) {
        const yBase = (i / 180) * size;
        const amp = 6 + Math.random() * 18;
        const freq = 0.006 + Math.random() * 0.018;
        const phase = Math.random() * Math.PI * 2;
        const thickness = 1 + Math.random() * 2.8;
        const alpha = 0.14 + Math.random() * 0.32;
        const hue = p.waveHueMin + Math.floor(Math.random() * p.waveHueSpan);
        const light = 35 + Math.floor(Math.random() * 30);
        ctx.strokeStyle = `hsla(${hue}, 70%, ${light}%, ${alpha})`;
        ctx.lineWidth = thickness;
        ctx.beginPath();
        for (let x = 0; x <= size; x += 8) {
            const y = yBase + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 0.45 + phase * 1.7) * amp * 0.35;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // soft cloud-like overlays
    for (let i = 0; i < 80; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 12 + Math.random() * 44;
        const cloud = ctx.createRadialGradient(x, y, 0, x, y, r);
        cloud.addColorStop(0, p.cloud);
        cloud.addColorStop(1, 'rgba(160, 230, 255, 0)');
        ctx.fillStyle = cloud;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

function createPlanetWeatherTexture(size = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, size, size);

    // broad cloud bands
    for (let i = 0; i < 120; i++) {
        const yBase = (i / 120) * size;
        const amp = 5 + Math.random() * 16;
        const freq = 0.007 + Math.random() * 0.02;
        const phase = Math.random() * Math.PI * 2;
        ctx.strokeStyle = `rgba(235,245,255,${0.05 + Math.random() * 0.2})`;
        ctx.lineWidth = 1 + Math.random() * 3.2;
        ctx.beginPath();
        for (let x = 0; x <= size; x += 10) {
            const y = yBase + Math.sin(x * freq + phase) * amp;
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }

    // storms
    for (let i = 0; i < 26; i++) {
        const x = Math.random() * size;
        const y = Math.random() * size;
        const r = 18 + Math.random() * 70;
        const storm = ctx.createRadialGradient(x, y, 0, x, y, r);
        storm.addColorStop(0, `rgba(255,255,255,${0.2 + Math.random() * 0.22})`);
        storm.addColorStop(0.45, `rgba(210,228,255,${0.1 + Math.random() * 0.14})`);
        storm.addColorStop(1, 'rgba(210,228,255,0)');
        ctx.fillStyle = storm;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
}

function createSunHeatmapTexture(size = 256) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(size, size);
    const data = image.data;

    function update(time) {
        let idx = 0;
        for (let y = 0; y < size; y++) {
            for (let x = 0; x < size; x++) {
                const u = (x / (size - 1)) * 2 - 1;
                const v = (y / (size - 1)) * 2 - 1;
                const r = Math.sqrt(u * u + v * v);
                const edge = Math.max(0, 1 - r);
                const ring = 0.5 + 0.5 * Math.sin(16 * r - time * 3.4 + Math.sin((x + y) * 0.03 + time));
                const swirl = 0.5 + 0.5 * Math.sin(x * 0.08 - y * 0.06 + time * 2.2);
                const flicker = 0.5 + 0.5 * Math.sin((x * 0.2 + y * 0.15) + time * 5.3);
                const heat = Math.min(1, edge * (0.45 + 0.4 * ring + 0.25 * swirl) + edge * flicker * 0.18);

                const red = Math.min(255, 140 + heat * 140);
                const green = Math.min(255, 35 + heat * 190);
                const blue = Math.max(0, 8 + heat * 70 - Math.max(0, (heat - 0.85) * 120));

                data[idx++] = red;
                data[idx++] = green;
                data[idx++] = blue;
                data[idx++] = 255;
            }
        }

        ctx.putImageData(image, 0, 0);
        texture.needsUpdate = true;
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;

    return { texture, update };
}

// add some objects
const shipGroup = new THREE.Group();
shipGroup.position.set(0,0,0);
scene.add(shipGroup);
let updateFusionExhaust = () => {};
let currentShipSpec = null;
let shipPerfReady = false;
let activeOwnedShipId = null;
let previewShipId = null;
const ownedShipIds = new Set();
let shield = 100;
let shieldMax = 100;
let shieldRegenRate = 8;
let shieldRegenDelay = 2.6;
let shieldRegenTimer = 0;
let coreIntegrity = 100;
let weaponsIntegrity = 100;
let weaponsOfflineTimer = 0;
let shipDestroyed = false;
let escapePodMode = false;
let escapePodTargetStation = null;
let damageFlashTimer = 0;
let damageFlashStrength = 0;
let credits = 60000;
let fuel = 100;
let hull = 100;
const cargoHold = { ore: 0, tech: 0, meds: 0, spice: 0, contraband: 0, relics: 0 };
let engineLevel = 1;

function randRange(min, max) {
    return min + Math.random() * (max - min);
}

function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function generateShipName() {
    const a = ['Rook', 'Nova', 'Cinder', 'Atlas', 'Warden', 'Halo', 'Argent', 'Kestrel', 'Ion', 'Vanguard'];
    const b = ['Runner', 'Hauler', 'Moth', 'Sparrow', 'Drift', 'Lancer', 'Courier', 'Jackal', 'Forge', 'Pioneer'];
    return `${pick(a)} ${pick(b)}`;
}

function createShipSpecByTier(id, tier, forcedName = null) {
    const tiers = {
        small: {
            size: { w: [2.2, 2.8], h: [0.95, 1.35], l: [4.6, 6.0] },
            podLen: [1.6, 2.5],
            podOffset: [1.4, 1.9],
            rear: { w: [1.2, 1.8], h: [0.55, 0.9], l: [0.7, 1.05] },
            patch: [6, 10],
            accel: [6.0, 8.4],
            speed: [200, 250],
            cargo: [40, 60],
            laserCount: [1, 2],
            laserReload: [0.22, 0.32],
            price: [0, 0],
            hullPalette: [0xcfd8e2, 0xc0cad5, 0xdde5ee, 0xb5c1cd],
            detailPalette: [0xe8eef5, 0xd9e2ec, 0xcad4df, 0x4f6d89, 0x3a5772, 0x7b95aa],
            rustPatchPalette: [0x6a3125, 0x4f2319, 0x7a3f2f],
            signaturePalette: [0x3dd5ff, 0x66e8ff]
        },
        medium: {
            size: { w: [3.1, 4.1], h: [1.35, 2.1], l: [7.4, 10.2] },
            podLen: [2.7, 4.2],
            podOffset: [2.0, 2.8],
            rear: { w: [1.9, 2.8], h: [0.9, 1.4], l: [1.0, 1.8] },
            patch: [10, 16],
            accel: [7.8, 10.8],
            speed: [250, 320],
            cargo: [80, 120],
            laserCount: [2, 3],
            laserReload: [0.18, 0.25],
            price: [9000, 14000],
            hullPalette: [0x8fa2b8, 0x7f95ac, 0xa5b8cc, 0x6f8397],
            detailPalette: [0xbcc9d8, 0xa8bacf, 0x96aeca, 0xff8a5b, 0xff6c3d, 0xc75e3b],
            rustPatchPalette: [0x8a3f2d, 0x6b2f23, 0xa34d37],
            signaturePalette: [0xff6c3d, 0xff9a52, 0xffba66]
        },
        large: {
            size: { w: [4.6, 6.1], h: [2.0, 2.9], l: [10.8, 14.8] },
            podLen: [3.8, 5.6],
            podOffset: [2.7, 3.8],
            rear: { w: [2.8, 4.1], h: [1.3, 1.95], l: [1.5, 2.5] },
            patch: [14, 22],
            accel: [7.0, 9.2],
            speed: [300, 380],
            cargo: [140, 190],
            laserCount: [3, 4],
            laserReload: [0.15, 0.22],
            price: [13000, 21000],
            hullPalette: [0xb79f6c, 0xa38d5f, 0xcab57f, 0x8d7a53],
            detailPalette: [0xd4c18e, 0xc6b280, 0xbca873, 0x72ff8f, 0x4ce676, 0x2fb95a],
            rustPatchPalette: [0x6c4a27, 0x593d20, 0x7d5630],
            signaturePalette: [0x72ff8f, 0x4ce676, 0x96ffad]
        },
        very_large: {
            size: { w: [6.4, 8.8], h: [2.8, 4.0], l: [15.8, 22.0] },
            podLen: [5.2, 8.4],
            podOffset: [3.8, 5.6],
            rear: { w: [4.2, 6.3], h: [1.8, 2.9], l: [2.2, 4.1] },
            patch: [18, 30],
            accel: [5.8, 7.8],
            speed: [340, 460],
            cargo: [230, 320],
            laserCount: [4, 6],
            laserReload: [0.11, 0.17],
            price: [22000, 36000],
            hullPalette: [0x6f6788, 0x61597b, 0x887fa1, 0x544e6d],
            detailPalette: [0xa49cc2, 0x918ab0, 0x837ba5, 0xff5ca8, 0xd44fbf, 0xc18dff],
            rustPatchPalette: [0x5a2d49, 0x4a253c, 0x6f3557],
            signaturePalette: [0xc18dff, 0xff5ca8, 0xd880ff]
        }
    };
    const t = tiers[tier] || tiers.medium;
    const hullW = randRange(t.size.w[0], t.size.w[1]);
    const hullH = randRange(t.size.h[0], t.size.h[1]);
    const hullL = randRange(t.size.l[0], t.size.l[1]);
    return {
        id,
        tier,
        name: forcedName || generateShipName(),
        price: Math.round(randRange(t.price[0], t.price[1])),
        hullPalette: t.hullPalette,
        detailPalette: t.detailPalette,
        rustPatchPalette: t.rustPatchPalette,
        hullW,
        hullH,
        hullL,
        podLen: randRange(t.podLen[0], t.podLen[1]),
        podOffset: randRange(t.podOffset[0], t.podOffset[1]),
        podH: randRange(Math.max(0.6, hullH * 0.45), Math.max(0.9, hullH * 0.7)),
        noseR: randRange(Math.max(0.9, hullW * 0.28), hullW * 0.4),
        noseL: randRange(Math.max(2.0, hullL * 0.28), hullL * 0.45),
        rearBlockW: randRange(t.rear.w[0], t.rear.w[1]),
        rearBlockH: randRange(t.rear.h[0], t.rear.h[1]),
        rearBlockL: randRange(t.rear.l[0], t.rear.l[1]),
        patchCount: Math.floor(randRange(t.patch[0], t.patch[1] + 1)),
        signatureColor: pick(t.signaturePalette),
        cockpitType: Math.floor(Math.random() * 4),
        cargoCapacity: Math.round(randRange(t.cargo[0], t.cargo[1])),
        laserCount: Math.round(randRange(t.laserCount[0], t.laserCount[1] + 0.49)),
        laserReload: randRange(t.laserReload[0], t.laserReload[1]),
        accel: randRange(t.accel[0], t.accel[1]),
        speed: randRange(t.speed[0], t.speed[1])
    };
}

function buildShipModel(spec) {
    const modelRoot = new THREE.Group();
    const mainHullSize = new THREE.Vector3(spec.hullW, spec.hullH, spec.hullL);
    const mainHull = createRustedSegment(mainHullSize, new THREE.Vector3(0, 0, 0), spec.hullPalette[0]);
    modelRoot.add(mainHull);

    function addPanelGridToHull(face, rows = 2, cols = 4) {
        const hx = mainHullSize.x * 0.5;
        const hy = mainHullSize.y * 0.5;
        const hz = mainHullSize.z * 0.5;
        const count = rows * cols;
        for (let i = 0; i < count; i++) {
            const r = Math.floor(i / cols);
            const c = i % cols;
            const u = (c + 0.5) / cols;
            const v = (r + 0.5) / rows;
            let size;
            let pos;
            if (face === 'top' || face === 'bottom') {
                size = new THREE.Vector3(0.34, 0.06, Math.max(0.5, spec.hullL * 0.14));
                const x = -hx * 0.72 + u * hx * 1.44;
                const z = -hz * 0.74 + v * hz * 1.48;
                const y = face === 'top' ? hy + 0.04 : -hy - 0.04;
                pos = new THREE.Vector3(x, y, z);
            } else if (face === 'left' || face === 'right') {
                size = new THREE.Vector3(0.06, 0.32, Math.max(0.5, spec.hullL * 0.15));
                const y = -hy * 0.72 + u * hy * 1.44;
                const z = -hz * 0.74 + v * hz * 1.48;
                const x = face === 'right' ? hx + 0.04 : -hx - 0.04;
                pos = new THREE.Vector3(x, y, z);
            } else {
                size = new THREE.Vector3(0.36, 0.28, 0.06);
                const x = -hx * 0.72 + u * hx * 1.44;
                const y = -hy * 0.72 + v * hy * 1.44;
                const z = face === 'front' ? -hz - 0.04 : hz + 0.04;
                pos = new THREE.Vector3(x, y, z);
            }
            const panelColor = spec.detailPalette[Math.floor(Math.random() * spec.detailPalette.length)];
            mainHull.add(createRustedSegment(size, pos, panelColor));
        }
    }

    ['top', 'bottom', 'left', 'right', 'front', 'back'].forEach((face) => addPanelGridToHull(face));
    const nose = new THREE.Mesh(
        new THREE.ConeGeometry(spec.noseR, spec.noseL, 5),
        createRustedMaterial(spec.hullPalette[2])
    );
    // point ship nose toward -Z (forward)
    nose.rotation.x = -Math.PI / 2;
    nose.position.set(0, 0, -spec.hullL * 0.5 - spec.noseL * 0.45);
    nose.userData.baseColor = spec.hullPalette[2];
    nose.add(
        new THREE.LineSegments(
            new THREE.EdgesGeometry(nose.geometry),
            new THREE.LineBasicMaterial({ color: 0x1a1c1f })
        )
    );
    modelRoot.add(nose);

    modelRoot.add(createRustedSegment(
        new THREE.Vector3(0.9, spec.podH, spec.podLen),
        new THREE.Vector3(-spec.podOffset, -0.15, -0.8),
        spec.hullPalette[1]
    ));
    modelRoot.add(createRustedSegment(
        new THREE.Vector3(0.9, spec.podH, spec.podLen),
        new THREE.Vector3(spec.podOffset, -0.15, -0.8),
        spec.hullPalette[1]
    ));
    modelRoot.add(createRustedSegment(
        new THREE.Vector3(spec.rearBlockW, spec.rearBlockH, spec.rearBlockL),
        new THREE.Vector3(0, 0.05, spec.hullL * 0.52),
        spec.hullPalette[3]
    ));

    // signature color accent so each ship is identifiable at a glance
    modelRoot.add(createRustedSegment(
        new THREE.Vector3(spec.hullW * 0.45, 0.08, Math.max(0.7, spec.hullL * 0.22)),
        new THREE.Vector3(0, spec.hullH * 0.55 + 0.06, -spec.hullL * 0.08),
        spec.signatureColor
    ));

    // varied cockpit styles
    let cockpit;
    if (spec.cockpitType === 0) {
        cockpit = new THREE.Mesh(
            new THREE.SphereGeometry(0.52 + spec.hullW * 0.05, 14, 10),
            new THREE.MeshStandardMaterial({ color: 0x6ea0bd, roughness: 0.2, metalness: 0.45, transparent: true, opacity: 0.9 })
        );
        cockpit.scale.set(1.15, 0.72, 1.35);
        cockpit.position.set(0, spec.hullH * 0.36, -spec.hullL * 0.32);
    } else if (spec.cockpitType === 1) {
        cockpit = new THREE.Mesh(
            new THREE.CylinderGeometry(0.26, 0.5, 1.35, 10),
            new THREE.MeshStandardMaterial({ color: 0x6ea0bd, roughness: 0.24, metalness: 0.4, transparent: true, opacity: 0.88 })
        );
        cockpit.rotation.x = -Math.PI / 2;
        cockpit.scale.set(1.05, 0.82, 1.2);
        cockpit.position.set(0, spec.hullH * 0.34, -spec.hullL * 0.34);
    } else if (spec.cockpitType === 2) {
        cockpit = new THREE.Mesh(
            new THREE.BoxGeometry(0.95 + spec.hullW * 0.1, 0.45, 1.15),
            new THREE.MeshStandardMaterial({ color: 0x7fb3cb, roughness: 0.2, metalness: 0.38, transparent: true, opacity: 0.86 })
        );
        cockpit.position.set(0, spec.hullH * 0.32, -spec.hullL * 0.3);
    } else {
        cockpit = new THREE.Mesh(
            new THREE.ConeGeometry(0.58 + spec.hullW * 0.05, 1.3, 8),
            new THREE.MeshStandardMaterial({ color: 0x79a9c6, roughness: 0.22, metalness: 0.42, transparent: true, opacity: 0.86 })
        );
        cockpit.rotation.x = -Math.PI / 2;
        cockpit.position.set(0, spec.hullH * 0.3, -spec.hullL * 0.36);
    }
    cockpit.userData.baseColor = spec.signatureColor;
    modelRoot.add(cockpit);
    for (let i = 0; i < spec.patchCount; i++) {
        modelRoot.add(
            createRustedSegment(
                new THREE.Vector3(0.35 + Math.random() * 0.55, 0.08 + Math.random() * 0.1, 0.5 + Math.random() * 0.9),
                new THREE.Vector3(
                    (Math.random() - 0.5) * (spec.hullW * 0.7),
                    (Math.random() - 0.5) * (spec.hullH * 0.8),
                    -spec.hullL * 0.35 + Math.random() * (spec.hullL * 0.75)
                ),
                spec.rustPatchPalette[Math.floor(Math.random() * spec.rustPatchPalette.length)]
            )
        );
    }

    // visible gun turrets
    const turretMountCount = Math.max(2, Math.min(5, spec.laserCount + 1));
    const turretSpan = Math.max(0.8, spec.hullW * 0.55);
    for (let i = 0; i < turretMountCount; i++) {
        const t = turretMountCount === 1 ? 0 : (i / (turretMountCount - 1)) * 2 - 1;
        const x = t * turretSpan * 0.5;
        const z = -spec.hullL * 0.08 + (i % 2 === 0 ? -0.25 : 0.18);
        const y = spec.hullH * 0.52;
        const turret = new THREE.Group();
        turret.position.set(x, y, z);
        const base = new THREE.Mesh(
            new THREE.CylinderGeometry(0.14, 0.18, 0.12, 9),
            createRustedMaterial(spec.detailPalette[i % spec.detailPalette.length])
        );
        const head = new THREE.Mesh(
            new THREE.CylinderGeometry(0.11, 0.11, 0.2, 9),
            createRustedMaterial(spec.signatureColor)
        );
        const barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.032, 0.032, 0.62, 8),
            createRustedMaterial(0x8fa4b8)
        );
        head.rotation.x = Math.PI / 2;
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.34;
        base.add(head);
        head.add(barrel);
        turret.add(base);
        turret.userData.baseColor = spec.signatureColor;
        modelRoot.add(turret);
    }

    // fusion exhaust
    const nozzle = new THREE.Mesh(
        new THREE.TorusGeometry(0.72 + spec.hullW * 0.07, 0.12, 8, 24),
        new THREE.MeshStandardMaterial({ color: 0x8d96a2, roughness: 0.6, metalness: 0.4 })
    );
    nozzle.rotation.x = Math.PI / 2;
    nozzle.scale.y = 0.72;
    nozzle.position.set(0, 0.05, spec.hullL * 0.61);
    nozzle.userData.baseColor = 0x8d96a2;
    modelRoot.add(nozzle);

    const exhaustOuter = new THREE.Mesh(
        new THREE.ConeGeometry(0.6 + spec.hullW * 0.05, 2.5 + spec.hullL * 0.16, 18, 1, true),
        new THREE.MeshBasicMaterial({
            color: 0x67cfff,
            transparent: true,
            opacity: 0.46,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    exhaustOuter.rotation.x = Math.PI / 2;
    exhaustOuter.position.set(0, 0.05, spec.hullL * 0.82);
    exhaustOuter.userData.skipShipTint = true;
    modelRoot.add(exhaustOuter);

    const exhaustInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.28 + spec.hullW * 0.02, 1.8 + spec.hullL * 0.12, 16, 1, true),
        new THREE.MeshBasicMaterial({
            color: 0xe8f7ff,
            transparent: true,
            opacity: 0.78,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            side: THREE.DoubleSide
        })
    );
    exhaustInner.rotation.x = Math.PI / 2;
    exhaustInner.position.set(0, 0.05, spec.hullL * 0.77);
    exhaustInner.userData.skipShipTint = true;
    modelRoot.add(exhaustInner);

    const exhaustGlow = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 12, 10),
        new THREE.MeshBasicMaterial({
            color: 0xcdf0ff,
            transparent: true,
            opacity: 0.72,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        })
    );
    exhaustGlow.scale.set(1.0, 0.64, 1.5);
    exhaustGlow.position.set(0, 0.05, spec.hullL * 0.66);
    exhaustGlow.userData.skipShipTint = true;
    modelRoot.add(exhaustGlow);

    const exhaustLight = new THREE.PointLight(0x8ad8ff, 0.8, 85, 1.9);
    exhaustLight.position.set(0, 0.05, spec.hullL * 0.75);
    modelRoot.add(exhaustLight);

    function updateExhaust(time, thrusting) {
        const pulse = 0.8 + 0.2 * Math.sin(time * 35);
        const power = thrusting ? (1.15 + 0.35 * pulse) : (0.5 + 0.1 * pulse);
        exhaustOuter.scale.set(1, 1, power);
        exhaustInner.scale.set(1, 1, 0.9 * power);
        exhaustGlow.scale.set(1.0 + 0.18 * pulse, 0.64, 1.2 + 0.52 * power);
        exhaustOuter.material.opacity = thrusting ? 0.58 : 0.26;
        exhaustInner.material.opacity = thrusting ? 0.9 : 0.46;
        exhaustGlow.material.opacity = thrusting ? 0.86 : 0.42;
        exhaustLight.intensity = thrusting ? 1.9 + 0.55 * pulse : 0.7 + 0.18 * pulse;
    }

    return { modelRoot, updateExhaust };
}

function buildEscapePodModel() {
    const pod = new THREE.Group();
    const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.42, 1.1, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0xd9dee6, roughness: 0.72, metalness: 0.2 })
    );
    body.rotation.x = Math.PI / 2;
    body.userData.baseColor = 0xd9dee6;
    pod.add(body);
    const canopy = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 10, 8),
        new THREE.MeshStandardMaterial({ color: 0x7fbce0, roughness: 0.2, metalness: 0.35, transparent: true, opacity: 0.92 })
    );
    canopy.scale.set(1.0, 0.7, 1.3);
    canopy.position.set(0, 0.17, -0.15);
    canopy.userData.baseColor = 0x7fbce0;
    pod.add(canopy);
    const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.05, 8, 20),
        new THREE.MeshStandardMaterial({ color: 0x4ad7ff, roughness: 0.3, metalness: 0.4 })
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.set(0, 0, 0.55);
    ring.userData.baseColor = 0x4ad7ff;
    pod.add(ring);
    return pod;
}

function applyShipSpec(spec) {
    if (shipGroup.userData.modelRoot) shipGroup.remove(shipGroup.userData.modelRoot);
    const built = buildShipModel(spec);
    shipGroup.add(built.modelRoot);
    shipGroup.userData.modelRoot = built.modelRoot;
    updateFusionExhaust = (time) => {
        const thrusting = !docked && keys.accel && fuel > 0;
        built.updateExhaust(time, thrusting);
    };
    currentShipSpec = spec;
    escapePodMode = false;
    shipDestroyed = false;
    initializeShipSystemsForSpec(spec, true);
    if (shipPerfReady) {
        accelerationRate = spec.accel;
        maxSpeed = spec.speed;
    }
}

const starterShipSpec = {
    ...createShipSpecByTier('starter', 'small', 'Rust Finch'),
    price: 0,
    hullW: 2.0,
    hullH: 0.85,
    hullL: 4.3,
    noseR: 0.76,
    noseL: 1.75,
    podLen: 1.35,
    podOffset: 1.12,
    rearBlockW: 1.05,
    rearBlockH: 0.48,
    rearBlockL: 0.62,
    cargoCapacity: 50,
    laserCount: 1,
    laserReload: 0.48,
    accel: 6.5,
    speed: 220
};
const shipMarketOffers = [
    createShipSpecByTier('model-1', 'medium'),
    createShipSpecByTier('model-2', 'large'),
    createShipSpecByTier('model-3', 'very_large')
];
const shipCatalog = new Map([starterShipSpec, ...shipMarketOffers].map((s) => [s.id, s]));
ownedShipIds.add(starterShipSpec.id);
activeOwnedShipId = starterShipSpec.id;
applyShipSpec(starterShipSpec);

const stationFrameMat = new THREE.LineBasicMaterial({ color: 0x101010 });
const tubeMat = new THREE.MeshBasicMaterial({ color: 0x6d7684 });
const trussMat = new THREE.MeshBasicMaterial({ color: 0x8a94a6, wireframe: true });
const hubMat = new THREE.MeshBasicMaterial({ color: 0xa0a7b5 });

function createStationAt(worldPosition, label, variant = {}) {
    const scale = variant.scale || 1.0;
    const armCount = variant.armCount || 4;
    const moduleTone = variant.moduleTone || 0;
    const panelColor = variant.panelColor || 0x32566c;
    const dockRingColor = variant.dockRingColor || 0xffff00;
    const baseSpine = variant.spineHeights || [-24, -8, 10, 24];
    const station = new THREE.Group();
    const stationSolidMeshes = [];
    const stationTurrets = [];

    function addModule(position, size, rotationY = 0) {
        const g = Math.max(80, Math.min(220, Math.floor(110 + moduleTone + Math.random() * 110)));
        const gray = (g << 16) | (g << 8) | g;
        const geo = new THREE.BoxGeometry(size.x, size.y, size.z);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: gray }));
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), stationFrameMat);
        mesh.add(edges);
        mesh.position.copy(position);
        mesh.rotation.y = rotationY;
        station.add(mesh);
        stationSolidMeshes.push(mesh);
        return mesh;
    }

    function addTubeBetween(a, b, radius = 1.4) {
        const delta = new THREE.Vector3().subVectors(b, a);
        const length = delta.length();
        if (length < 0.001) return;
        const tubeGeo = new THREE.CylinderGeometry(radius, radius, length, 10, 1, true);
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.copy(a).addScaledVector(delta, 0.5);
        tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(tubeGeo), stationFrameMat);
        tube.add(edges);
        station.add(tube);
        stationSolidMeshes.push(tube);
    }

    const hubRadiusA = 10 + Math.random() * 4;
    const hubRadiusB = 12 + Math.random() * 5;
    const hubHeight = 22 + Math.random() * 12;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(hubRadiusA, hubRadiusB, hubHeight, 14), hubMat);
    station.add(hub);
    stationSolidMeshes.push(hub);
    hub.add(new THREE.LineSegments(new THREE.EdgesGeometry(hub.geometry), stationFrameMat));

    const trussRadius = 20 + Math.random() * 12;
    const truss = new THREE.Mesh(new THREE.TorusGeometry(trussRadius, 0.8, 8, 48), trussMat);
    truss.rotation.x = Math.PI / 2;
    station.add(truss);

    const spineHeights = baseSpine;
    let prevSpinePos = null;
    for (const y of spineHeights) {
        const spine = addModule(
            new THREE.Vector3(0, y, 0),
            new THREE.Vector3(14 + Math.random() * 4, 6 + Math.random() * 2, 14 + Math.random() * 4)
        );
        if (prevSpinePos) addTubeBetween(prevSpinePos, spine.position, 1.5);
        prevSpinePos = spine.position.clone();
    }

    const armAngles = [];
    for (let i = 0; i < armCount; i++) armAngles.push((i / armCount) * Math.PI * 2);
    for (const angle of armAngles) {
        const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
        const innerR = trussRadius + 6 + Math.random() * 8;
        const outerR = innerR + 16 + Math.random() * 14;
        const innerPos = dir.clone().multiplyScalar(innerR).setY(3 + Math.random() * 3);
        const outerPos = dir.clone().multiplyScalar(outerR).setY(5 + Math.random() * 3);
        const inner = addModule(innerPos, new THREE.Vector3(13 + Math.random() * 6, 7 + Math.random() * 3, 18 + Math.random() * 8), angle);
        const outer = addModule(outerPos, new THREE.Vector3(10 + Math.random() * 5, 6 + Math.random() * 2, 14 + Math.random() * 6), angle);
        addTubeBetween(new THREE.Vector3(0, 4, 0), inner.position, 1.2);
        addTubeBetween(inner.position, outer.position, 1.1);

        // defense turret per arm, with +/- 90deg traverse around arm heading
        const turretPivot = new THREE.Group();
        const turretLocalPos = outer.position.clone().add(new THREE.Vector3(0, 4.1, 0));
        turretPivot.position.copy(turretLocalPos);
        station.add(turretPivot);
        const turretBase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.75, 0.95, 1.0, 10),
            new THREE.MeshBasicMaterial({ color: 0x8f96a3 })
        );
        turretBase.add(new THREE.LineSegments(new THREE.EdgesGeometry(turretBase.geometry), stationFrameMat));
        turretPivot.add(turretBase);
        const turretHead = new THREE.Mesh(
            new THREE.BoxGeometry(1.3, 0.7, 1.6),
            new THREE.MeshBasicMaterial({ color: 0xa9b2bf })
        );
        turretHead.position.set(0, 0.5, 0);
        turretBase.add(turretHead);
        const turretBarrel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.12, 1.8, 8),
            new THREE.MeshBasicMaterial({ color: 0xd6dde8 })
        );
        turretBarrel.rotation.x = Math.PI / 2;
        turretBarrel.position.set(0, 0.5, -1.1);
        turretHead.add(turretBarrel);
        stationTurrets.push({
            pivot: turretPivot,
            baseYaw: angle,
            yaw: angle,
            cooldown: 0.35 + Math.random() * 0.25,
            shotTimer: Math.random() * 0.5
        });
    }

    for (const z of [-34, 34]) {
        const fin = addModule(new THREE.Vector3(0, -4, z), new THREE.Vector3(10, 6, 14));
        addTubeBetween(new THREE.Vector3(0, -2, 0), fin.position, 1.0);
    }
    for (const x of [-30, 30]) {
        const panelGeo = new THREE.BoxGeometry(26, 0.8, 9);
        const panel = new THREE.Mesh(panelGeo, new THREE.MeshBasicMaterial({ color: panelColor }));
        panel.position.set(x, -2, 0);
        panel.rotation.y = Math.PI / 2;
        panel.add(new THREE.LineSegments(new THREE.EdgesGeometry(panelGeo), stationFrameMat));
        station.add(panel);
        stationSolidMeshes.push(panel);
        addTubeBetween(new THREE.Vector3(0, -2, 0), panel.position, 0.7);
    }

    const maxSpineY = Math.max(...spineHeights);
    const dockHeight = maxSpineY + 18 + Math.random() * 8;
    const dockLocalPoint = new THREE.Vector3(0, dockHeight, 0);
    const dockRingGeom = new THREE.TorusGeometry(10, 0.35, 8, 64);
    const dockRingMat = new THREE.MeshBasicMaterial({ color: dockRingColor, wireframe: true });
    const dockRing = new THREE.Mesh(dockRingGeom, dockRingMat);
    dockRing.rotation.x = Math.PI / 2;
    dockRing.position.copy(dockLocalPoint);
    station.add(dockRing);

    const dockSupportCount = 6;
    const dockSupportInnerRadius = 2.8;
    const dockSupportOuterRadius = 10;
    const dockSupportY = maxSpineY + 6;
    // ensure ring support struts are physically connected to the station spine
    addTubeBetween(new THREE.Vector3(0, maxSpineY, 0), new THREE.Vector3(0, dockSupportY, 0), 1.0);
    for (let i = 0; i < dockSupportCount; i++) {
        const angle = (i / dockSupportCount) * Math.PI * 2;
        const inner = new THREE.Vector3(
            Math.cos(angle) * dockSupportInnerRadius,
            dockSupportY,
            Math.sin(angle) * dockSupportInnerRadius
        );
        const outer = new THREE.Vector3(
            Math.cos(angle) * dockSupportOuterRadius,
            dockLocalPoint.y,
            Math.sin(angle) * dockSupportOuterRadius
        );
        addTubeBetween(inner, outer, 0.7);
    }

    station.scale.setScalar(scale);
    station.position.copy(worldPosition);
    station.userData.label = label;
    station.userData.bodyName = label;
    scene.add(station);
    return {
        group: station,
        dockLocalPoint,
        dockRadius: 10 * scale,
        solidMeshes: stationSolidMeshes,
        colliders: [],
        collisionScale: 1.0,
        turrets: stationTurrets,
        hostileTimer: 0,
        warnedApproach: false,
        rotationSpeed: 0.002 + Math.random() * 0.002
    };
}

function createAsteroidEmbeddedStation(asteroidGroup, label, awayDir, variant = {}) {
    const scale = variant.scale || 0.5;
    const dockRingColor = variant.dockRingColor || 0xff8c2d;
    const up = awayDir.clone().normalize();
    const surfaceExtent = variant.surfaceExtent || variant.asteroidRadius || 90;
    const embedDepth = variant.embedDepth ?? 6;
    const station = new THREE.Group();
    const stationSolidMeshes = [];
    const stationTurrets = [];

    function addSphereModule(position, radius, color = 0x8f949f) {
        const geo = new THREE.SphereGeometry(radius, 14, 12);
        const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color }));
        mesh.position.copy(position);
        mesh.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo), stationFrameMat));
        station.add(mesh);
        stationSolidMeshes.push(mesh);
        return mesh;
    }

    function addTubeBetween(a, b, radius = 0.9) {
        const delta = new THREE.Vector3().subVectors(b, a);
        const length = delta.length();
        if (length < 0.001) return;
        const tubeGeo = new THREE.CylinderGeometry(radius, radius, length, 10, 1, true);
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.position.copy(a).addScaledVector(delta, 0.5);
        tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.clone().normalize());
        tube.add(new THREE.LineSegments(new THREE.EdgesGeometry(tubeGeo), stationFrameMat));
        station.add(tube);
        stationSolidMeshes.push(tube);
    }

    const core = addSphereModule(new THREE.Vector3(0, 0, 0), 11 + Math.random() * 2, 0x9aa3b0);
    const ringR = 24 + Math.random() * 8;
    const ringCount = 6;
    for (let i = 0; i < ringCount; i++) {
        const a = (i / ringCount) * Math.PI * 2;
        const p = new THREE.Vector3(Math.cos(a) * ringR, -2 + Math.random() * 4, Math.sin(a) * ringR);
        const s = addSphereModule(p, 4.8 + Math.random() * 2.2, 0x7f8795);
        addTubeBetween(core.position, s.position, 0.95);
    }

    const armCount = 3;
    for (let i = 0; i < armCount; i++) {
        const a = (i / armCount) * Math.PI * 2;
        const inner = new THREE.Vector3(Math.cos(a) * (ringR + 12), 2.5, Math.sin(a) * (ringR + 12));
        const outer = new THREE.Vector3(Math.cos(a) * (ringR + 24), 4, Math.sin(a) * (ringR + 24));
        addSphereModule(inner, 4.2 + Math.random() * 1.6, 0x858d9a);
        addSphereModule(outer, 5.4 + Math.random() * 2.0, 0x7b8492);
        addTubeBetween(core.position, inner, 0.85);
        addTubeBetween(inner, outer, 0.75);

        const turretPivot = new THREE.Group();
        turretPivot.position.copy(outer.clone().add(new THREE.Vector3(0, 3.1, 0)));
        station.add(turretPivot);
        const turretBase = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.95, 1.0, 10), new THREE.MeshBasicMaterial({ color: 0x8c94a2 }));
        const turretHead = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.65, 1.55), new THREE.MeshBasicMaterial({ color: 0xa6b0be }));
        turretHead.position.set(0, 0.48, 0);
        const turretBarrel = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1.7, 8), new THREE.MeshBasicMaterial({ color: 0xd6dde8 }));
        turretBarrel.rotation.x = Math.PI / 2;
        turretBarrel.position.set(0, 0.48, -1.05);
        turretBase.add(turretHead);
        turretHead.add(turretBarrel);
        turretPivot.add(turretBase);
        stationTurrets.push({
            pivot: turretPivot,
            baseYaw: a,
            yaw: a,
            cooldown: 0.42 + Math.random() * 0.22,
            shotTimer: Math.random() * 0.5
        });
    }

    const basePlateY = -12;
    const basePlateGeo = new THREE.CylinderGeometry(13.8, 16.5, 2.2, 18);
    const basePlate = new THREE.Mesh(basePlateGeo, new THREE.MeshBasicMaterial({ color: 0x7f8896 }));
    basePlate.position.set(0, basePlateY, 0);
    basePlate.add(new THREE.LineSegments(new THREE.EdgesGeometry(basePlateGeo), stationFrameMat));
    station.add(basePlate);
    stationSolidMeshes.push(basePlate);

    const dockHeight = variant.dockHeight || 36;
    const dockLocalPoint = new THREE.Vector3(0, dockHeight, 0);
    const dockRingGeom = new THREE.TorusGeometry(10, 0.35, 8, 64);
    const dockRingMat = new THREE.MeshBasicMaterial({ color: dockRingColor, wireframe: true });
    const dockRing = new THREE.Mesh(dockRingGeom, dockRingMat);
    dockRing.rotation.x = Math.PI / 2;
    dockRing.position.copy(dockLocalPoint);
    station.add(dockRing);
    addTubeBetween(new THREE.Vector3(0, 10, 0), new THREE.Vector3(0, 20, 0), 0.9);
    const dockSupportCount = 6;
    for (let i = 0; i < dockSupportCount; i++) {
        const a = (i / dockSupportCount) * Math.PI * 2;
        const inner = new THREE.Vector3(Math.cos(a) * 2.8, 20, Math.sin(a) * 2.8);
        const outer = new THREE.Vector3(Math.cos(a) * 10, dockLocalPoint.y, Math.sin(a) * 10);
        addTubeBetween(inner, outer, 0.68);
    }

    station.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    // ensure docking axis (+Y local) points away from asteroid center
    const dockAxisWorld = new THREE.Vector3(0, 1, 0).applyQuaternion(station.quaternion);
    if (dockAxisWorld.dot(up) < 0) {
        station.rotateX(Math.PI);
    }
    // place base plate directly on the asteroid surface contact point
    const mountPointLocal = variant.surfacePointLocal
        ? variant.surfacePointLocal.clone()
        : up.clone().multiplyScalar(surfaceExtent);
    const basePlateOffset = new THREE.Vector3(0, basePlateY * scale, 0).applyQuaternion(station.quaternion);
    station.position.copy(mountPointLocal).sub(basePlateOffset).addScaledVector(up, embedDepth);
    station.scale.setScalar(scale);
    station.userData.label = label;
    station.userData.bodyName = `${label} (Asteroid Hideout)`;
    asteroidGroup.add(station);

    return {
        group: station,
        dockLocalPoint,
        dockRadius: 10 * scale,
        solidMeshes: stationSolidMeshes,
        colliders: [],
        collisionScale: 0.08,
        turrets: stationTurrets,
        hostileTimer: 0,
        warnedApproach: false,
        rotationSpeed: 0,
        isHiddenStation: true
    };
}

function estimateAsteroidRadius(asteroidGroup) {
    const center = asteroidGroup.position.clone();
    let maxR = 70;
    asteroidGroup.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry) return;
        if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
        const bs = obj.geometry.boundingSphere;
        const worldCenter = obj.getWorldPosition(new THREE.Vector3());
        const worldScale = obj.getWorldScale(new THREE.Vector3());
        const r = bs.radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
        const d = worldCenter.distanceTo(center) + r;
        if (d > maxR) maxR = d;
    });
    return maxR;
}

function estimateAsteroidSurfaceInDirection(asteroidGroup, direction) {
    const dir = direction.clone().normalize();
    const center = asteroidGroup.position.clone();
    let extent = 60;
    asteroidGroup.traverse((obj) => {
        if (!obj.isMesh || !obj.geometry) return;
        if (!obj.geometry.boundingSphere) obj.geometry.computeBoundingSphere();
        const bs = obj.geometry.boundingSphere;
        const worldCenter = obj.getWorldPosition(new THREE.Vector3());
        const worldScale = obj.getWorldScale(new THREE.Vector3());
        const r = bs.radius * Math.max(worldScale.x, worldScale.y, worldScale.z);
        const rel = worldCenter.sub(center);
        const projection = rel.dot(dir) + r;
        if (projection > extent) extent = projection;
    });
    return extent;
}

function findAsteroidSurfacePoint(asteroidGroup, direction, fallbackExtent = 80) {
    const dir = direction.clone().normalize();
    const origin = asteroidGroup.getWorldPosition(new THREE.Vector3());
    const meshes = [];
    asteroidGroup.traverse((obj) => {
        if (obj.isMesh) meshes.push(obj);
    });
    const ray = new THREE.Raycaster(origin, dir, 0, fallbackExtent * 2.5);
    const hits = ray.intersectObjects(meshes, true);
    if (hits.length > 0) {
        return asteroidGroup.worldToLocal(hits[0].point.clone());
    }
    return dir.multiplyScalar(fallbackExtent);
}

const { texture: sunHeatTexture, update: updateSunHeatTexture } = createSunHeatmapTexture();
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(50, 56, 56),
    new THREE.MeshStandardMaterial({
        map: sunHeatTexture,
        emissive: 0xff9a1f,
        emissiveMap: sunHeatTexture,
        emissiveIntensity: 6.4,
        roughness: 1.0,
        metalness: 0.0
    })
);
sun.position.set(0,0,-500);
scene.add(sun);
const ambientLight = new THREE.AmbientLight(0x7a95b6, 0.5);
scene.add(ambientLight);
const hemiLight = new THREE.HemisphereLight(0xa4bfff, 0x1a1f2a, 0.46);
scene.add(hemiLight);
const sunLight = new THREE.PointLight(0xffc16d, 6.8, 4600, 1.55);
sunLight.position.copy(sun.position);
scene.add(sunLight);

const planets = [];
const planetWeatherLayers = [];
const systemStations = [];
const targetBodies = [];
const planetNames = ['Thalassa', 'Cinder-9', 'Verdan Reach', 'Nyx Aurora', 'Morrow Delta', 'Ionia Belt'];
const stationNames = ['Port Kestrel', 'Haven Array', 'Spindle Dock', 'Rook Exchange', 'Midas Relay', 'Argent Pier'];
const planetPalettes = [
    { bgTop: '#0b1f4d', bgMid: '#0f3a72', bgBottom: '#082243', waveHueMin: 180, waveHueSpan: 35, cloud: 'rgba(160, 230, 255, 0.24)' },
    { bgTop: '#3b2e12', bgMid: '#5f4a1e', bgBottom: '#2a1f0b', waveHueMin: 28, waveHueSpan: 20, cloud: 'rgba(255, 224, 170, 0.20)' },
    { bgTop: '#1b3d1f', bgMid: '#2f5e31', bgBottom: '#0f2612', waveHueMin: 95, waveHueSpan: 30, cloud: 'rgba(194, 255, 194, 0.20)' },
    { bgTop: '#3d1c44', bgMid: '#5a2f6d', bgBottom: '#25102c', waveHueMin: 265, waveHueSpan: 25, cloud: 'rgba(234, 210, 255, 0.18)' },
    { bgTop: '#3c2f2a', bgMid: '#645244', bgBottom: '#2a201c', waveHueMin: 12, waveHueSpan: 20, cloud: 'rgba(245, 219, 198, 0.17)' }
];
const planetConfigs = [
    { radius: 38, orbit: 320, angle: 0.2, y: -15 },
    { radius: 52, orbit: 560, angle: 1.35, y: 18 },
    { radius: 34, orbit: 820, angle: 2.25, y: -8 },
    { radius: 64, orbit: 1080, angle: 3.5, y: 24 },
    { radius: 46, orbit: 1360, angle: 4.65, y: -20 }
];

const tradeGoods = [
    { id: 'ore', name: 'Ore', base: 42 },
    { id: 'tech', name: 'Tech', base: 120 },
    { id: 'meds', name: 'Meds', base: 78 }
];
const illegalGoods = [
    { id: 'spice', name: 'Spice', base: 220 },
    { id: 'contraband', name: 'Contraband', base: 360 },
    { id: 'relics', name: 'Relics', base: 540 }
];
const allGoods = [...tradeGoods, ...illegalGoods];

function createStationMarket(idx) {
    const profiles = [
        { ore: 0.62, tech: 1.5, meds: 0.9 },
        { ore: 1.45, tech: 0.7, meds: 1.25 },
        { ore: 0.82, tech: 1.3, meds: 0.65 },
        { ore: 1.22, tech: 0.78, meds: 1.4 },
        { ore: 0.7, tech: 1.05, meds: 1.45 }
    ];
    const p = profiles[idx % profiles.length];
    const market = {};
    for (const g of tradeGoods) {
        const buy = Math.round(g.base * p[g.id]);
        const sell = Math.max(1, Math.round(buy * 0.8));
        market[g.id] = { buy, sell };
    }
    return market;
}

function createBlackMarket(idx) {
    const profiles = [
        { spice: 0.65, contraband: 0.78, relics: 0.92 },
        { spice: 0.72, contraband: 0.68, relics: 1.06 },
        { spice: 0.58, contraband: 0.86, relics: 0.88 }
    ];
    const p = profiles[idx % profiles.length];
    const market = {};
    for (const g of illegalGoods) {
        const buy = Math.round(g.base * p[g.id]);
        const sell = Math.max(1, Math.round(buy * (1.12 + Math.random() * 0.12)));
        market[g.id] = { buy, sell };
    }
    return market;
}

planetConfigs.forEach((cfg, idx) => {
    const px = sun.position.x + Math.cos(cfg.angle) * cfg.orbit;
    const pz = sun.position.z + Math.sin(cfg.angle) * cfg.orbit;
    const surfaceTex = createWavePlanetTexture(1024, planetPalettes[idx % planetPalettes.length]);
    const planet = new THREE.Mesh(
        new THREE.SphereGeometry(cfg.radius, 48, 48),
        new THREE.MeshStandardMaterial({
            map: surfaceTex,
            roughness: 0.88,
            metalness: 0.03,
            emissive: 0x22334a,
            emissiveIntensity: 0.32
        })
    );
    planet.position.set(px, cfg.y, pz);
    planet.userData.radius = cfg.radius;
    planet.userData.bodyName = planetNames[idx] || `World-${idx + 1}`;
    planets.push(planet);
    scene.add(planet);
    targetBodies.push(planet);

    const weatherLayer = new THREE.Mesh(
        new THREE.SphereGeometry(cfg.radius * 1.018, 40, 40),
        new THREE.MeshStandardMaterial({
            map: createPlanetWeatherTexture(1024),
            transparent: true,
            opacity: 0.55,
            depthWrite: false,
            roughness: 1.0,
            metalness: 0.0
        })
    );
    planet.add(weatherLayer);
    planetWeatherLayers.push({
        planet,
        layer: weatherLayer,
        spin: 0.02 + Math.random() * 0.045,
        weatherSpin: 0.05 + Math.random() * 0.08
    });

    const stationOffsetDir = new THREE.Vector3(Math.cos(cfg.angle + 1.1), 0.15, Math.sin(cfg.angle + 1.1)).normalize();
    const stationPos = planet.position.clone().addScaledVector(stationOffsetDir, cfg.radius + 150 + idx * 20);
    const stationData = createStationAt(stationPos, stationNames[idx] || `Station ${idx + 1}`, {
        scale: 0.55 + Math.random() * 0.35,
        armCount: 3 + ((idx + Math.floor(Math.random() * 3)) % 4),
        moduleTone: -20 + Math.floor(Math.random() * 60),
        panelColor: [0x32566c, 0x684f24, 0x3f6a3f, 0x5d3d7c, 0x6b4a3d][idx % 5],
        dockRingColor: [0xffff00, 0xffd966, 0xa8ff8f, 0x8fd3ff, 0xffb38f][idx % 5],
        spineHeights: [
            -26 - Math.random() * 8,
            -9 - Math.random() * 4,
            8 + Math.random() * 5,
            22 + Math.random() * 8
        ]
    });
    stationData.market = createStationMarket(idx);
    stationData.blackMarket = null;
    systemStations.push(stationData);
    targetBodies.push(stationData.group);
});

const asteroidOrbiters = [];
const asteroidHazards = [];
const asteroidFieldGroup = new THREE.Group();
scene.add(asteroidFieldGroup);
const beltBaseOrbit = 2850;
for (let i = 0; i < 260; i++) {
    const orbit = beltBaseOrbit + (Math.random() - 0.5) * 520;
    const angle = Math.random() * Math.PI * 2;
    const y = -70 + Math.random() * 140;
    const speed = (0.0035 + Math.random() * 0.0065) * (Math.random() > 0.5 ? 1 : -1);
    const size = 6 + Math.random() * 18;
    const geo = new THREE.BoxGeometry(size, size * (0.6 + Math.random() * 0.8), size * (0.7 + Math.random() * 1.0));
    const tone = 96 + Math.floor(Math.random() * 76);
    const col = (tone << 16) | ((tone - 8) << 8) | (tone - 14);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: col, roughness: 1, metalness: 0.05 }));
    mesh.rotation.set(Math.random() * 2, Math.random() * 2, Math.random() * 2);
    asteroidFieldGroup.add(mesh);
    asteroidHazards.push({ object: mesh, radius: size * 0.55 });
    asteroidOrbiters.push({
        object: mesh,
        orbit,
        angle,
        y,
        speed,
        spin: new THREE.Vector3((Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16, (Math.random() - 0.5) * 0.16)
    });
}

const hiddenStationNames = ['Smuggler Hollow', 'Dark Quarry', 'Cinder Den'];
for (let i = 0; i < hiddenStationNames.length; i++) {
    const orbit = beltBaseOrbit + 160 + i * 180 + Math.random() * 80;
    const angle = Math.random() * Math.PI * 2;
    const y = -45 + Math.random() * 90;
    const speed = 0.003 + Math.random() * 0.003;
    const sx = sun.position.x + Math.cos(angle) * orbit;
    const sz = sun.position.z + Math.sin(angle) * orbit;
    const hideoutRock = new THREE.Group();
    const hideoutRockBlocks = [];
    const mountDir = new THREE.Vector3(Math.cos(angle), 0.08 + Math.random() * 0.12, Math.sin(angle)).normalize();
    const mountQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), mountDir);
    const rightDir = new THREE.Vector3(1, 0, 0).applyQuaternion(mountQuat);
    const upDir = new THREE.Vector3(0, 1, 0).applyQuaternion(mountQuat);
    const backDir = mountDir.clone().negate();

    // primary mount block: base attaches to this forward face
    const mainW = 72 + Math.random() * 24;
    const mainH = 58 + Math.random() * 20;
    const mainD = 58 + Math.random() * 22;
    const mainGeo = new THREE.BoxGeometry(mainW, mainH, mainD);
    const mainTone = 92 + Math.floor(Math.random() * 56);
    const mainColor = (mainTone << 16) | ((mainTone - 6) << 8) | (mainTone - 10);
    const mainBlock = new THREE.Mesh(mainGeo, new THREE.MeshStandardMaterial({ color: mainColor, roughness: 0.98, metalness: 0.02 }));
    mainBlock.quaternion.copy(mountQuat);
    // center shifted backward so front face sits at local origin (mount point)
    mainBlock.position.copy(mountDir.clone().multiplyScalar(-mainD * 0.5));
    hideoutRock.add(mainBlock);
    hideoutRockBlocks.push(mainBlock);

    // only side/rear growth blocks, never in front of mount face
    const extraBlocks = 2 + Math.floor(Math.random() * 2);
    for (let n = 0; n < extraBlocks; n++) {
        const s = 22 + Math.random() * 22;
        const g = new THREE.BoxGeometry(s * (0.9 + Math.random() * 0.4), s * (0.7 + Math.random() * 0.35), s * (0.9 + Math.random() * 0.45));
        const tone = 86 + Math.floor(Math.random() * 62);
        const c = (tone << 16) | ((tone - 6) << 8) | (tone - 10);
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: c, roughness: 0.98, metalness: 0.02 }));
        const side = (Math.random() > 0.5 ? 1 : -1);
        const sideOffset = rightDir.clone().multiplyScalar(side * (mainW * 0.4 + s * 0.35));
        const rearOffset = backDir.clone().multiplyScalar(mainD * (0.28 + Math.random() * 0.45) + s * 0.25);
        const verticalOffset = upDir.clone().multiplyScalar((Math.random() - 0.5) * (mainH * 0.3));
        m.position.copy(sideOffset).add(rearOffset).add(verticalOffset);
        m.rotation.set(Math.random() * 0.9, Math.random() * 0.9, Math.random() * 0.9);
        hideoutRock.add(m);
        hideoutRockBlocks.push(m);
    }
    hideoutRock.position.set(sx, y, sz);
    hideoutRock.userData.bodyName = `${hiddenStationNames[i]} Asteroid`;
    scene.add(hideoutRock);

    // explicit mount face point: front face center of the primary block
    const surfacePointLocal = new THREE.Vector3(0, 0, 0);
    const surfaceExtent = mainD * 0.5;
    const asteroidRadius = estimateAsteroidRadius(hideoutRock);
    targetBodies.push(hideoutRock);
    const stationData = createAsteroidEmbeddedStation(hideoutRock, hiddenStationNames[i], mountDir, {
        scale: 0.42 + Math.random() * 0.14,
        dockRingColor: 0xff8c2d,
        asteroidRadius,
        surfaceExtent,
        surfacePointLocal,
        embedDepth: 0.0,
        dockHeight: 34
    });
    for (const block of hideoutRockBlocks) {
        if (!block.geometry.boundingSphere) block.geometry.computeBoundingSphere();
        const bs = block.geometry.boundingSphere;
        const blockScale = block.getWorldScale(new THREE.Vector3());
        const blockRadius = bs.radius * Math.max(blockScale.x, blockScale.y, blockScale.z) * 0.78;
        asteroidHazards.push({
            object: block,
            radius: blockRadius,
            isHideoutRockBlock: true,
            linkedStation: stationData
        });
    }
    stationData.market = createStationMarket(i + 10);
    stationData.blackMarket = createBlackMarket(i);
    systemStations.push(stationData);
    targetBodies.push(stationData.group);

    asteroidOrbiters.push({
        object: hideoutRock,
        orbit,
        angle,
        y,
        speed,
        spin: null
    });
}

// distant starfield
function createStarField(count, radius) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
        const phi = Math.acos(2 * Math.random() - 1);
        const theta = 2 * Math.PI * Math.random();
        const r = radius;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.sin(phi) * Math.sin(theta);
        const z = r * Math.cos(phi);
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xffffff, size: 4, sizeAttenuation: false });
    const points = new THREE.Points(geometry, mat);
    return points;
}

const stars = createStarField(3000, 4200);
scene.add(stars);

// objects that appear on radar
const radarObjects = [...planets, ...systemStations.map((s) => s.group), sun];
sun.userData.bodyName = 'Helios Crown';
targetBodies.push(sun);

// player state is initialized near top-level ship globals

function getCargoCapacity() {
    return currentShipSpec?.cargoCapacity || 40;
}

function initializeShipSystemsForSpec(spec, fullReset = false) {
    const tier = spec?.tier || 'small';
    const profile = {
        small: { shield: 85, regen: 8.5, delay: 2.4, core: 85 },
        medium: { shield: 120, regen: 9.2, delay: 2.3, core: 100 },
        large: { shield: 170, regen: 10.0, delay: 2.1, core: 125 },
        very_large: { shield: 235, regen: 11.0, delay: 1.9, core: 155 }
    }[tier] || { shield: 100, regen: 9.0, delay: 2.3, core: 100 };
    shieldMax = profile.shield;
    shieldRegenRate = profile.regen;
    shieldRegenDelay = profile.delay;
    if (fullReset) {
        shield = shieldMax;
        hull = 100;
        coreIntegrity = profile.core;
        weaponsIntegrity = 100;
    } else {
        shield = Math.min(shield, shieldMax);
    }
    shieldRegenTimer = 0;
    weaponsOfflineTimer = 0;
}

// docked station screen
const stationScreen = document.createElement('div');
stationScreen.style.position = 'fixed';
stationScreen.style.inset = '0';
stationScreen.style.display = 'none';
stationScreen.style.background = 'rgba(0,0,0,0.78)';
stationScreen.style.zIndex = '25';
stationScreen.style.fontFamily = 'monospace';
stationScreen.style.color = '#9efca6';
stationScreen.innerHTML = `
<div style="max-width:1080px;margin:40px auto;border:1px solid #2ee35f;background:rgba(0,12,0,0.9);padding:18px;line-height:1.45;">
  <div style="font-size:22px;margin-bottom:10px;">STATION DOCK CONTROL</div>
  <div style="display:grid;grid-template-columns:1.7fr 1fr;gap:16px;align-items:start;">
    <div>
      <div id="stationDockInfo"></div>
      <div id="stationMarket" style="margin-top:12px;border-top:1px solid rgba(46,227,95,0.4);padding-top:10px;"></div>
      <div id="stationShipyard" style="margin-top:12px;border-top:1px solid rgba(46,227,95,0.4);padding-top:10px;"></div>
      <div id="stationConsole" style="margin-top:12px;border-top:1px solid rgba(46,227,95,0.4);padding-top:10px;color:#ffd27a;min-height:24px;"></div>
      <div id="marketLog" style="margin-top:8px;color:#ffd27a;min-height:20px;"></div>
      <div style="margin-top:12px;color:#ffd27a;">Press <b>Q</b> to undock</div>
    </div>
    <div style="border:1px solid rgba(46,227,95,0.45);padding:8px;background:rgba(0,0,0,0.35);">
      <div style="margin-bottom:6px;">Ship Preview</div>
      <canvas id="shipPreviewCanvas" width="320" height="220" style="width:100%;height:220px;display:block;background:rgba(5,8,12,0.9);border:1px solid rgba(140,170,190,0.35);"></canvas>
      <div id="shipPreviewInfo" style="margin-top:8px;color:#bfe4ff;min-height:60px;"></div>
    </div>
  </div>
</div>`;
document.body.appendChild(stationScreen);
const radioOverlay = document.createElement('div');
radioOverlay.style.position = 'fixed';
radioOverlay.style.left = '50%';
radioOverlay.style.top = '50%';
radioOverlay.style.transform = 'translate(-50%, -50%)';
radioOverlay.style.maxWidth = '70vw';
radioOverlay.style.padding = '12px 16px';
radioOverlay.style.border = '1px solid rgba(255, 212, 120, 0.85)';
radioOverlay.style.background = 'rgba(8, 10, 16, 0.72)';
radioOverlay.style.color = '#ffd980';
radioOverlay.style.fontFamily = 'monospace';
radioOverlay.style.fontSize = '30px';
radioOverlay.style.fontWeight = '700';
radioOverlay.style.textAlign = 'center';
radioOverlay.style.letterSpacing = '0.8px';
radioOverlay.style.textShadow = '0 0 8px rgba(255, 180, 80, 0.7)';
radioOverlay.style.zIndex = '20';
radioOverlay.style.pointerEvents = 'none';
radioOverlay.style.display = 'none';
document.body.appendChild(radioOverlay);
const damageOverlay = document.createElement('div');
damageOverlay.style.position = 'fixed';
damageOverlay.style.inset = '0';
damageOverlay.style.background = 'rgba(255, 40, 40, 1)';
damageOverlay.style.opacity = '0';
damageOverlay.style.pointerEvents = 'none';
damageOverlay.style.zIndex = '19';
document.body.appendChild(damageOverlay);
let shipPreviewRenderer = null;
let shipPreviewScene = null;
let shipPreviewCamera = null;
let shipPreviewModel = null;
let shipPreviewSpecId = null;

function getCargoTotal() {
    return Object.values(cargoHold).reduce((sum, v) => sum + v, 0);
}

function setMarketLog(text) {
    const logEl = document.getElementById('marketLog');
    if (logEl) logEl.textContent = text;
}

function setStationConsoleMessage(text) {
    const consoleEl = document.getElementById('stationConsole');
    if (consoleEl) consoleEl.textContent = text;
}

function refreshStationMarketUI() {
    const marketEl = document.getElementById('stationMarket');
    if (!marketEl || !activeDockStation) return;
    const m = activeDockStation.market;
    const rows = tradeGoods.map((g) => {
        const item = m[g.id];
        return `
            <div style="display:grid;grid-template-columns:120px 120px 120px 1fr;gap:8px;align-items:center;margin:4px 0;">
                <div>${g.name}: ${cargoHold[g.id]}</div>
                <div>Buy ${item.buy} cr</div>
                <div>Sell ${item.sell} cr</div>
                <div>
                    <button data-trade="buy" data-market="legal" data-good="${g.id}" style="margin-right:6px;">Buy 5</button>
                    <button data-trade="sell" data-market="legal" data-good="${g.id}">Sell 5</button>
                </div>
            </div>`;
    }).join('');
    let blackRows = '';
    if (activeDockStation.blackMarket) {
        blackRows = illegalGoods.map((g) => {
            const item = activeDockStation.blackMarket[g.id];
            return `
                <div style="display:grid;grid-template-columns:120px 120px 120px 1fr;gap:8px;align-items:center;margin:4px 0;color:#ff9f8d;">
                    <div>${g.name}: ${cargoHold[g.id]}</div>
                    <div>Buy ${item.buy} cr</div>
                    <div>Sell ${item.sell} cr</div>
                    <div>
                        <button data-trade="buy" data-market="black" data-good="${g.id}" style="margin-right:6px;">Buy 5</button>
                        <button data-trade="sell" data-market="black" data-good="${g.id}">Sell 5</button>
                    </div>
                </div>`;
        }).join('');
        blackRows = `<div style="margin:10px 0 4px 0;color:#ff876e;">Black market (illegal)</div>${blackRows}`;
    }
    marketEl.innerHTML = `<div style="margin-bottom:6px;">Market prices</div>${rows}${blackRows}`;
}

function refreshShipyardUI() {
    const shipyardEl = document.getElementById('stationShipyard');
    if (!shipyardEl) return;
    const rows = shipMarketOffers.map((s) => {
        const owned = ownedShipIds.has(s.id);
        const active = activeOwnedShipId === s.id && previewShipId === null;
        const previewing = previewShipId === s.id && !owned;
        return `
            <div style="display:grid;grid-template-columns:170px 120px 130px 1fr;gap:8px;align-items:center;margin:5px 0;">
                <div>${s.name}</div>
                <div>${Math.round(s.speed)} max / ${s.accel.toFixed(1)} acc</div>
                <div>${owned ? (active ? 'Owned (Active)' : 'Owned') : `${s.price} cr`}</div>
                <div>
                    <button data-ship-action="preview" data-ship-id="${s.id}" style="margin-right:6px;">Preview</button>
                    ${
                        owned
                            ? `<button data-ship-action="equip" data-ship-id="${s.id}" ${active ? 'disabled' : ''}>Equip</button>`
                            : `<button data-ship-action="buy" data-ship-id="${s.id}">Buy</button>`
                    }
                    ${previewing ? `<span style="margin-left:8px;color:#9fd7ff;">Previewing</span>` : ''}
                </div>
            </div>
            <div style="margin:-2px 0 6px 0;color:#86c89a;font-size:12px;">
                ${s.tier.replace('_', ' ')} class | Cargo ${s.cargoCapacity} | Lasers ${s.laserCount} x ${(1000 / s.laserReload).toFixed(1)}/s
            </div>
        `;
    }).join('');
    shipyardEl.innerHTML = `<div style="margin-bottom:6px;">Shipyard</div>${rows}`;
}

function ensureShipPreviewRenderer() {
    const canvas = document.getElementById('shipPreviewCanvas');
    if (!canvas) return false;
    if (!shipPreviewRenderer) {
        shipPreviewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
        shipPreviewRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        shipPreviewScene = new THREE.Scene();
        shipPreviewCamera = new THREE.PerspectiveCamera(45, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
        // side profile preview camera
        shipPreviewCamera.position.set(10.8, 1.45, 0);
        shipPreviewCamera.lookAt(0, 0, 0);
        const dir = new THREE.DirectionalLight(0xd5edff, 1.2);
        dir.position.set(5, 3, 1.5);
        shipPreviewScene.add(dir);
        shipPreviewScene.add(new THREE.AmbientLight(0x8aa1b8, 0.55));
    }
    const w = canvas.clientWidth || canvas.width || 320;
    const h = canvas.clientHeight || canvas.height || 220;
    shipPreviewRenderer.setSize(w, h, false);
    shipPreviewCamera.aspect = w / h;
    shipPreviewCamera.updateProjectionMatrix();
    return true;
}

function setShipPreview(spec) {
    if (!spec) return;
    if (!ensureShipPreviewRenderer()) return;
    if (shipPreviewSpecId !== spec.id || !shipPreviewModel) {
        if (shipPreviewModel) shipPreviewScene.remove(shipPreviewModel);
        const built = buildShipModel(spec);
        shipPreviewModel = built.modelRoot;
        shipPreviewModel.position.set(0, -0.15, 0);
        shipPreviewScene.add(shipPreviewModel);
        shipPreviewSpecId = spec.id;
    }
    const info = document.getElementById('shipPreviewInfo');
    if (info) {
        info.innerHTML =
            `${spec.name}<br>` +
            `Speed: ${Math.round(spec.speed)}<br>` +
            `Accel: ${spec.accel.toFixed(1)}<br>` +
            `Cargo: ${spec.cargoCapacity}<br>` +
            `Lasers: ${spec.laserCount} (reload ${spec.laserReload.toFixed(2)}s)<br>` +
            `Price: ${ownedShipIds.has(spec.id) ? 'Owned' : `${spec.price} cr`}`;
    }
}

function clearShipPreview() {
    previewShipId = null;
    if (shipPreviewModel && shipPreviewScene) {
        shipPreviewScene.remove(shipPreviewModel);
        shipPreviewModel = null;
    }
    shipPreviewSpecId = null;
    const info = document.getElementById('shipPreviewInfo');
    if (info) info.textContent = 'No preview selected.';
}

function tradeCommodity(type, goodId, qty = 5, marketType = 'legal') {
    if (!activeDockStation) return;
    const good = allGoods.find((g) => g.id === goodId);
    if (!good) return;
    const selectedMarket = marketType === 'black' ? activeDockStation.blackMarket : activeDockStation.market;
    if (!selectedMarket) return;
    const marketItem = selectedMarket[goodId];
    if (!marketItem) return;

    if (type === 'buy') {
        const room = getCargoCapacity() - getCargoTotal();
        const actualQty = Math.min(qty, room);
        if (actualQty <= 0) return setMarketLog('Cargo hold is full.');
        const totalCost = marketItem.buy * actualQty;
        if (credits < totalCost) return setMarketLog('Not enough credits.');
        credits -= totalCost;
        cargoHold[goodId] += actualQty;
        setMarketLog(`Bought ${actualQty} ${good.name} for ${totalCost} cr.`);
    } else {
        const actualQty = Math.min(qty, cargoHold[goodId]);
        if (actualQty <= 0) return setMarketLog(`No ${good.name} in cargo.`);
        const totalRevenue = marketItem.sell * actualQty;
        credits += totalRevenue;
        cargoHold[goodId] -= actualQty;
        setMarketLog(`Sold ${actualQty} ${good.name} for ${totalRevenue} cr.`);
    }
    showStationScreen();
}

stationScreen.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-trade]');
    if (button && docked) {
        clearShipPreview();
        tradeCommodity(button.dataset.trade, button.dataset.good, 5, button.dataset.market || 'legal');
        return;
    }
    const shipBtn = e.target.closest('button[data-ship-action]');
    if (!shipBtn || !docked) return;
    const shipId = shipBtn.dataset.shipId;
    const action = shipBtn.dataset.shipAction;
    const spec = shipCatalog.get(shipId);
    if (!spec) return;
    if (action === 'preview') {
        previewShipId = shipId;
        setShipPreview(spec);
        setMarketLog(`Previewing ${spec.name}.`);
    } else if (action === 'buy') {
        if (credits < spec.price) return setMarketLog(`Need ${spec.price} credits to buy ${spec.name}.`);
        credits -= spec.price;
        ownedShipIds.add(shipId);
        activeOwnedShipId = shipId;
        clearShipPreview();
        applyShipSpec(spec);
        setMarketLog(`Purchased ${spec.name}.`);
    } else if (action === 'equip') {
        activeOwnedShipId = shipId;
        clearShipPreview();
        applyShipSpec(spec);
        setMarketLog(`Equipped ${spec.name}.`);
    }
    showStationScreen();
});

function showStationScreen() {
    const info = document.getElementById('stationDockInfo');
    if (info) {
        const stationLabel = activeDockStation?.group?.userData?.label || 'Station';
        const shieldPct = shieldMax > 0 ? (shield / shieldMax) * 100 : 0;
        const illicitTag = activeDockStation?.blackMarket ? `<br><span style="color:#ff9f8d;">Unregistered port detected. Black-market channel open.</span>` : '';
        info.innerHTML =
            `${stationLabel} docked. Docking clamps engaged.<br>` +
            `Shield: ${shieldPct.toFixed(0)}% | Hull: ${hull.toFixed(1)}% | Core: ${coreIntegrity.toFixed(0)}<br>` +
            `Fuel: ${fuel.toFixed(1)}% | Weapons: ${weaponsIntegrity.toFixed(0)}%<br>` +
            `Credits: ${credits} | Cargo: ${getCargoTotal()}/${getCargoCapacity()} | Engine: ${engineLevel}` +
            illicitTag;
    }
    refreshStationMarketUI();
    refreshShipyardUI();
    stationScreen.style.display = 'block';
    if (previewShipId) {
        const previewSpec = shipCatalog.get(previewShipId);
        if (previewSpec) setShipPreview(previewSpec);
    } else {
        const info = document.getElementById('shipPreviewInfo');
        if (info) info.textContent = 'No preview selected.';
    }
}

function hideStationScreen() {
    stationScreen.style.display = 'none';
}

function renderShipPreview(delta) {
    if (!shipPreviewRenderer || !shipPreviewScene || !shipPreviewCamera || !shipPreviewModel) return;
    shipPreviewModel.rotation.y += delta * 0.8;
    shipPreviewRenderer.render(shipPreviewScene, shipPreviewCamera);
}

function getPointedBody() {
    const shipPos = shipGroup.position;
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion).normalize();
    const dotThreshold = 0.94; // roughly 20 degrees cone
    let best = null;
    let bestScore = -Infinity;

    for (const body of targetBodies) {
        const toBody = new THREE.Vector3().subVectors(body.position, shipPos);
        const dist = toBody.length();
        if (dist < 0.001) continue;
        const dir = toBody.multiplyScalar(1 / dist);
        const dot = forward.dot(dir);
        if (dot < dotThreshold) continue;
        const score = dot - dist * 0.000035;
        if (score > bestScore) {
            bestScore = score;
            best = { name: body.userData.bodyName || body.userData.label || 'Unknown', distance: dist };
        }
    }
    return best;
}

// control state: pitch, roll and thrust
const keys = {
    pitchUp: false,
    pitchDown: false,
    rollLeft: false,
    rollRight: false,
    accel: false,
    decel: false,
    fire: false
};

// motion parameters
let accelerationRate = 5.0;            // units/sec^2 base (higher)
let maxSpeed = 180.0;                  // units/sec, higher top speed
const turnRate = 1.8; // radians/sec
const linearDamping = 0.3; // per second
const fuelBurnRate = 0.03; // percent/sec at full thrust (long endurance)
let shipVelocity = new THREE.Vector3();  // current velocity in world space
let cameraDistance = 20;
let cameraHeight = 5;
const minCameraDistance = 8;
const maxCameraDistance = 80;
let weaponCooldown = 0;
const laserBolts = [];
const stationBolts = [];
const laserBoltGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6);
laserBoltGeo.rotateX(Math.PI / 2);
const laserBoltMat = new THREE.MeshBasicMaterial({ color: 0x8fdcff });
const stationBoltMat = new THREE.MeshBasicMaterial({ color: 0xff6d57 });
let radioMessage = '';
let radioTimer = 0;
shipPerfReady = true;
if (currentShipSpec) {
    accelerationRate = currentShipSpec.accel;
    maxSpeed = currentShipSpec.speed;
}

window.addEventListener('keydown', (e) => {
    switch(e.code) {
        case 'KeyW': keys.pitchUp = true; break;     // pitch up
        case 'KeyS': keys.pitchDown = true; break;   // pitch down
        case 'KeyA': keys.rollLeft = true; break;    // roll left
        case 'KeyD': keys.rollRight = true; break;   // roll right
        case 'KeyQ':
            if (docked) { undockShip(); }
            else if (!escapePodMode) { keys.accel = true; playAccelSound(); }
            break;       // thrust forward or undock
        case 'KeyE':
            if (!escapePodMode) keys.decel = true;
            break;       // thrust backward
        case 'Space': keys.fire = true; e.preventDefault(); break;
    }
});
window.addEventListener('keyup', (e) => {
    switch(e.code) {
        case 'KeyW': keys.pitchUp = false; break;
        case 'KeyS': keys.pitchDown = false; break;
        case 'KeyA': keys.rollLeft = false; break;
        case 'KeyD': keys.rollRight = false; break;
        case 'KeyQ': keys.accel = false; break;
        case 'KeyE': keys.decel = false; break;
        case 'Space': keys.fire = false; break;
    }
});
window.addEventListener('wheel', (e) => {
    e.preventDefault();
    cameraDistance += e.deltaY * 0.02;
    cameraDistance = Math.max(minCameraDistance, Math.min(maxCameraDistance, cameraDistance));
    // keep slight height increase when zooming out for better framing
    cameraHeight = 3 + (cameraDistance - minCameraDistance) * 0.08;
}, { passive: false });

function updateShip(delta) {
    if (docked) return; // no movement when docked
    if (escapePodMode) {
        updateEscapePodAutopilot(delta);
        return;
    }
    // roll around local Z axis (ship forward)
    if (keys.rollLeft)  shipGroup.rotateOnAxis(new THREE.Vector3(0,0,1), turnRate * delta);
    if (keys.rollRight) shipGroup.rotateOnAxis(new THREE.Vector3(0,0,1), -turnRate * delta);

    // pitch around local X axis
    if (keys.pitchUp)   shipGroup.rotateOnAxis(new THREE.Vector3(1,0,0), turnRate * delta);
    if (keys.pitchDown) shipGroup.rotateOnAxis(new THREE.Vector3(1,0,0), -turnRate * delta);

    // compute local forward vector for thrust
    const forwardVec = new THREE.Vector3(0,0,-1).applyQuaternion(shipGroup.quaternion);

    // forward/backward thrust along local forward with speed-dependent acceleration
    if (keys.accel || keys.decel) {
        const t = (keys.accel ? 1 : 0) + (keys.decel ? -1 : 0);
        const fuelBurn = fuelBurnRate * Math.abs(t) * delta;
        if (fuel > 0) {
            fuel = Math.max(0, fuel - fuelBurn);
            // acceleration increases with current speed (/10 makes gentle)
            const factor = 1 + shipVelocity.length() / 10;
            shipVelocity.addScaledVector(forwardVec, t * accelerationRate * factor * delta);
        }
    }

    // limit speed and apply frame-rate independent drag
    if (shipVelocity.length() > maxSpeed) shipVelocity.setLength(maxSpeed);
    shipVelocity.multiplyScalar(Math.exp(-linearDamping * delta));

    shipGroup.position.add(shipVelocity.clone().multiplyScalar(delta));
}

// afterburner-like sound helper using noise
function playAccelSound() {
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = window.audioCtx;
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1000;
    filter.Q.value = 1;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    noise.stop(ctx.currentTime + 0.2);
}

// animate
const clock = new THREE.Clock();
let collision = false;
let imminent = false;
let docked = false;
const shipCollisionRadius = 3;
const collisionWarnBuffer = 35;
let asteroidImpactCooldown = 0;
let nearbyPlanetWarning = '';
function createLocalAABBCollider(stationGroup, mesh) {
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const bb = mesh.geometry.boundingBox;
    const corners = [
        new THREE.Vector3(bb.min.x, bb.min.y, bb.min.z),
        new THREE.Vector3(bb.min.x, bb.min.y, bb.max.z),
        new THREE.Vector3(bb.min.x, bb.max.y, bb.min.z),
        new THREE.Vector3(bb.min.x, bb.max.y, bb.max.z),
        new THREE.Vector3(bb.max.x, bb.min.y, bb.min.z),
        new THREE.Vector3(bb.max.x, bb.min.y, bb.max.z),
        new THREE.Vector3(bb.max.x, bb.max.y, bb.min.z),
        new THREE.Vector3(bb.max.x, bb.max.y, bb.max.z)
    ];
    mesh.updateWorldMatrix(true, false);
    const min = new THREE.Vector3(Infinity, Infinity, Infinity);
    const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);
    for (const c of corners) {
        c.applyMatrix4(mesh.matrixWorld);
        stationGroup.worldToLocal(c);
        min.min(c);
        max.max(c);
    }
    return { min, max };
}

function playLaserSound() {
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = window.audioCtx;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.08);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.08, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.1);
}

function playDamageSound(amount = 8) {
    if (!window.audioCtx) {
        window.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    const ctx = window.audioCtx;
    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * 0.2);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const env = Math.exp(-t * 6.5);
        output[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 560;
    const gain = ctx.createGain();
    const peak = Math.min(0.38, 0.1 + amount * 0.018);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.2);
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(now);
    noise.stop(now + 0.22);
}

function setRadioMessage(text, holdTime = 5.5) {
    radioMessage = text;
    radioTimer = holdTime;
}

function triggerShipDestruction() {
    if (shipDestroyed) return;
    shipDestroyed = true;
    escapePodMode = true;
    docked = false;
    hideStationScreen();
    activeDockStation = null;
    keys.fire = false;
    keys.accel = false;
    keys.decel = false;
    const breachFlash = new THREE.Mesh(
        new THREE.SphereGeometry(1.6, 10, 10),
        new THREE.MeshBasicMaterial({ color: 0xffb06a, transparent: true, opacity: 0.9 })
    );
    breachFlash.position.copy(shipGroup.position);
    scene.add(breachFlash);
    setTimeout(() => scene.remove(breachFlash), 260);
    if (shipGroup.userData.modelRoot) shipGroup.remove(shipGroup.userData.modelRoot);
    const pod = buildEscapePodModel();
    shipGroup.add(pod);
    shipGroup.userData.modelRoot = pod;
    updateFusionExhaust = () => {};
    shipVelocity.multiplyScalar(0.25);
    shieldMax = 40;
    shield = 22;
    shieldRegenRate = 3.5;
    shieldRegenDelay = 3.0;
    shieldRegenTimer = 1.4;
    hull = Math.max(10, hull);
    coreIntegrity = 100;
    weaponsIntegrity = 0;
    weaponsOfflineTimer = 9999;
    let nearest = null;
    let nearestD = Infinity;
    for (const s of systemStations) {
        const d = shipGroup.position.distanceTo(s.group.position);
        if (d < nearestD) {
            nearestD = d;
            nearest = s;
        }
    }
    escapePodTargetStation = nearest;
    const targetName = nearest?.group?.userData?.label || 'nearest port';
    setRadioMessage(`Core breach. Escape pod launched. Autopiloting to ${targetName}.`, 7.0);
}

function applyShipDamage(amount, source = 'impact') {
    if (docked || amount <= 0) return;
    if (shipDestroyed && !escapePodMode) return;
    damageFlashTimer = 0.18;
    damageFlashStrength = Math.max(damageFlashStrength, Math.min(1, 0.28 + amount * 0.035));
    playDamageSound(amount);
    let remaining = amount;
    if (shield > 0) {
        const absorbed = Math.min(shield, remaining);
        shield -= absorbed;
        remaining -= absorbed;
        if (absorbed > 0) shieldRegenTimer = shieldRegenDelay;
    }
    if (remaining > 0) {
        const hullScale = source === 'collision' ? 1.15 : 0.9;
        hull = Math.max(0, hull - remaining * hullScale);
        const baseCoreDmg = remaining * (source === 'collision' ? 0.45 : 0.32);
        coreIntegrity = Math.max(0, coreIntegrity - baseCoreDmg);
        const critChance = Math.min(0.55, 0.12 + remaining * 0.025);
        if (Math.random() < critChance) {
            if (Math.random() < 0.52) {
                const wDmg = 12 + Math.random() * 26;
                weaponsIntegrity = Math.max(0, weaponsIntegrity - wDmg);
                weaponsOfflineTimer = Math.max(weaponsOfflineTimer, 1.4 + (100 - weaponsIntegrity) * 0.03);
                setRadioMessage('Critical hit: weapon bus damaged.', 3.4);
            } else {
                const cDmg = 10 + Math.random() * 24;
                coreIntegrity = Math.max(0, coreIntegrity - cDmg);
                setRadioMessage('Critical hit: core structure compromised.', 3.6);
            }
        }
    }
    if (coreIntegrity <= 0) {
        triggerShipDestruction();
    }
}

function updateShipSurvivability(delta) {
    if (shieldRegenTimer > 0) {
        shieldRegenTimer = Math.max(0, shieldRegenTimer - delta);
    } else if (shield < shieldMax) {
        shield = Math.min(shieldMax, shield + shieldRegenRate * delta);
    }
    if (weaponsOfflineTimer > 0) {
        weaponsOfflineTimer = Math.max(0, weaponsOfflineTimer - delta);
    }
}

function updateEscapePodAutopilot(delta) {
    if (!escapePodMode || docked || !escapePodTargetStation) return;
    const dockPoint = escapePodTargetStation.group.localToWorld(escapePodTargetStation.dockLocalPoint.clone());
    const toDock = dockPoint.clone().sub(shipGroup.position);
    const dist = toDock.length();
    if (dist < 1.5) {
        dockShip(escapePodTargetStation, dockPoint);
        shipVelocity.set(0, 0, 0);
        setRadioMessage(`${escapePodTargetStation.group.userData.label}: Escape pod secured. Docking complete.`, 5.5);
        return;
    }
    const dir = toDock.normalize();
    const desiredQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, -1), dir);
    shipGroup.quaternion.slerp(desiredQ, Math.min(1, delta * 1.7));
    const targetSpeed = dist > 120 ? 150 : Math.max(28, dist * 0.9);
    shipVelocity.lerp(dir.multiplyScalar(targetSpeed), Math.min(1, delta * 1.9));
    shipGroup.position.addScaledVector(shipVelocity, delta);
}

function fireLasers() {
    if (docked || !currentShipSpec || escapePodMode) return;
    if (weaponsOfflineTimer > 0 || weaponsIntegrity <= 8) return;
    const weaponScale = Math.max(0.35, weaponsIntegrity / 100);
    const count = Math.max(1, Math.round((currentShipSpec.laserCount || 1) * weaponScale));
    const width = currentShipSpec.hullW || 2.5;
    const muzzleZ = -(currentShipSpec.hullL * 0.5 + currentShipSpec.noseL * 0.9);
    const lane = Math.max(0.38, Math.min(1.2, width * 0.26));
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipGroup.quaternion);
    const boltSpeed = 620;

    for (let i = 0; i < count; i++) {
        const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1;
        const mountX = t * lane;
        const jitterY = (Math.random() - 0.5) * 0.08;
        const localPos = new THREE.Vector3(mountX, 0.04 + jitterY, muzzleZ);
        const worldPos = shipGroup.localToWorld(localPos);
        const bolt = new THREE.Mesh(laserBoltGeo, laserBoltMat.clone());
        bolt.position.copy(worldPos);
        bolt.quaternion.copy(shipGroup.quaternion);
        bolt.userData.velocity = forward.clone().multiplyScalar(boltSpeed).add(shipVelocity.clone().multiplyScalar(0.18));
        bolt.userData.life = 1.8;
        scene.add(bolt);
        laserBolts.push(bolt);
    }
    playLaserSound();
}

function updateWeapons(delta) {
    if (weaponCooldown > 0) weaponCooldown = Math.max(0, weaponCooldown - delta);
    if (keys.fire && !docked && currentShipSpec && !escapePodMode && weaponCooldown <= 0) {
        fireLasers();
        const dmgPenalty = 1 + Math.max(0, (100 - weaponsIntegrity) * 0.005);
        weaponCooldown = Math.max(0.06, (currentShipSpec.laserReload || 0.25) * dmgPenalty);
    }
    for (let i = laserBolts.length - 1; i >= 0; i--) {
        const bolt = laserBolts[i];
        const vel = bolt.userData.velocity;
        bolt.position.addScaledVector(vel, delta);
        bolt.userData.life -= delta;
        let hitStation = null;
        for (const stationData of systemStations) {
            const pLocal = stationData.group.worldToLocal(bolt.position.clone());
            for (const c of stationData.colliders) {
                if (pointAABBDistanceSq(pLocal, c.min, c.max) < 0.15) {
                    hitStation = stationData;
                    break;
                }
            }
            if (hitStation) break;
        }
        if (hitStation) {
            const firstProvocation = hitStation.hostileTimer <= 0;
            hitStation.hostileTimer = 18;
            if (firstProvocation) {
                setRadioMessage(`${hitStation.group.userData.label}: Cease fire immediately. Defense grid active.`);
            }
        }
        if (hitStation || bolt.userData.life <= 0 || bolt.position.distanceTo(shipGroup.position) > 4200) {
            scene.remove(bolt);
            laserBolts.splice(i, 1);
        }
    }

    for (let i = stationBolts.length - 1; i >= 0; i--) {
        const bolt = stationBolts[i];
        bolt.position.addScaledVector(bolt.userData.velocity, delta);
        bolt.userData.life -= delta;
        if (bolt.position.distanceTo(shipGroup.position) < shipCollisionRadius + 0.9) {
            applyShipDamage(8.5, 'station_laser');
            shipVelocity.addScaledVector(bolt.userData.velocity.clone().normalize(), 6.5);
            scene.remove(bolt);
            stationBolts.splice(i, 1);
            continue;
        }
        if (bolt.userData.life <= 0 || bolt.position.length() > 12000) {
            scene.remove(bolt);
            stationBolts.splice(i, 1);
        }
    }
}

function updateStationDefense(delta) {
    const shipPos = shipGroup.position;
    for (const stationData of systemStations) {
        const stationPos = stationData.group.getWorldPosition(new THREE.Vector3());
        const d = shipPos.distanceTo(stationPos);
        const approachWarnDist = stationData.isHiddenStation ? 140 : 260;
        const clearWarnDist = stationData.isHiddenStation ? 185 : 340;
        if (!docked && d < approachWarnDist && !stationData.warnedApproach) {
            stationData.warnedApproach = true;
            setRadioMessage(`${stationData.group.userData.label}: You are entering controlled approach space.`);
        } else if (d > clearWarnDist) {
            stationData.warnedApproach = false;
        }

        if (stationData.hostileTimer > 0) {
            stationData.hostileTimer = Math.max(0, stationData.hostileTimer - delta);
        }
        const hostile = stationData.hostileTimer > 0 && !docked;
        for (const turret of stationData.turrets) {
            const shipLocal = stationData.group.worldToLocal(shipPos.clone());
            const rel = shipLocal.sub(turret.pivot.position);
            const desired = Math.atan2(rel.x, -rel.z);
            const minYaw = turret.baseYaw - Math.PI * 0.5;
            const maxYaw = turret.baseYaw + Math.PI * 0.5;
            const targetYaw = Math.max(minYaw, Math.min(maxYaw, desired));
            turret.yaw += (targetYaw - turret.yaw) * Math.min(1, delta * 4.2);
            turret.pivot.rotation.y = turret.yaw;
            turret.shotTimer = Math.max(0, turret.shotTimer - delta);
            if (!hostile || turret.shotTimer > 0) continue;
            if (d > 560) continue;
            const yawErr = Math.abs(targetYaw - turret.yaw);
            if (yawErr > 0.22) continue;
            const muzzleLocal = turret.pivot.localToWorld(new THREE.Vector3(0, 0.5, -1.95));
            const fireDir = shipPos.clone().sub(muzzleLocal).normalize();
            const bolt = new THREE.Mesh(laserBoltGeo, stationBoltMat.clone());
            bolt.position.copy(muzzleLocal);
            bolt.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fireDir);
            bolt.userData.velocity = fireDir.multiplyScalar(420);
            bolt.userData.life = 2.8;
            scene.add(bolt);
            stationBolts.push(bolt);
            turret.shotTimer = turret.cooldown + Math.random() * 0.2;
        }
    }
}

function pointAABBDistanceSq(point, min, max) {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    if (point.x < min.x) dx = min.x - point.x;
    else if (point.x > max.x) dx = point.x - max.x;
    if (point.y < min.y) dy = min.y - point.y;
    else if (point.y > max.y) dy = point.y - max.y;
    if (point.z < min.z) dz = min.z - point.z;
    else if (point.z > max.z) dz = point.z - max.z;
    return dx * dx + dy * dy + dz * dz;
}

systemStations.forEach((s) => {
    s.colliders = s.solidMeshes.map((m) => createLocalAABBCollider(s.group, m));
});
let dockCooldown = 0;
let activeDockStation = null;

function dockShip(stationData, dockPoint) {
    docked = true;
    activeDockStation = stationData;
    shipVelocity.set(0, 0, 0);
    shipGroup.position.copy(dockPoint);
    if (escapePodMode) {
        const minShipPrice = Math.min(...shipMarketOffers.map((s) => s.price));
        if (credits < minShipPrice) {
            credits = minShipPrice;
            setStationConsoleMessage('Rescue intake: You worked dock shifts and saved enough to buy the smallest ship.');
        } else {
            setStationConsoleMessage('Rescue intake: Escape pod recovered. Acquire a replacement ship when ready.');
        }
    } else {
        const stationName = stationData.group?.userData?.label || 'Station';
        const welcome = {
            'Port Kestrel': 'Port Kestrel control: Welcome back, pilot.',
            'Haven Array': 'Haven Array: Berth assigned. Trade lanes are stable.',
            'Spindle Dock': 'Spindle Dock: Docking clamps locked. Systems green.',
            'Rook Exchange': 'Rook Exchange: Markets are open. Watch your margins.',
            'Midas Relay': 'Midas Relay: Corridor traffic normal. Welcome.',
            'Argent Pier': 'Argent Pier: Clearance confirmed. Service crews awaiting.',
            'Smuggler Hollow': 'Smuggler Hollow: Keep your comms dark and credits ready.',
            'Dark Quarry': 'Dark Quarry: No questions asked, no records kept.',
            'Cinder Den': 'Cinder Den: Welcome to the Den. Pay first.'
        };
        setStationConsoleMessage(welcome[stationName] || `${stationName}: Dock complete. Services available.`);
    }
    showStationScreen();
}

function undockShip() {
    if (!activeDockStation) return;
    if (escapePodMode) {
        setRadioMessage('Escape pod launch rails are locked. Acquire a replacement ship.', 4.0);
        return;
    }
    docked = false;
    hideStationScreen();
    if (previewShipId && !ownedShipIds.has(previewShipId)) {
        previewShipId = null;
    }
    // launch hard away from station and disable docking briefly
    const dockPoint = activeDockStation.group.localToWorld(activeDockStation.dockLocalPoint.clone());
    const launchDir = dockPoint.clone().sub(activeDockStation.group.position).normalize();
    shipGroup.position.copy(dockPoint).addScaledVector(launchDir, escapePodMode ? 12 : 22);
    shipVelocity.copy(launchDir.multiplyScalar(escapePodMode ? 42 : 95));
    dockCooldown = 1.4;
    activeDockStation = null;
    weaponCooldown = 0.25;
}

function checkCollisions(delta) {
    const pos = shipGroup.position;
    collision = false;
    imminent = false;
    nearbyPlanetWarning = '';
    let currentDockPoint = null;
    for (const planet of planets) {
        const r = planet.userData.radius || 20;
        const d = pos.distanceTo(planet.position);
        if (d < r + shipCollisionRadius) collision = true;
        else if (d < r + shipCollisionRadius + collisionWarnBuffer) imminent = true;
        if (d < r + 125) nearbyPlanetWarning = `WARNING: ship not atmosphere capable (${planet.userData.bodyName})`;
    }

    const sunDist = pos.distanceTo(sun.position);
    if (sunDist < 50 + shipCollisionRadius) collision = true;
    else if (sunDist < 50 + shipCollisionRadius + collisionWarnBuffer) imminent = true;

    for (const a of asteroidHazards) {
        if (a.isHideoutRockBlock && a.linkedStation) {
            const dockPointWorld = a.linkedStation.group.localToWorld(a.linkedStation.dockLocalPoint.clone());
            const dockApproachDist = pos.distanceTo(dockPointWorld);
            // keep asteroid hazard from blocking docking approach at embedded bases
            if (dockApproachDist < 205) continue;

            const localToStation = a.linkedStation.group.worldToLocal(pos.clone());
            const corridorRadius = 16;
            const radialSq = localToStation.x * localToStation.x + localToStation.z * localToStation.z;
            const inDockCorridor = radialSq < corridorRadius * corridorRadius &&
                localToStation.y > -14 &&
                localToStation.y < a.linkedStation.dockLocalPoint.y + 18;
            if (inDockCorridor) continue;
        }
        const d = pos.distanceTo(a.object.getWorldPosition(new THREE.Vector3()));
        const hitRadius = (a.radius || 6) + shipCollisionRadius;
        if (d < hitRadius) {
            if (asteroidImpactCooldown <= 0 && !docked) {
                applyShipDamage(5.2, 'asteroid');
                const away = pos.clone().sub(a.object.getWorldPosition(new THREE.Vector3())).normalize();
                shipVelocity.addScaledVector(away, 6.5);
                asteroidImpactCooldown = 0.24;
            }
            collision = true;
            break;
        } else if (d < hitRadius + 20) {
            imminent = true;
        }
    }

    for (const stationData of systemStations) {
        const dockPoint = stationData.group.localToWorld(stationData.dockLocalPoint.clone());
        const shipLocalPos = stationData.group.worldToLocal(pos.clone());
        const collisionScale = stationData.collisionScale || 1.0;
        const effectiveCollisionRadius = shipCollisionRadius * collisionScale;
        const collisionRadiusSq = effectiveCollisionRadius * effectiveCollisionRadius;
        const warnRadius = effectiveCollisionRadius + collisionWarnBuffer * (0.55 + 0.45 * collisionScale);
        const warnRadiusSq = warnRadius * warnRadius;
        const inHiddenDockCorridor = (() => {
            if (!stationData.isHiddenStation) return false;
            const corridorRadius = 12.5;
            const radialSq = shipLocalPos.x * shipLocalPos.x + shipLocalPos.z * shipLocalPos.z;
            return radialSq < corridorRadius * corridorRadius &&
                shipLocalPos.y > -12 &&
                shipLocalPos.y < stationData.dockLocalPoint.y + 14;
        })();
        for (const c of stationData.colliders) {
            if (inHiddenDockCorridor) continue;
            const dSq = pointAABBDistanceSq(shipLocalPos, c.min, c.max);
            if (dSq < collisionRadiusSq) {
                collision = true;
                break;
            }
            if (dSq < warnRadiusSq) imminent = true;
        }
        if (!docked && dockCooldown <= 0 && pos.distanceTo(dockPoint) < stationData.dockRadius) {
            dockShip(stationData, dockPoint);
            currentDockPoint = dockPoint;
            break;
        }
        if (activeDockStation === stationData) currentDockPoint = dockPoint;
    }

    if (docked && currentDockPoint) {
        shipGroup.position.copy(currentDockPoint);
    }
    if (collision && !docked) {
        applyShipDamage(22 * delta, 'collision');
        shipVelocity.multiplyScalar(0.94);
    }
    // color ship
    shipGroup.traverse(child => {
        if (child.material && !child.userData.skipShipTint) {
            if (docked) child.material.color.set(0x2048aa);
            else if (collision) child.material.color.set(0x9a5a36);
            else if (child.userData.baseColor) child.material.color.set(child.userData.baseColor);
        }
    });
}

function updateHUD() {
    const speedEl = document.getElementById('speed');
    const coordsEl = document.getElementById('coords');
    const warnEl = document.getElementById('warn');
    if (speedEl) {
        speedEl.textContent = `Speed: ${shipVelocity.length().toFixed(2)}`;
    }
    if (coordsEl) {
        const p = shipGroup.position;
        coordsEl.textContent = `X:${p.x.toFixed(2)} Y:${p.y.toFixed(2)} Z:${p.z.toFixed(2)}`;
    }
    if (warnEl) {
        if (docked) warnEl.textContent = 'Docked - Press Q to undock';
        else if (escapePodMode) warnEl.textContent = 'Escape pod autopilot engaged';
        else if (fuel <= 0) warnEl.textContent = 'Out of fuel';
        else if (nearbyPlanetWarning) warnEl.textContent = nearbyPlanetWarning;
        else warnEl.textContent = imminent && !collision ? 'Collision imminent' : '';
    }
    const hud = document.getElementById('hud');
    if (hud) {
        let statusEl = document.getElementById('status');
        if (!statusEl) {
            statusEl = document.createElement('div');
            statusEl.id = 'status';
            hud.appendChild(statusEl);
        }
        const laserCount = currentShipSpec?.laserCount || 1;
        const reloadLeft = weaponCooldown > 0 ? weaponCooldown.toFixed(2) : 'ready';
        const shieldPct = shieldMax > 0 ? (shield / shieldMax) * 100 : 0;
        const laserState = escapePodMode ? 'offline' : (weaponsOfflineTimer > 0 ? `${weaponsOfflineTimer.toFixed(1)}s` : reloadLeft);
        statusEl.textContent = `Shield:${shieldPct.toFixed(0)}% Hull:${hull.toFixed(1)}% Core:${coreIntegrity.toFixed(0)} Wpn:${weaponsIntegrity.toFixed(0)}% Fuel:${fuel.toFixed(1)}% Credits:${credits} Cargo:${getCargoTotal()}/${getCargoCapacity()} Eng:${engineLevel} Lasers:${laserCount} RLD:${laserState}`;

        let targetEl = document.getElementById('target');
        if (!targetEl) {
            targetEl = document.createElement('div');
            targetEl.id = 'target';
            hud.appendChild(targetEl);
        }
        const target = getPointedBody();
        if (target) targetEl.textContent = `Target: ${target.name} (${target.distance.toFixed(0)}u)`;
        else targetEl.textContent = 'Target: --';

    }
    if (radioTimer > 0 && radioMessage) {
        radioOverlay.textContent = `RADIO: ${radioMessage}`;
        radioOverlay.style.display = 'block';
    } else {
        radioOverlay.style.display = 'none';
    }
    updateRadar();
}

function updateRadar() {
    const canvas = document.getElementById('radar');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);
    const radius = size / 2 - 5;
    // draw outer circle
    ctx.strokeStyle = '#0f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size/2, size/2, radius, 0, 2 * Math.PI);
    ctx.stroke();

    // draw each radar object
    radarObjects.forEach(obj => {
        // position relative to ship in world space
        const rel = new THREE.Vector3().subVectors(obj.position, shipGroup.position);
        // convert to ship-local coordinates by applying inverse rotation
        const invQuat = shipGroup.quaternion.clone().invert();
        const local = rel.clone().applyQuaternion(invQuat);
        const worldDist = Math.hypot(local.x, local.z);
        if (worldDist > 0) {
            const angle = Math.atan2(local.z, local.x);
            // logarithmic radius mapping
            const logDist = Math.log10(worldDist + 1);
            const maxLog = Math.log10(5000 + 1);
            const r = (logDist / maxLog) * radius;
            if (r <= radius) {
                const dx = r * Math.cos(angle);
                const dy = r * Math.sin(angle);
                // simple fixed color
                ctx.fillStyle = '#0f0';
                ctx.beginPath();
                ctx.arc(size/2 + dx, size/2 + dy, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    });
}

function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();
    updateSunHeatTexture(clock.elapsedTime);
    updateFusionExhaust(clock.elapsedTime);
    if (radioTimer > 0) radioTimer = Math.max(0, radioTimer - delta);
    if (asteroidImpactCooldown > 0) asteroidImpactCooldown = Math.max(0, asteroidImpactCooldown - delta);
    if (damageFlashTimer > 0) {
        damageFlashTimer = Math.max(0, damageFlashTimer - delta);
        const t = damageFlashTimer / 0.18;
        damageOverlay.style.opacity = (damageFlashStrength * t * 0.42).toFixed(3);
        if (damageFlashTimer === 0) {
            damageFlashStrength = 0;
            damageOverlay.style.opacity = '0';
        }
    }
    if (dockCooldown > 0) dockCooldown = Math.max(0, dockCooldown - delta);
    for (const orb of asteroidOrbiters) {
        orb.angle += orb.speed * delta;
        const x = sun.position.x + Math.cos(orb.angle) * orb.orbit;
        const z = sun.position.z + Math.sin(orb.angle) * orb.orbit;
        orb.object.position.set(x, orb.y, z);
        if (orb.spin) {
            orb.object.rotation.x += orb.spin.x * delta;
            orb.object.rotation.y += orb.spin.y * delta;
            orb.object.rotation.z += orb.spin.z * delta;
        }
    }
    for (const w of planetWeatherLayers) {
        w.planet.rotation.y += w.spin * delta;
        w.layer.rotation.y += w.weatherSpin * delta;
    }
    updateShipSurvivability(delta);
    updateShip(delta);
    updateStationDefense(delta);
    updateWeapons(delta);
    for (const stationData of systemStations) {
        stationData.group.rotation.y += stationData.rotationSpeed;
    }

    // camera fixed to ship (no smoothing)
    const camLocal = new THREE.Vector3(0, cameraHeight, cameraDistance);
    camLocal.applyQuaternion(shipGroup.quaternion);
    camera.position.copy(shipGroup.position).add(camLocal);
    camera.quaternion.copy(shipGroup.quaternion);

    checkCollisions(delta);
    updateHUD();
    renderer.render(scene, camera);
    renderShipPreview(delta);
}
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
