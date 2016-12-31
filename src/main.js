var qtek = require('qtek');
var CausticsEffect = require('./CausticsEffect');
var FogEffect = require('./FogEffect');
var BlurEffect = require('./BlurEffect');
var PostProcessPass = require('./PostProcessPass');
var Fishes = require('./Fishes');
var Terrain = require('./Terrain');
var throttle = require('lodash.throttle');
var stereoCamera = new qtek.vr.StereoCamera();

var root = document.getElementById('root');

var renderer = new qtek.Renderer({
    devicePixelRatio: 2,
    preserveDrawingBuffer: true
});

root.appendChild(renderer.canvas);

var deferredRenderer = new qtek.deferred.Renderer({
    shadowMapPass: new qtek.prePass.ShadowMap()
});
var causticsEffect = new CausticsEffect();
var fogEffect = new FogEffect();
var blurEffect = new BlurEffect();

var tonemappingPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.hdr.tonemapping'));
tonemappingPass.getShader().disableTexturesAll();
tonemappingPass.getShader().enableTexture('texture');
tonemappingPass.setUniform('texture', fogEffect.getTargetTexture());

fogEffect.setParameter('range', 4);

var lutPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.lut'), true);
// var lutTexture = new qtek.Texture2D({
//     flipY: false,
//     useMipmap: false,
//     minFilter: qtek.Texture.LINEAR,
//     magFilter: qtek.Texture.LINEAR
// });
// lutTexture.load('asset/texture/filmstock_50.png');
// lutPass.setUniform('lookup', lutTexture);
// lutPass.setUniform('texture', tonemappingPass.getTargetTexture());

// var fxaaPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.fxaa'));
// fxaaPass.setUniform('texture', tonemappingPass.getTargetTexture());

var animation = new qtek.animation.Animation();
animation.start();

var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    far: 1000
});

var terrain = new Terrain();
var plane = terrain.getRootNode();
plane.rotation.rotateX(-Math.PI / 2);
plane.castShadow = false;
scene.add(plane);
scene.scale.set(0.1, 0.1, 0.1);

var fishes = new Fishes(function () {
    var box = new qtek.math.BoundingBox();
    box.min.set(-20, 30, -10);
    box.max.set(20, 40, 10);
    fishes.randomPositionInBox(box);

    fishes.setWorldSize(100, 100, 100);
    // setTimeout(function () {
    //     fishes.goTo(new qtek.math.Vector3(0, 50, 0), 30);
    // }, 1000);
});
scene.add(fishes.getRootNode());

camera.position.set(0, 3, 8);

var lookAtTarget = new qtek.math.Vector3(0, 25, 0);
// var up = new qtek.math.Vector3(0, 1, 0);
// var animator = animation.animate(camera.position)
//     .when(10000, {
//         y: 15,
//         z: 80
//     })
//     .during(function () {
//         camera.lookAt(lookAtTarget, up);
//     })
//     .done(function () {
//         window.addEventListener('mousemove', setGoalAround);
//         fishes.setAvoidWalls(true);
//     })
//     .start('quadraticOut');

// Coral
var loader = new qtek.loader.GLTF({
    textureRootPath: 'asset/model/coral_texture',
    rootNode: new qtek.Node()
});
loader.success(function (result) {
    result.rootNode.rotation.rotateX(-Math.PI / 2);
    result.rootNode.scale.set(300, 300, 300);
    result.rootNode.position.set(-10, 5, -10);
    scene.add(result.rootNode);

    result.rootNode.traverse(function (mesh) {
        if (mesh.material) {
            mesh.material.linear = true;
            if (mesh.material.diffuseMap) {
                mesh.material.diffuseMap.wrapS = qtek.Texture.REPEAT;
                mesh.material.diffuseMap.wrapT = qtek.Texture.REPEAT;
                mesh.material.diffuseMap.dirty();
                // FIXME
                mesh.material.normalMap = null;
            }
        }
    });
});
loader.load('asset/model/coral.gltf');

function start(vrDisplay) {
    var causticsLight = causticsEffect.getLight();
    causticsLight.position.set(0, 10, 7);
    causticsLight.lookAt(scene.position);

    causticsLight.intensity = 1.8;
    causticsLight.shadowResolution = 2048;
    causticsLight.shadowCascade = 2;
    causticsLight.cascadeSplitLogFactor = 0.5;


    // causticsLight.castShadow = !vrDisplay;

    var control;
    if (!vrDisplay) {

        control = new qtek.plugin.OrbitControl({
            target: camera,
            domElement: renderer.canvas,
            sensitivity: 0.2,
        });

    }

    animation.on('frame', function (frameTime) {
        function renderEye(eyeCamera, firstEye) {
            // renderer.render(scene, camera);
            deferredRenderer.render(renderer, scene, eyeCamera, {
                renderToTarget: true,
                notUpdateScene: !firstEye,
                notUpdateShadow: !firstEye
            });
            fogEffect.render(renderer, deferredRenderer, eyeCamera, deferredRenderer.getTargetTexture());
            // blurEffect.render(renderer, deferredRenderer, eyeCamera, fogEffect.getTargetTexture());

            tonemappingPass.render(renderer);
            // lutPass.render(renderer);
            // fxaaPass.render(renderer);
            // deferredRenderer.shadowMapPass.renderDebug(renderer);
        }

        control && control.update(frameTime);

        fishes.update(frameTime);

        causticsEffect.update(frameTime / 1000);

        camera.update();
        if (vrDisplay) {

            stereoCamera.updateFromVRDisplay(vrDisplay, camera);

        }
        else {
            stereoCamera.updateFromCamera(camera, 100, 1, 0.64);
        }

        renderer.setViewport(0, 0, renderer.getWidth() / 2, renderer.getHeight());
        renderEye(stereoCamera.getLeftCamera(), true);
        renderer.setViewport(renderer.getWidth() / 2, 0, renderer.getWidth() / 2, renderer.getHeight());
        renderEye(stereoCamera.getRightCamera());

        if (vrDisplay) {
            vrDisplay.submitFrame();
        }
    });

    resize();

    renderUI(vrDisplay);
}


