var qtek = require('qtek');

function PostProcessPass(shader, renderToTarget) {
    this._pass = new qtek.compositor.Pass({
        fragment: shader
    });
    if (renderToTarget) {
        this._frameBuffer = new qtek.FrameBuffer();
        this._targetTexture = new qtek.Texture2D(renderToTarget);
    }
}
PostProcessPass.prototype.setUniform = function (key, val) {
    this._pass.setUniform(key, val);
};
PostProcessPass.prototype.getUniform = function (key) {
    return this._pass.getUniform(key);
};

PostProcessPass.prototype.render = function (renderer) {
    if (this._frameBuffer) {
        this._frameBuffer.attach(renderer.gl, this._targetTexture);
    }
    this._pass.render(renderer, this._frameBuffer);
};
PostProcessPass.prototype.resize = function (width, height) {
    if (this._targetTexture) {
        if (this._targetTexture.width !== width ||
            this._targetTexture.height !== height
        ) {
            this._targetTexture.width = width;
            this._targetTexture.height = height;
            this._targetTexture.dirty();
        }
    }
};
PostProcessPass.prototype.getTargetTexture = function () {
    return this._targetTexture;
};
PostProcessPass.prototype.getShader = function () {
    return this._pass.material.shader;
};

module.exports = PostProcessPass;