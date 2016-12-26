var qtek = require('qtek');
var CausticsEffect = require('./CausticsEffect');
var FogEffect = require('./FogEffect');
var BlurEffect = require('./BlurEffect');
var PostProcessPass = require('./PostProcessPass');
var Fishes = require('./Fishes');
var Terrain = require('./Terrain');
var throttle = require('lodash.throttle');

var root = document.getElementById('root');

var renderer = new qtek.Renderer({
    // devicePixelRatio: 1
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

var fxaaPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.fxaa'));
fxaaPass.setUniform('texture', tonemappingPass.getTargetTexture());

var animation = new qtek.animation.Animation();
animation.start();

var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    far: 1000
});
var control = new qtek.plugin.OrbitControl({
    target: camera,
    domElement: renderer.canvas
});

var terrain = new Terrain();
var plane = terrain.getRootNode();
plane.rotation.rotateX(-Math.PI / 2);
plane.castShadow = false;
scene.add(plane);

var fishes = new Fishes();
scene.add(fishes.getRootNode());

// setTimeout(function () {
//     fishes.setGoalAround(new qtek.math.Vector3(0, 40, 0), 10);
// }, 2000)

camera.position.set(0, 60, 80);
// camera.lookAt(new qtek.math.Vector3(0, 30, 0));

var causticsLight = causticsEffect.getLight();
causticsLight.intensity = 1;
causticsLight.position.set(0, 10, 1);
causticsLight.lookAt(scene.position);
causticsLight.shadowResolution = 2048;
causticsLight.shadowCascade = 2;

animation.on('frame', function (frameTime) {
    control.update(frameTime);
    fishes.update(frameTime);

    causticsEffect.update(frameTime / 1000);
    // renderer.render(scene, camera);
    deferredRenderer.render(renderer, scene, camera, true);
    fogEffect.render(renderer, deferredRenderer, camera, deferredRenderer.getTargetTexture());
    blurEffect.render(renderer, deferredRenderer, camera, fogEffect.getTargetTexture());

    tonemappingPass.render(renderer);
    // fxaaPass.render(renderer);
    // deferredRenderer.shadowMapPass.renderDebug(renderer);
});
deferredRenderer.on('lightaccumulate', function () {
    causticsEffect.render(renderer, deferredRenderer, camera);
});
deferredRenderer.on('beforelightaccumulate', function () {
    causticsEffect.prepareShadow(renderer, deferredRenderer, scene, camera);
});

function resize() {
    renderer.resize(root.clientWidth, root.clientHeight);
    camera.aspect = renderer.getViewportAspect();
}

resize();

window.addEventListener('resize', resize);


var plane = new qtek.math.Plane();
var setGoalAround = throttle(function (e) {
    var v2 = renderer.screenToNdc(e.offsetX, e.offsetY);
    var ray = camera.castRay(v2);
    plane.normal.copy(camera.worldTransform.z);
    plane.distance = 0;

    var out = ray.intersectPlane(plane);
    fishes.setGoalAround(out, 10);
}, 500);
window.addEventListener('mousemove', setGoalAround);

var config = {
    causticsIntensity: 3,
    causticsScale: 1.7,

    fogDensity: 0.2,
    fogColor: [36,95,85],
    sceneColor: [144,190,200],
    ambientIntensity: 0.8,

    blurNear: 40,
    blurFar: 150
    // sunIntensity: 1
};

function update() {
    fogEffect.setParameter('fogDensity', config.fogDensity);
    fogEffect.setParameter('sceneColor', config.sceneColor.map(function (col) {
        return col / 255;
    }));
    fogEffect.setParameter('fogColor', config.fogColor.map(function (col) {
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

var gui = new dat.GUI();
gui.remember(config);
gui.add(config, 'fogDensity', 0, 1).onChange(update);
gui.addColor(config, 'fogColor').onChange(update);
gui.addColor(config, 'sceneColor').onChange(update);
gui.add(config, 'causticsIntensity', 0, 4).onChange(update);
gui.add(config, 'causticsScale', 0, 8).onChange(update);
gui.add(config, 'ambientIntensity', 0, 1).onChange(update);

gui.add(config, 'blurNear', 0, 200).onChange(update);
gui.add(config, 'blurFar', 0, 500).onChange(update);

update();