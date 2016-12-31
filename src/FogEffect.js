var qtek = require('qtek');
var fogShaderCode = require('raw!./fog.glsl');
var PostProcessPass = require('./PostProcessPass');

function CausticsEffect() {
    this._pass = new PostProcessPass(fogShaderCode, {
        type: qtek.Texture.HALF_FLOAT
    });
}

CausticsEffect.prototype = {

    constructor: CausticsEffect,

    setParameter: function (name, value) {
        this._pass.setUniform(name, value);
    },

    getTargetTexture: function () {
        return this._pass.getTargetTexture();
    },

    render: function (renderer, deferredRenderer, camera, colorTexture) {
        var pass = this._pass;
        var gBuffer = deferredRenderer.getGBuffer();

        var dpr = renderer.getDevicePixelRatio();
        pass.resize(renderer.viewport.width * dpr, renderer.viewport.height * dpr);

        pass.setUniform('colorTexture', colorTexture);
        pass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        pass.setUniform('viewInv', camera.worldTransform._array);
        pass.setUniform('eyePosition', camera.getWorldPosition()._array);
        pass.setUniform('gBufferTexture2', gBuffer.getTargetTexture2());

        this._pass.render(renderer);
    }
};

module.exports = CausticsEffect;