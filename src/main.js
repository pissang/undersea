var qtek = require('qtek');
var CausticsEffect = require('./CausticsEffect');
var FogEffect = require('./FogEffect');
var BlurEffect = require('./BlurEffect');
var PostProcessPass = require('./PostProcessPass');
var Fishes = require('./Fishes');

var root = document.getElementById('root');

var renderer = new qtek.Renderer({
    devicePixelRatio: 1
});
root.appendChild(renderer.canvas);

var deferredRenderer = new qtek.deferred.Renderer();
var causticsEffect = new CausticsEffect();
var fogEffect = new FogEffect();
var blurEffect = new BlurEffect();

var tonemappingPass = new PostProcessPass(qtek.Shader.source('qtek.compositor.hdr.tonemapping'), true);
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
        widthSegements: 100,
        heightSegments: 100
    }),
    culling: false,
    material: new qtek.StandardMaterial({
        diffuseMap: sandTexture,
        normalMap: sandNormalTexture,
        uvRepeat: [20, 20],
        linear: true
    })
});
// Don't foget to generate tangents
plane.geometry.generateTangents();
plane.scale.set(1000, 1000, 1);
plane.rotation.rotateX(-Math.PI / 2);
scene.add(plane);

var fishes = new Fishes();
scene.add(fishes.getRootNode());

camera.position.set(0, 60, 80);
camera.lookAt(new qtek.math.Vector3(0, 30, 0));

var causticsLight = causticsEffect.getLight();
causticsLight.intensity = 2;
causticsLight.position.set(0, 10, 1);
causticsLight.lookAt(scene.position);

animation.on('frame', function (frameTime) {
    control.update(frameTime);
    fishes.update(frameTime);

    causticsEffect.update(frameTime / 1000);
    // renderer.render(scene, camera);
    deferredRenderer.render(renderer, scene, camera, true);
    fogEffect.render(renderer, deferredRenderer, camera, deferredRenderer.getTargetTexture());
    // blurEffect.render(renderer, deferredRenderer, camera, fogEffect.getTargetTexture());

    tonemappingPass.render(renderer);
    fxaaPass.render(renderer);
});
deferredRenderer.on('lightaccumulate', function () {
    causticsEffect.render(renderer, deferredRenderer, camera);
});

function resize() {
    renderer.resize(root.clientWidth, root.clientHeight);
    camera.aspect = renderer.getViewportAspect();
}

resize();

window.addEventListener('resize', resize);

var config = {
    causticsIntensity: 2,
    causticsScale: 1.7,

    fogDensity: 0.2,
    fogColor: [36,95,85],
    sceneColor: [144,190,200],
    ambientIntensity: 0.15,

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