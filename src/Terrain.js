var qtek = require('qtek');

function Terrain() {
    // Seabed
    var sandTexture = new qtek.Texture2D({
        anisotropic: 32,
        wrapS: qtek.Texture.REPEAT,
        wrapT: qtek.Texture.REPEAT
    });
    var sandNormalTexture = new qtek.Texture2D({
        anisotropic: 32,
        wrapS: qtek.Texture.REPEAT,
        wrapT: qtek.Texture.REPEAT
    });
    sandTexture.load('asset/texture/sand.jpg');
    sandNormalTexture.load('asset/texture/sand_NRM.png');
    var plane = new qtek.Mesh({
        geometry: new qtek.geometry.Plane({
            widthSegments: 100,
            heightSegments: 100,
            // Must mark as dynamic
            dynamic: true
        }),
        culling: false,
        material: new qtek.StandardMaterial({
            diffuseMap: sandTexture,
            // normalMap: sandNormalTexture,
            uvRepeat: [20, 20],
            linear: true,
            // TODO Seems not working
            roughness: 1
        })
    });
    // Don't foget to generate tangents
    // plane.geometry.generateTangents();
    plane.scale.set(1000, 1000, 1);

    this._plane = plane;

    var self = this;
    var img = new Image();
    img.onload = function () {
        var canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, img.width, img.height);
        var imgData = ctx.getImageData(0, 0, img.width, img.height);

        // document.body.appendChild(canvas);
        // canvas.style.position = 'absolute';
        // canvas.style.left = 0;
        // canvas.style.bottom = 0;

        self._heightData = imgData.data;
        self._img = img;

        self.updateHeightmap();
    };
    img.src = 'asset/texture/terrain.png';
}

Terrain.prototype.updateHeightmap = function (opt) {
    var heightData = this._heightData;
    if (!heightData) {
        return;
    }
    opt = opt || {};
    opt.maxHeight = opt.maxHeight == null ? 10 : opt.maxHeight;

    var geometry = this._plane.geometry;
    var positions = geometry.attributes.position;

    var pos = [];
    var width = this._img.width;
    var height = this._img.height;
    for (var i = 0; i < geometry.vertexCount; i++) {
        positions.get(i, pos);
        // From -1 to 1
        var x = (pos[0] + 1) / 2;
        var y = (pos[1] + 1) / 2;
        // To width and height
        x = Math.round(x * (width - 1));
        y = Math.round(y * (height - 1));

        var idx = (y * width + x) * 4;
        var r = heightData[idx];
        pos[2] = ((r / 255 - 0.5) * 10 + 0.5) * opt.maxHeight;

        positions.set(i, pos);
    }
    geometry.generateVertexNormals();
    // geometry.generateTangents();
    geometry.dirty();
};

Terrain.prototype.getRootNode = function () {
    return this._plane;
}

module.exports = Terrain;