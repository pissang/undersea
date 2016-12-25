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