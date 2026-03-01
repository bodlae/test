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

function createRandomShipSpec(id, forcedName = null) {
    const hullW = randRange(2.3, 4.2);
    const hullH = randRange(1.0, 1.9);
    const hullL = randRange(5.2, 8.6);
    const podLen = randRange(1.8, 3.6);
    const podOffset = randRange(1.6, 2.5);
    const rustPatchPalette = [0x6a3125, 0x4f2319, 0x7a3f2f, 0x3b1f18, 0x5b2a1f, 0x2b1511];
    const signaturePalette = [0x3dd5ff, 0xff6c3d, 0x72ff8f, 0xffde59, 0xc18dff, 0xff5ca8];
    return {
        id,
        name: forcedName || generateShipName(),
        price: Math.round(randRange(7000, 13000)),
        hullPalette: [0xc9d0d9, 0xb6bec8, 0xd6dde5, 0xaab4bf],
        detailPalette: [0xe2e8ef, 0xd1d8e0, 0xc1c9d2, 0x8e4f3a, 0x6a3125, 0x7a3f2f],
        rustPatchPalette,
        hullW,
        hullH,
        hullL,
        podLen,
        podOffset,
        podH: randRange(0.6, 1.0),
        noseR: randRange(0.9, 1.4),
        noseL: randRange(2.0, 3.1),
        rearBlockW: randRange(1.4, 2.4),
        rearBlockH: randRange(0.7, 1.2),
        rearBlockL: randRange(0.8, 1.4),
        patchCount: 8 + Math.floor(Math.random() * 12),
        signatureColor: pick(signaturePalette),
        cockpitType: Math.floor(Math.random() * 4),
        accel: randRange(5.5, 10.5),
        speed: randRange(180, 320)
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
    nose.rotation.x = Math.PI / 2;
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
        cockpit.position.set(0, spec.hullH * 0.36, -spec.hullL * 0.22);
    } else if (spec.cockpitType === 1) {
        cockpit = new THREE.Mesh(
            new THREE.CylinderGeometry(0.34, 0.48, 1.25, 10),
            new THREE.MeshStandardMaterial({ color: 0x6ea0bd, roughness: 0.24, metalness: 0.4, transparent: true, opacity: 0.88 })
        );
        cockpit.rotation.z = Math.PI / 2;
        cockpit.scale.set(1, 0.85, 1.2);
        cockpit.position.set(0, spec.hullH * 0.34, -spec.hullL * 0.18);
    } else if (spec.cockpitType === 2) {
        cockpit = new THREE.Mesh(
            new THREE.BoxGeometry(0.95 + spec.hullW * 0.1, 0.45, 1.15),
            new THREE.MeshStandardMaterial({ color: 0x7fb3cb, roughness: 0.2, metalness: 0.38, transparent: true, opacity: 0.86 })
        );
        cockpit.position.set(0, spec.hullH * 0.32, -spec.hullL * 0.2);
    } else {
        cockpit = new THREE.Mesh(
            new THREE.ConeGeometry(0.58 + spec.hullW * 0.05, 1.3, 8),
            new THREE.MeshStandardMaterial({ color: 0x79a9c6, roughness: 0.22, metalness: 0.42, transparent: true, opacity: 0.86 })
        );
        cockpit.rotation.x = Math.PI / 2;
        cockpit.position.set(0, spec.hullH * 0.3, -spec.hullL * 0.24);
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
    if (shipPerfReady) {
        accelerationRate = spec.accel;
        maxSpeed = spec.speed;
    }
}

const starterShipSpec = {
    ...createRandomShipSpec('starter', 'Rust Finch'),
    price: 0,
    accel: 6.5,
    speed: 210
};
const shipMarketOffers = [
    createRandomShipSpec('model-1'),
    createRandomShipSpec('model-2'),
    createRandomShipSpec('model-3')
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
        rotationSpeed: 0.002 + Math.random() * 0.002
    };
}

const { texture: sunHeatTexture, update: updateSunHeatTexture } = createSunHeatmapTexture();
const sun = new THREE.Mesh(
    new THREE.SphereGeometry(50, 56, 56),
    new THREE.MeshStandardMaterial({
        map: sunHeatTexture,
        emissive: 0xff9a1f,
        emissiveMap: sunHeatTexture,
        emissiveIntensity: 1.4,
        roughness: 1.0,
        metalness: 0.0
    })
);
sun.position.set(0,0,-500);
scene.add(sun);
const ambientLight = new THREE.AmbientLight(0x6688aa, 0.28);
scene.add(ambientLight);
const sunLight = new THREE.PointLight(0xffc16d, 1.8, 3000, 1.7);
sunLight.position.copy(sun.position);
scene.add(sunLight);

const planets = [];
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
    { radius: 56, orbit: 360, angle: 0.2, y: -15 },
    { radius: 74, orbit: 660, angle: 1.35, y: 18 },
    { radius: 48, orbit: 980, angle: 2.25, y: -8 },
    { radius: 92, orbit: 1320, angle: 3.5, y: 24 },
    { radius: 64, orbit: 1720, angle: 4.65, y: -20 }
];

const tradeGoods = [
    { id: 'ore', name: 'Ore', base: 42 },
    { id: 'tech', name: 'Tech', base: 120 },
    { id: 'meds', name: 'Meds', base: 78 }
];

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

