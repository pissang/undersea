var qtek = require('qtek');
var CausticsEffect = require('./CausticsEffect');
var FogEffect = require('./FogEffect');
var BlurEffect = require('./BlurEffect');

var root = document.getElementById('root');

var renderer = new qtek.Renderer({
    devicePixelRatio: 1
});
root.appendChild(renderer.canvas);

var deferredRenderer = new qtek.deferred.Renderer();
var causticsEffect = new CausticsEffect();
var fogEffect = new FogEffect();
var blurEffect = new BlurEffect();

var animation = new qtek.animation.Animation();
animation.start();

var scene = new qtek.Scene();
var camera = new qtek.camera.Perspective({
    far: 10000
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
        uvRepeat: [10, 10]
    })
});
// Don't foget to generate tangents
plane.geometry.generateTangents();
plane.scale.set(500, 500, 1);
plane.rotation.rotateX(-Math.PI / 2);
scene.add(plane);

// Scene objects
var sphereGeo = new qtek.geometry.Sphere();
for (var i = 0; i < 50; i++) {
    var sphere = new qtek.Mesh({
        geometry: sphereGeo,
        material: new qtek.StandardMaterial()
    });
    sphere.scale.set(10, 10, 10);
    sphere.position.set(
        (Math.random() - 0.5) * 400,
        (Math.random() - 0) * 100,
        (Math.random() - 0.5) * 400
    );

    scene.add(sphere);
}


camera.position.set(0, 30, 100);
camera.lookAt(scene.position);

var causticsLight = causticsEffect.getLight();
causticsLight.intensity = 2;
causticsLight.position.set(0, 10, 1);
causticsLight.lookAt(scene.position);

animation.on('frame', function (frameTime) {
    control.update(frameTime);

    causticsEffect.update(frameTime / 1000);
    // renderer.render(scene, camera);
    deferredRenderer.render(renderer, scene, camera, true);
    fogEffect.render(renderer, deferredRenderer, camera, deferredRenderer.getTargetTexture());
    blurEffect.render(renderer, deferredRenderer, camera, fogEffect.getTargetTexture());
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
    causticsIntensity: 1,
    causticsScale: 4,

    fogDensity: 0.2,
    fogColor: [40,47,100],
    sceneColor: [98,104,185],
    ambientIntensity: 1.5,
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
    ])

    // causticsLight.intensity = config.sunIntensity;

}

var gui = new dat.GUI();
gui.remember(config);
gui.add(config, 'fogDensity', 0, 1).onChange(update);
gui.addColor(config, 'fogColor').onChange(update);
gui.addColor(config, 'sceneColor').onChange(update);
gui.add(config, 'causticsIntensity', 0, 4).onChange(update);
gui.add(config, 'causticsScale', 0, 20).onChange(update);
gui.add(config, 'ambientIntensity', 0, 2).onChange(update);
// gui.add(config, 'sunIntensity', 0, 5).onChange(update);

update();