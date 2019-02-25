import {Texture2D, geometry, Mesh, Material} from 'claygl';

export default class Terrain {
    constructor(shader) {
        // Seabed
        var sandTexture = new Texture2D({
            anisotropic: 8
        });
        // var sandNormalTexture = new Texture2D({
        //     anisotropic: 8
        // });
        sandTexture.load('asset/texture/sand.jpg');
        // sandNormalTexture.load('asset/texture/sand_NRM.jpg');
        var plane = new Mesh({
            geometry: new geometry.Plane({
                widthSegments: 10,
                heightSegments: 10,
                // Must mark as dynamic
                dynamic: true
            }),
            culling: false,
            material: new Material({
                shader: shader
            })
        });
        plane.material.set({
            // color: '#c9b59c',
            diffuseMap: sandTexture,
            // normalMap: sandNormalTexture,
            uvRepeat: [20, 20],
            roughness: 1
        });

        // Don't foget to generate tangents
        plane.geometry.generateTangents();

        this._plane = plane;

        const self = this;
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, img.width, img.height);
            const imgData = ctx.getImageData(0, 0, img.width, img.height);

            self._heightData = imgData.data;
            self._img = img;

            self.updateHeightmap();
        };
        img.src = 'asset/texture/terrain.jpg';
    }

    updateHeightmap(opts = {}) {
        const maxHeight = opts.maxHeight == null ? 5 : opts.maxHeight;
        const heightData = this._heightData;
        if (!heightData) {
            return;
        }

        const geometry = this._plane.geometry;
        const positions = geometry.attributes.position;

        const pos = [];
        const width = this._img.width;
        const height = this._img.height;
        for (let i = 0; i < geometry.vertexCount; i++) {
            positions.get(i, pos);
            // From -1 to 1
            let x = (pos[0] + 1) / 2;
            let y = (pos[1] + 1) / 2;
            // To width and height
            x = Math.round(x * (width - 1));
            y = Math.round(y * (height - 1));

            const idx = (y * width + x) * 4;
            const r = heightData[idx];
            // pos[2] = ((r / 255 - 0.5) * 4 + 0.5) * maxHeight
            pos[2] = 0;

            positions.set(i, pos);
        }
        geometry.generateVertexNormals();
        // geometry.generateTangents();
        geometry.dirty();
    }

    getRootNode() {
        return this._plane;
    }
}