planetConfigs.forEach((cfg, idx) => {
    const px = sun.position.x + Math.cos(cfg.angle) * cfg.orbit;
    const pz = sun.position.z + Math.sin(cfg.angle) * cfg.orbit;
    const planet = new THREE.Mesh(
        new THREE.SphereGeometry(cfg.radius, 48, 48),
        new THREE.MeshStandardMaterial({
            map: createWavePlanetTexture(1024, planetPalettes[idx % planetPalettes.length]),
            roughness: 0.92,
            metalness: 0.02
        })
    );
    planet.position.set(px, cfg.y, pz);
    planet.userData.radius = cfg.radius;
    planet.userData.bodyName = planetNames[idx] || `World-${idx + 1}`;
    planets.push(planet);
    scene.add(planet);
    targetBodies.push(planet);

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
    systemStations.push(stationData);
    targetBodies.push(stationData.group);
});

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

// player state
let credits = 60000;
let fuel = 100;
let hull = 100;
const cargoHold = { ore: 0, tech: 0, meds: 0 };
const cargoCapacity = 40;
let engineLevel = 1;

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
let shipPreviewRenderer = null;
let shipPreviewScene = null;
let shipPreviewCamera = null;
let shipPreviewModel = null;
let shipPreviewSpecId = null;

function getCargoTotal() {
    return cargoHold.ore + cargoHold.tech + cargoHold.meds;
}

function setMarketLog(text) {
    const logEl = document.getElementById('marketLog');
    if (logEl) logEl.textContent = text;
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
                    <button data-trade="buy" data-good="${g.id}" style="margin-right:6px;">Buy 5</button>
                    <button data-trade="sell" data-good="${g.id}">Sell 5</button>
                </div>
            </div>`;
    }).join('');
    marketEl.innerHTML = `<div style="margin-bottom:6px;">Market prices</div>${rows}`;
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

function tradeCommodity(type, goodId, qty = 5) {
    if (!activeDockStation) return;
    const good = tradeGoods.find((g) => g.id === goodId);
    if (!good) return;
    const marketItem = activeDockStation.market[goodId];
    if (!marketItem) return;

    if (type === 'buy') {
        const room = cargoCapacity - getCargoTotal();
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
        tradeCommodity(button.dataset.trade, button.dataset.good, 5);
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
        info.innerHTML =
            `${stationLabel} docked. Docking clamps engaged.<br>` +
            `Hull: ${hull.toFixed(1)}% | Fuel: ${fuel.toFixed(1)}%<br>` +
            `Credits: ${credits} | Cargo: ${getCargoTotal()}/${cargoCapacity} | Engine: ${engineLevel}`;
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
    decel: false
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
            else { keys.accel = true; playAccelSound(); }
            break;       // thrust forward or undock
        case 'KeyE': keys.decel = true; break;       // thrust backward
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
    showStationScreen();
}

function undockShip() {
    if (!activeDockStation) return;
    docked = false;
    hideStationScreen();
    if (previewShipId && !ownedShipIds.has(previewShipId)) {
        previewShipId = null;
    }
    // launch hard away from station and disable docking briefly
    const dockPoint = activeDockStation.group.localToWorld(activeDockStation.dockLocalPoint.clone());
    const launchDir = dockPoint.clone().sub(activeDockStation.group.position).normalize();
    shipGroup.position.copy(dockPoint).addScaledVector(launchDir, 22);
    shipVelocity.copy(launchDir.multiplyScalar(95));
    dockCooldown = 1.4;
    activeDockStation = null;
}

function checkCollisions(delta) {
    const pos = shipGroup.position;
    collision = false;
    imminent = false;
    let currentDockPoint = null;
    for (const planet of planets) {
        const r = planet.userData.radius || 20;
        const d = pos.distanceTo(planet.position);
        if (d < r + shipCollisionRadius) collision = true;
        else if (d < r + shipCollisionRadius + collisionWarnBuffer) imminent = true;
    }

    const sunDist = pos.distanceTo(sun.position);
    if (sunDist < 50 + shipCollisionRadius) collision = true;
    else if (sunDist < 50 + shipCollisionRadius + collisionWarnBuffer) imminent = true;

    for (const stationData of systemStations) {
        const dockPoint = stationData.group.localToWorld(stationData.dockLocalPoint.clone());
        const shipLocalPos = stationData.group.worldToLocal(pos.clone());
        const collisionRadiusSq = shipCollisionRadius * shipCollisionRadius;
        const warnRadius = shipCollisionRadius + collisionWarnBuffer;
        const warnRadiusSq = warnRadius * warnRadius;
        for (const c of stationData.colliders) {
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
        hull = Math.max(0, hull - 22 * delta);
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
        else if (fuel <= 0) warnEl.textContent = 'Out of fuel';
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
        statusEl.textContent = `Hull:${hull.toFixed(1)}% Fuel:${fuel.toFixed(1)}% Credits:${credits} Cargo:${getCargoTotal()}/${cargoCapacity} Eng:${engineLevel}`;

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
    if (dockCooldown > 0) dockCooldown = Math.max(0, dockCooldown - delta);
    updateShip(delta);
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
