import {
    application,
    camera as clayCamera,
    util as clayUtil,
    BoundingBox,
    Vector3,
    Shader,
    Node as clayNode,
    Mesh,
    Material,
    plugin,
    Texture2D,
    Texture,
    TextureCube,
    geometry as clayGeometry,
    Plane
} from 'claygl';
import Fishes from './Fishes';
import Terrain from './Terrain';
import loadModel from './loadModel';
import throttle from 'lodash.throttle';

Shader.import(require('raw-loader!./waterplane.glsl'));
Shader.import(require('raw-loader!./forward_caustics.glsl'));

const causticsShader = new Shader(
    Shader.source('forward_caustics.vertex'),
    Shader.source('forward_caustics.fragment')
);

var config = {

    causticsIntensity: 3,
    causticsScale: 1,

    fogDensity: 0.14,
    fogColor0: [36, 95, 85],
    fogColor1: [36, 50, 95],

    sceneColor: [144, 190, 200],
    ambientIntensity: 0.2,

    cameraAcceleration: 0.0002,
    cameraMaxSpeed: 1
};

application.create(document.getElementById('main'), {

    width: window.innerWidth,
    height: window.innerHeight,

    graphic: {
        tonemapping: true,
        linear: true,
        shadow: true
    },

    init(app) {
        const camera = app.createCamera([0, 50, 150], [0, 50, -1]);
        camera.far = 3000;
        this._camera = camera;
        this._cameraSpeed = new Vector3();
        this._cameraAcceleration = new Vector3();
        setInterval(() => {
            const fishesCenter = this._fishes.getCenter();
            if (fishesCenter) {
                this._cameraAcceleration = fishesCenter.sub(this._camera.position);
                this._cameraAcceleration.scale(config.cameraAcceleration);
            }
        }, 100);

        const terrain = new Terrain(causticsShader);
        const terrainPlane = terrain.getRootNode();
        terrainPlane.scale.set(1000, 1000, 1);
        terrainPlane.rotation.rotateX(-Math.PI / 2);
        terrainPlane.castShadow = false;
        app.scene.add(terrainPlane);
        app.scene.scale.set(0.1, 0.1, 0.1);

        const fishes = new Fishes(causticsShader, function () {
            const box = new BoundingBox();
            box.min.set(-500, 0, -500);
            box.max.set(500, 120, 500);
            fishes.setWorldSize(box);
            fishes.randomPositionInBox(box);
        });
        this._fishes = fishes;

        app.scene.add(fishes.getRootNode());
        this._loadWhale(app);

        this._createWaterPlane(app);

        const control = new plugin.FreeControl({
            target: camera,
            timeline: app.timeline,
            domElement: app.renderer.canvas
        });

        var causticsLight = app.createDirectionalLight([0, -10, -7], '#fff', 1.8);
        causticsLight.shadowResolution = 2048;
        causticsLight.shadowBias = 0.005;
        causticsLight.shadowCascade = 1;
        causticsLight.cascadeSplitLogFactor = 0.5;

        this._light = causticsLight;

        this._ambientLight = app.createAmbientLight('#fff', config.ambientIntensity);

        this._causticsTexture = new Texture2D({
            anisotropic: 8
        });
        this._causticsTexture.load('asset/texture/caustics.png');

        const cube = app.createCubeInside({
            shader: causticsShader
        });
        cube.scale.set(1000, 1000, 1000);
        cube.castShadow = false;

        const plane = new Plane();
        const setGoalAround = throttle(function (x, y) {
            const v2 = app.renderer.screenToNDC(x, y);
            const ray = camera.castRay(v2);
            plane.normal.copy(camera.worldTransform.z);
            plane.distance = -10;

            const out = ray.intersectPlane(plane);
            fishes.goTo(out, 10);
        }, 500);

        document.body.addEventListener('mousemove', function (e) {
            // setGoalAround(e.clientX, e.clientY);
        });
    },

    _loadWhale(app) {
        // Whale
        loadModel('asset/model/whale/whale-anim.gltf', {
            rootNode: new clayNode(),
            shader: causticsShader
        }).then(result => {
            const moveNode = new clayNode();
            result.rootNode.scale.set(10, 10, 10);
            result.rootNode.rotation.rotateY(-Math.PI / 4);
            moveNode.add(result.rootNode);
            app.scene.add(moveNode);

            let meshNeedsSplit = null;
            result.rootNode.traverse(function (mesh) {
                if (mesh.joints && mesh.joints.length) {
                    meshNeedsSplit = mesh;
                }
            });
            clayUtil.mesh.splitByJoints(meshNeedsSplit, 15, true);

            const oldPosition = new Vector3(-300, 20, -200);
            const dir = new Vector3();
            app.timeline.animate(moveNode.position, { loop: true })
                .when(0, {
                    x: -400, y: 20, z: -200
                })
                .when(13000, {
                    x: 400, y: 30, z: -200
                })
                .when(15000, {
                    x: 400, y: 30, z: -10
                })
                .when(22000, {
                    x: 0, y: 40, z: 0
                })
                .when(29000, {
                    x: -400, y: 30, z: -10
                })
                .when(31000, {
                    x: -400, y: 20, z: -200
                })
                .during(function () {
                    Vector3.sub(dir, moveNode.position, oldPosition);
                    if (dir.len()) {
                        moveNode.lookAt(oldPosition, Vector3.UP);
                        moveNode.y += 40;
                        // TODO
                        moveNode.scale.set(1, 1, 1);
                    }
                    oldPosition.copy(moveNode.position);
                })
                .start('spline');

            app.timeline.addClip(result.clips[0]);
        });
    },

    _createWaterPlane(app) {
        const waterPlane = new Mesh({
            geometry: new clayGeometry.Plane(),
            material: new Material({
                shader: new Shader(Shader.source('waterplane.vertex'), Shader.source('waterplane.fragment'))
            }),
            culling: false,
            castShadow: false
        });
        waterPlane.material.define('fragment', 'SRGB_DECODE');
        waterPlane.geometry.generateTangents();
        waterPlane.position.y = 120;
        waterPlane.scale.set(1000, 1000, 1);
        waterPlane.rotation.rotateX(Math.PI / 2);
        waterPlane.update();

        app.scene.add(waterPlane);

        const cubemap = new TextureCube();
        cubemap.load({
            px: 'asset/texture/skybox/px.jpg',
            nx: 'asset/texture/skybox/nx.jpg',
            py: 'asset/texture/skybox/py.jpg',
            ny: 'asset/texture/skybox/ny.jpg',
            pz: 'asset/texture/skybox/pz.jpg',
            nz: 'asset/texture/skybox/nz.jpg'
        });
        const normalMap = new Texture2D({
            anisotropic: 8
        });
        normalMap.load('asset/texture/waternormals.jpg');
        waterPlane.material.set('uvRepeat', [100, 100]);

        waterPlane.material.set({
            environmentMap: cubemap,
            normalMap: normalMap
        });
    },

    loop(app) {
        this._fishes.update(app.frameTime);

        const lightViewMatrix = this._light.worldTransform.clone().invert();

        function normalizeColor(color) {
            return [color[0] / 255, color[1] / 255, color[2] / 255];
        }

        app.scene.traverse(mesh => {
            if (mesh.material) {
                mesh.material.set('lightViewMatrix', lightViewMatrix.array);
                mesh.material.set('causticsTexture', this._causticsTexture);
                mesh.material.set('elapsedTime', app.elapsedTime / 1000);


                mesh.material.set('sceneColor', normalizeColor(config.sceneColor));
                mesh.material.set('fogColor0', normalizeColor(config.fogColor0));
                mesh.material.set('fogColor1', normalizeColor(config.fogColor1));
                mesh.material.set('fogDensity', config.fogDensity);
                mesh.material.set('fogRange', 4);

                mesh.material.set('causticsScale', config.causticsScale);
                mesh.material.set('causticsIntensity', config.causticsIntensity);
            }
        });

        this._cameraSpeed.add(this._cameraAcceleration);
        if (this._cameraSpeed.len() > 0) {
            this._cameraSpeed.scale(Math.max(config.cameraMaxSpeed / this._cameraSpeed.len()), 1);

            const newPos = this._camera.position.clone().add(this._cameraSpeed);
            this._camera.lookAt(newPos, Vector3.UP);
            this._camera.position.copy(newPos);
        }
    }
});
