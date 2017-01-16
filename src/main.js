var qtek = require('qtek');
var CausticsEffect = require('./CausticsEffect');
var FogEffect = require('./FogEffect');
var BlurEffect = require('./BlurEffect');
var PostProcessPass = require('./PostProcessPass');
var Fishes = require('./Fishes');
var Terrain = require('./Terrain');
var throttle = require('lodash.throttle');
var AlchemyAOPass = require('./AlchemyAOPass');
var stereoCamera = new qtek.vr.StereoCamera();

qtek.Shader.import(require('raw!./waterplane.glsl'));

var root = document.getElementById('root');

var renderer = new qtek.Renderer({
    // devicePixelRatio: 1,
    // preserveDrawingBuffer: true
});

root.appendChild(renderer.canvas);

var deferredRenderer = new qtek.deferred.Renderer({
    shadowMapPass: new qtek.prePass.ShadowMap(),
    autoResize: false
});
// var alchemyAoPass = new AlchemyAOPass({
//     gBuffer: deferredRenderer.getGBuffer()
// });

var causticsEffect = new CausticsEffect();
var fogEffect = new FogEffect();
var blurEffect = new BlurEffect();

var tonemappingPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.hdr.composite'), true);
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

var fxaaPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.fxaa'));
fxaaPass.setUniform('texture', tonemappingPass.getTargetTexture());

var animation = new qtek.animation.Animation();
animation.start();

var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    far: 1000
});

var terrain = new Terrain();
var plane = terrain.getRootNode();
plane.scale.set(1000, 1000, 1);
plane.rotation.rotateX(-Math.PI / 2);
plane.castShadow = false;
scene.add(plane);
scene.scale.set(0.1, 0.1, 0.1);

var fishes = new Fishes(function () {
    var box = new qtek.math.BoundingBox();
    box.min.set(-60, 0, -60);
    box.max.set(60, 40, 60);
    fishes.randomPositionInBox(box);

    fishes.setWorldSize(box);
});
scene.add(fishes.getRootNode());

camera.position.set(0, 3, 0);

var lookAtTarget = new qtek.math.Vector3(0, 25, 0);

// Coral
var loader = new qtek.loader.GLTF({
    textureRootPath: 'asset/model/coral_texture',
    rootNode: new qtek.Node(),
    useStandardMaterial: true
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
                // FIXME wrong on iphone se
                mesh.material.normalMap = null;
            }
        }
    });
});
loader.load('asset/model/coral.gltf');

// Whale
var loader = new qtek.loader.GLTF({
    rootNode: new qtek.Node(),
    useStandardMaterial: true
});
loader.success(function (result) {
    var moveNode = new qtek.Node();
    result.rootNode.scale.set(10, 10, 10);
    result.rootNode.rotation.rotateY(-Math.PI / 4);
    moveNode.add(result.rootNode);
    scene.add(moveNode);

    var meshNeedsSplit = null;
    result.rootNode.traverse(function (mesh) {
        if (mesh.material) {
            mesh.material.linear = true;
        }
        if (mesh.joints && mesh.joints.length) {
            meshNeedsSplit = mesh;
        }
    });
    qtek.util.mesh.splitByJoints(meshNeedsSplit, 20, true);

    var oldPosition = new qtek.math.Vector3(-300, 20, -200);
    var dir = new qtek.math.Vector3();
    animation.animate(moveNode.position, { loop: true })
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
            qtek.math.Vector3.sub(dir, moveNode.position, oldPosition);
            if (dir.len()) {
                qtek.math.Vector3.normalize(dir, dir);
                moveNode.update();
                moveNode.worldTransform.z = dir;
                moveNode.decomposeWorldTransform();
                // TODO
                moveNode.scale.set(1, 1, 1);
            }
            oldPosition.copy(moveNode.position);
        })
        .start('spline');

    var skeleton = result.skeletons['skin_0'];
    animation.addClip(skeleton.getClip(0));
    skeleton.getClip(0).setLoop(true);

    animation.on('frame', function () {
        skeleton.setPose(0);
    });
});
loader.load('asset/model/whale/whale-anim.gltf');