deferredRenderer.on('lightaccumulate', function (renderer, scene, eyeCamera) {
    causticsEffect.render(renderer, deferredRenderer, eyeCamera);
});
deferredRenderer.on('beforelightaccumulate', function (renderer, scene, eyeCamera, updateShadow) {
    if (updateShadow) {
        causticsEffect.prepareShadow(renderer, deferredRenderer, scene, eyeCamera);
    }
});

function resize() {
    var dpr = renderer.getDevicePixelRatio();
    renderer.resize(root.clientWidth, root.clientHeight);
    camera.aspect = renderer.getWidth() / renderer.getHeight();

    var scale = window.vr ? 0.5 : 1;

    lutPass.resize(renderer.getWidth() * scale * dpr, renderer.getHeight() * dpr);
    tonemappingPass.resize(renderer.getWidth() * scale * dpr, renderer.getHeight() * dpr);
    // fxaaPass.resize(renderer.getWidth() * scale * dpr, renderer.getHeight() * dpr);
}

window.addEventListener('resize', resize);

var plane = new qtek.math.Plane();
var setGoalAround = throttle(function (e) {
    if (config.text) {
        return;
    }
    var v2 = renderer.screenToNdc(e.offsetX, e.offsetY);
    var ray = camera.castRay(v2);
    plane.normal.copy(camera.worldTransform.z);
    plane.distance = 0;

    var out = ray.intersectPlane(plane);
    fishes.goTo(out, 10);
}, 500);

var canvas = document.createElement('canvas');
canvas.width = 200;
canvas.height = 30;
var ctx = canvas.getContext('2d');
ctx.fillStyle = '#fff';
function textFormation() {
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = '26px Helvetica';
    canvas.width = ctx.measureText(config.text.toUpperCase()).width;

    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.font = '26px Helvetica';
    ctx.fillText(config.text.toUpperCase(), 0, 0);

    var box = new qtek.math.BoundingBox();
    var height = 60;
    var width = height / canvas.height * canvas.width;
    box.min.set(-width / 2, 20, -2);
    box.max.set(width / 2, 20 + height, 2);
    fishes.setFormation(canvas, box);
}

var config = {
    text: '',

    causticsIntensity: 3,
    causticsScale: 0.2,

    fogDensity: 0.14,
    fogColor0: [36,95,85],
    fogColor1: [36,95,85],

    sceneColor: [144,190,200],
    ambientIntensity: 0.2,

    blurNear: 40,
    blurFar: 150
    // sunIntensity: 1
};

function renderUI(vrDisplay) {

    function update() {
        fogEffect.setParameter('fogDensity', config.fogDensity);
        fogEffect.setParameter('sceneColor', config.sceneColor.map(function (col) {
            return col / 255;
        }));
        fogEffect.setParameter('fogColor0', config.fogColor0.map(function (col) {
            return col / 255;
        }));
        fogEffect.setParameter('fogColor1', config.fogColor1.map(function (col) {
            return col / 255;
        }));

        causticsEffect.setParameter('causticsIntensity', config.causticsIntensity);
        causticsEffect.setParameter('causticsScale', config.causticsScale);

        causticsEffect.setParameter('ambientColor', [
            config.ambientIntensity,
            config.ambientIntensity,
            config.ambientIntensity
        ]);

        blurEffect.setParameter('blurNear', config.blurNear);
        blurEffect.setParameter('blurFar', config.blurFar);
    }

    if (!vrDisplay) {
        var gui = new dat.GUI();
        gui.remember(config);

        gui.add(config, 'text').onChange(textFormation);

        gui.add(config, 'fogDensity', 0, 1).onChange(update);
        gui.addColor(config, 'fogColor0').onChange(update);
        gui.addColor(config, 'fogColor1').onChange(update);
        gui.addColor(config, 'sceneColor').onChange(update);
        gui.add(config, 'causticsIntensity', 0, 10).onChange(update);
        gui.add(config, 'causticsScale', 0, 1).onChange(update);
        gui.add(config, 'ambientIntensity', 0, 1).onChange(update);

        // gui.add(config, 'blurNear', 0, 200).onChange(update);
        // gui.add(config, 'blurFar', 0, 500).onChange(update);
    }

    update();
}


if (navigator.getVRDisplays) {
    navigator.getVRDisplays().then(function (displays) {
        if (displays.length > 0)  {
            var vrDisplay = displays[0];
            vrDisplay.requestPresent({
                source: renderer.canvas
            }).then(function () {
                start(vrDisplay);
            }).catch(function () {
                console.error('VRDisplay is not capable of presenting');

                start();
            });
        }
    }).catch(function () {
        console.error('VRDisplay is not capable of presenting');

        start();
    });
}
else {
    start();
}
