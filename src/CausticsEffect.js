var qtek = require('qtek');
var causticsShaderCode = require('raw!./caustics.glsl');


function CausticsEffect() {

    this._light = new qtek.light.Directional({
        // Not mark self as caustics light, not render in the deferred renderer.
        type: 'CAUSTICS_LIGHT'
    });

    this._pass = new qtek.compositor.Pass({
        fragment: causticsShaderCode,
        blendWithPrevious: true
    });
    this._pass.material.blend = function (gl) {
        gl.blendEquation(gl.FUNC_ADD);
        gl.blendFunc(gl.ONE, gl.ONE);
    };
    // depth buffer has been cleared, why still needs this ?
    this._pass.material.depthMask = false;

    this._causticsTexture = new qtek.Texture2D({
        anisotropic: 8,
        wrapS: qtek.Texture.REPEAT,
        wrapT: qtek.Texture.REPEAT
    });
    this._causticsTexture.load('asset/texture/caustics.png');

    this._pass.setUniform('causticsTexture', this._causticsTexture);

    this._time = 0;
}

CausticsEffect.prototype = {

    constructor: CausticsEffect,

    getLight: function () {
        return this._light;
    },

    update: function (deltaTime) {
        this._time += deltaTime;
        this._pass.setUniform('time', this._time);
    },

    setParameter: function (name, value) {
        this._pass.setUniform(name, value);
    },

    prepareShadow: function (forwardRenderer, deferredRenderer, scene, camera) {
        if (!deferredRenderer.shadowMapPass || !this._light.castShadow) {
            this._pass.material.shader.unDefine('fragment', 'SHADOWMAP_ENABLED')
            return;
        }

        shadowCasters = this._shadowCasters || (this._shadowCasters = []);
        var count = 0;
        var queue = scene.opaqueQueue;
        for (var i = 0; i < queue.length; i++) {
            if (queue[i].castShadow) {
                shadowCasters[count++] = queue[i];
            }
        }
        shadowCasters.length = count;

        var shadowMaps = [];
        var lightMatrices = [];
        var cascadeClips = [];

        forwardRenderer.gl.clearColor(1, 1, 1, 1);

        deferredRenderer.shadowMapPass.renderDirectionalLightShadow(
            forwardRenderer, scene, camera, this._light, shadowCasters, cascadeClips, lightMatrices, shadowMaps
        );
        var cascadeClipsNear = cascadeClips.slice();
        var cascadeClipsFar = cascadeClips.slice();
        cascadeClipsNear.pop();
        cascadeClipsFar.shift();

        // Iterate from far to near
        cascadeClipsNear.reverse();
        cascadeClipsFar.reverse();
        lightMatrices.reverse();

        this._pass.material.shader.define('fragment', 'SHADOWMAP_ENABLED');
        this._pass.material.shader.define('fragment', 'SHADOW_CASCADE', this._light.shadowCascade);

        this._pass.material.setUniform('lightShadowMap', shadowMaps[0]);
        this._pass.material.setUniform('lightMatrices', lightMatrices);
        this._pass.material.setUniform('shadowCascadeClipsNear', cascadeClipsNear);
        this._pass.material.setUniform('shadowCascadeClipsFar', cascadeClipsFar);

        this._pass.material.setUniform('lightShadowMapSize', this._light.shadowResolution);
    },

    render: function (forwardRenderer, deferredRenderer, camera) {
        var light = this._light;
        light.update(true);

        var pass = this._pass;
        var gBuffer = deferredRenderer.getGBuffer();

        var uTpl = light.uniformTemplates;

        var viewProjectionInv = new qtek.math.Matrix4();
        qtek.math.Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);
        var eyePosition = camera.getWorldPosition()._array;

        var lightView = new qtek.math.Matrix4();
        qtek.math.Matrix4.invert(lightView, light.worldTransform);


        pass.setUniform('eyePosition', eyePosition);
        pass.setUniform('viewProjectionInv', viewProjectionInv._array);

        pass.setUniform('lightColor', uTpl.directionalLightColor.value(light));
        pass.setUniform('lightDirection', uTpl.directionalLightDirection.value(light));

        pass.setUniform('gBufferTexture1', gBuffer.getTargetTexture1());
        pass.setUniform('gBufferTexture2', gBuffer.getTargetTexture2());
        pass.setUniform('gBufferTexture3', gBuffer.getTargetTexture3());

        this._pass.render(forwardRenderer);
    }
};

module.exports = CausticsEffect;