var elapsedTime = 0;
function start(vrDisplay) {
    var causticsLight = causticsEffect.getLight();
    causticsLight.position.set(0, 10, 7);
    causticsLight.lookAt(scene.position);

    causticsLight.intensity = 1.8;
    causticsLight.shadowResolution = 2048;
    causticsLight.shadowBias = 0.005;
    causticsLight.shadowCascade = 1;
    causticsLight.cascadeSplitLogFactor = 0.5;

    // causticsLight.castShadow = !vrDisplay;

    var control;
    if (!vrDisplay) {

        control = new qtek.plugin.FirstPersonControl({
            target: camera,
            domElement: renderer.canvas,
            sensitivity: 0.2,
        });

    }

    animation.on('frame', function (frameTime) {

        elapsedTime += frameTime;

        function renderEye(eyeCamera, eye) {
            deferredRenderer.render(renderer, scene, eyeCamera, {
                renderToTarget: true,
                notUpdateScene: eye === 'right',
                notUpdateShadow: eye === 'right'
            });
            // alchemyAoPass.render(renderer, eyeCamera);
            if (eye === 'left') {
                tonemappingPass.getFrameBuffer().viewport = {
                    x: 0, y: 0,
                    width: renderer.getWidth() / 2, height: renderer.getHeight(),
                    devicePixelRatio: renderer.getDevicePixelRatio()
                };
            }
            else if (eye === 'right') {
                tonemappingPass.getFrameBuffer().viewport = {
                    x: renderer.getWidth() / 2, y: 0,
                    width: renderer.getWidth() / 2, height: renderer.getHeight(),
                    devicePixelRatio: renderer.getDevicePixelRatio()
                };
            }
            tonemappingPass.render(renderer);
            fogEffect.render(renderer, deferredRenderer, eyeCamera, deferredRenderer.getTargetTexture());
            // blurEffect.render(renderer, deferredRenderer, eyeCamera, fogEffect.getTargetTexture());

            // lutPass.render(renderer);
            // deferredRenderer.shadowMapPass.renderDebug(renderer);
        }

        control && control.update(frameTime);

        fishes.update(frameTime);

        causticsEffect.update(frameTime / 1000);

        camera.update();

        var stereo = false;
        if (vrDisplay) {

            stereo = true;
            stereoCamera.updateFromVRDisplay(vrDisplay, camera);

        }
        else if (window.stereo) {

            stereo = true;
            stereoCamera.updateFromCamera(camera, 100, 1, 0.64);
        }

        if (stereo) {
            renderEye(stereoCamera.getLeftCamera(), 'left');
            renderEye(stereoCamera.getRightCamera(), 'right');
        }
        else {
            renderEye(camera, true);
        }
        // FXAA can render in one pass for both eyes
        fxaaPass.render(renderer);

        if (vrDisplay) {
            vrDisplay.submitFrame();
        }
    });

    resize((vrDisplay || window.stereo) ? 0.5 : 1);

    window.addEventListener('resize', function () {
        resize((vrDisplay || window.stereo) ? 0.5 : 1);
    });

    renderUI(vrDisplay);
}

window.stereo = location.search.match(/stereo/);

var waterShader = new qtek.Shader({
    vertex: qtek.Shader.source('waterplane.vertex'),
    fragment: qtek.Shader.source('waterplane.fragment')
});
waterShader.enableTexture(['environmentMap', 'normalMap']);
waterShader.define('fragment', 'SRGB_DECODE');
var waterPlane = new qtek.Mesh({
    geometry: new qtek.geometry.Plane(),
    material: new qtek.Material({
        shader: waterShader
    }),
    culling: false,
    castShadow: false
});
waterPlane.geometry.generateTangents();
waterPlane.position.y = 20;
waterPlane.scale.set(100, 100, 1);
waterPlane.rotation.rotateX(-Math.PI / 2);
waterPlane.update();

var cubemap = new qtek.TextureCube({
    width: 128,
    height: 128,
    // FIXME FLOAT seems wrong on iOS
    type : qtek.Texture.HALF_FLOAT
});
qtek.util.texture.loadPanorama(
    renderer,
    'asset/texture/Malibu_Overlook.hdr',
    cubemap,
    {
        exposure: 3
    }
);
var normalMap = new qtek.Texture2D({
    wrapS: qtek.Texture.REPEAT,
    wrapT: qtek.Texture.REPEAT,
    anisotropic: 32
});
normalMap.load('asset/texture/waternormals.jpg');
waterPlane.material.set('environmentMap', cubemap);
waterPlane.material.set('normalMap', normalMap);
waterPlane.material.set('uvRepeat', [10, 10]);

deferredRenderer.on('lightaccumulate', function (renderer, scene, eyeCamera) {
    causticsEffect.render(renderer, deferredRenderer, eyeCamera);

    // alchemyAoPass.output(renderer);

    // Render ocean plane
    var frameBuffer = deferredRenderer.getTargetFrameBuffer();
    frameBuffer.attach(deferredRenderer.getGBuffer().getTargetTexture2(), qtek.FrameBuffer.DEPTH_STENCIL_ATTACHMENT);
    renderer.gl.disable(renderer.gl.BLEND);
    waterPlane.material.set('time', elapsedTime / 1000);
    renderer.renderQueue([waterPlane], eyeCamera);
    frameBuffer.detach(qtek.FrameBuffer.DEPTH_STENCIL_ATTACHMENT);
});
deferredRenderer.on('beforelightaccumulate', function (renderer, scene, eyeCamera, updateShadow) {
    if (updateShadow) {
        causticsEffect.prepareShadow(renderer, deferredRenderer, scene, eyeCamera);
    }
});

function resize(scale) {

    var dpr = renderer.getDevicePixelRatio();
    renderer.resize(root.clientWidth, root.clientHeight);
    camera.aspect = renderer.getWidth() / renderer.getHeight();

    var width = renderer.getWidth() * scale * dpr;
    var height = renderer.getHeight() * dpr;

    deferredRenderer.resize(width, height);

    lutPass.resize(width, height);
    tonemappingPass.resize(width / scale, height);

    // fxaaPass.resize(width / scale, height);
}

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
    fogColor1: [36,50,95],

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
