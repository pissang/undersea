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

    render: function (forwardRenderer, deferredRenderer, camera, colorTexture) {
        var pass = this._pass;
        var gBuffer = deferredRenderer.getGBuffer();

        pass.resize(forwardRenderer.getWidth(), forwardRenderer.getHeight());

        pass.setUniform('colorTexture', colorTexture);
        pass.setUniform('projectionInv', camera.invProjectionMatrix._array);
        pass.setUniform('gBufferTexture2', gBuffer.getTargetTexture2());

        this._pass.render(forwardRenderer);
    }
};

module.exports = CausticsEffect;