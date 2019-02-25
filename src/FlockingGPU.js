import {
    Texture2D,
    Texture,
    compositor,
    FrameBuffer,
    Shader,
    Vector3
} from 'claygl';

import glslCode from './flocking.glsl';

Shader.import(glslCode);

export default class FlockingGPU {
    constructor(fishCount) {

        const size = Math.ceil(Math.sqrt(fishCount));
        const params = {
            width: size,
            height: size,
            type: Texture.FLOAT
        };

        this._texVel1 = new Texture2D(params);
        this._texVel2 = new Texture2D(params);
        this._texPos1 = new Texture2D(params);
        this._texPos2 = new Texture2D(params);

        this._frameBuffer = new FrameBuffer({
            depthBuffer: false
        });

        this._velPass = new compositor.Pass({
            fragment: 'flocking.velocity'
        });
        this._posPass = new compositor.Pass({
            fragment: 'flocking.position'
        });
    }

    randomInitInBox(box) {

    }

    update(renderer) {

        const fb = this._frameBuffer;

        fb.bind(renderer);
        fb.attach(this._texVel2);
        this._velPass.setUniform('texturePosition', this._texPos1);
        this._velPass.setUniform('textureVelocity', this._texVel1);
        this._velPass.render(renderer);

        fb.attach(this._texPos2);
        this._posPass.setUniform('texturePosition', this._texPos1);
        this._posPass.setUniform('textureVelocity', this._texVel2);
        this._posPass.render(renderer);
        fb.unbind(renderer);

        // Swap textures
        let tmp = this._texVel1;
        this._texVel1 = this._texVel2;
        this._texVel2 = tmp;

        tmp = this._texPos1;
        this._texPos1 = this._texPos2;
        this._texPos2 = tmp;
    }

    getTexture() {
        return this._texPos1;
    }

    getCenter(renderer) {
        return new Vector3();
    }
}