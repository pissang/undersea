// https://github.com/spacejack/terra

import {Mesh, Shader, Material, Geometry, Texture2D} from 'claygl';
import SimplexNoise from 'simplex-noise';

import grassGlslCode from './grass.glsl';

Shader.import(grassGlslCode);

const BLADE_SEGS = 4; // # of blade segments
const BLADE_VERTS = (BLADE_SEGS + 1) * 2; // # of vertices per blade (1 side)
const BLADE_INDICES = BLADE_SEGS * 12;
const BLADE_WIDTH = 1;
const BLADE_HEIGHT_MIN = 50;
const BLADE_HEIGHT_MAX = 200.0;

/**
 * Sets up indices for single blade mesh.
 * @param id array of indices
 * @param vc1 vertex start offset for front side of blade
 * @param vc2 vertex start offset for back side of blade
 * @param i index offset
 */
function initBladeIndices(id, numBlades) {
    let n = 0;
    let vtx = 0;
    for (let k = 0; k < numBlades; k++) {
        let seg;
        // blade front side
        for (seg = 0; seg < BLADE_SEGS; ++seg) {
            id[n++] = vtx + 0; // tri 1
            id[n++] = vtx + 1;
            id[n++] = vtx + 2;
            id[n++] = vtx + 2; // tri 2
            id[n++] = vtx + 1;
            id[n++] = vtx + 3;
        }
        // blade back side
        for (seg = 0; seg < BLADE_SEGS; ++seg) {
            id[n++] = vtx + 2; // tri 1
            id[n++] = vtx + 1;
            id[n++] = vtx + 0;
            id[n++] = vtx + 3; // tri 2
            id[n++] = vtx + 1;
            id[n++] = vtx + 2;
        }

        vtx += BLADE_VERTS;
    }
}

/** Set up shape variations for each blade of grass */
function initBladeShapeVerts(shape, numBlades, offset) {
    const simplex = new SimplexNoise();
    let noise = 0;
    let n = 0;
    for (let i = 0; i < numBlades; ++i) {
        noise = Math.abs(simplex.noise2D(offset[i*4+0] * 0.03, offset[i*4+1] * 0.03));
        noise = noise * noise * noise;
        noise *= 5.0;
        const width = BLADE_WIDTH + Math.random() * BLADE_WIDTH * 0.5;
        const height = BLADE_HEIGHT_MIN + Math.pow(Math.random(), 4.0) * (BLADE_HEIGHT_MAX - BLADE_HEIGHT_MIN) + noise;
        const lean = Math.random() * 0.3;
        const curve = 0.05 + Math.random() * 0.3;
        for (let k = 0; k < BLADE_VERTS; k++) {
            shape[n++] = width;
            shape[n++] = height;
            shape[n++] = lean;
            shape[n++] = curve;
        }
    }
}

/** Set up positons & rotation for each blade of grass */
function initBladeOffsetVerts(offset, numBlades, patchRadius) {
    let n = 0;
    for (let i = 0; i < numBlades; ++i) {
        const x = (Math.random() * 2 - 1) * patchRadius;
        const y = (Math.random() * 2 - 1) * patchRadius;;
        const rot = Math.PI * 2.0 * Math.random();
        for (let k = 0; k < BLADE_VERTS; k++) {
            offset[n++] = x;
            offset[n++] = y;
            offset[n++] = 0;
            offset[n++] = rot;
        }
    }
}

/** Set up indices for 1 blade */
function initBladeIndexVerts(vindex, numBlades) {
    let n = 0;
    for (let k = 0; k < numBlades; k++) {
        for (let i = 0; i < BLADE_VERTS; ++i) {
            vindex[n++] = i;
        }
    }
}
export default class Grass {
    constructor(opts = {}) {
        const numBlades = opts.numBlades || 6e3;
        const windIntensity = opts.windIntensity || 1.5;
        const radius = this._radius = opts.radius || 200;

        const mesh = this._mesh = new Mesh({
            castShadow: false,
            geometry: new Geometry({
                attributes: {
                    vindex: new Geometry.Attribute('vindex', 'float', 1),
                    offset: new Geometry.Attribute('offset', 'float', 4),
                    shape: new Geometry.Attribute('shape', 'float', 4)
                }
            }),
            material: new Material({
                shader: new Shader(
                    Shader.source('grass.vertex'),
                    Shader.source('caustics.fragment')
                )
            })
        });
        const geo = mesh.geometry;
        geo.attributes.offset.init(numBlades * BLADE_VERTS);
        geo.attributes.shape.init(numBlades * BLADE_VERTS);
        geo.attributes.vindex.init(numBlades * BLADE_VERTS);
        geo.indices = new Uint16Array(BLADE_INDICES * numBlades);

        initBladeIndices(geo.indices, numBlades);
        initBladeOffsetVerts(geo.attributes.offset.value, numBlades, radius);
        initBladeShapeVerts(geo.attributes.shape.value, numBlades, geo.attributes.offset.value);
        initBladeIndexVerts(geo.attributes.vindex.value, numBlades);

        const mat = mesh.material;
        mat.set('windIntensity', windIntensity);
        mat.set('heightMapScale', [1, 1, 4]);   // TODO
        mat.set('color', [0.45 * 3, 0.46 * 3, 0.19 * 3]);

        mat.define('vertex', 'PATCH_SIZE', radius * 2);
        mat.define('vertex', 'BLADE_SEGS', BLADE_SEGS);
        mat.define('vertex', 'TRANSITION_LOW', opts.transitionLow || 0.31);
        mat.define('vertex', 'TRANSITION_HIGH', opts.transitionHigh || 0.36);
        mat.define('vertex', 'BLADE_HEIGHT_TALL', BLADE_HEIGHT_MAX);
        mat.define('vertex', 'BLADE_DIVS', BLADE_SEGS + 1);
        mat.define('vertex', 'BLADE_VERTS', (BLADE_SEGS + 1) * 2);

        mat.define('VERTEX_COLOR');

        const heightMap = new Texture2D();
        heightMap.load('asset/texture/terrain.jpg');
        const diffuseMap = new Texture2D();
        diffuseMap.load('asset/texture/grass.jpg');
        mat.set('diffuseMap', diffuseMap);
        mat.set('heightMap', heightMap);

        this._elapsedTime = 0;
    }

    getMesh() {
        return this._mesh;
    }

    update(time, camera) {
        this._elapsedTime += time;
        const mesh = this._mesh;
        const mat = mesh.material;
        const forward = camera.worldTransform.z.clone().normalize().negate();
        mat.set('time', this._elapsedTime / 1000);
        const drawPos = camera.position.clone().scaleAndAdd(forward, this._radius);
        mat.set(
            'drawPos',
            [drawPos.x, drawPos.z]
        );
    }
};