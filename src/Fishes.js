var qtek = require('qtek');
var Boid = require('./Boid');

var fishIds = ['01', '02', '05', '07', '12', '15'];

function Fishes() {
    this._rootNode = new qtek.Node();
    this._boids = [];

    var self = this;

    var loaders = fishIds.map(function (fishId) {
        var loader = new qtek.loader.GLTF({
            rootNode: new qtek.Node()
        });
        loader.load('asset/model/TropicalFish' + fishId + '.gltf');
        return loader;
    });
    var groupTask = new qtek.async.TaskGroup();
    groupTask.all(loaders).success(function (results) {
        results.forEach(function (result, idx) {
            var normalMap = new qtek.Texture2D({
                anisotropic: 32
            });
            normalMap.load('asset/model/TropicalFish' + fishIds[idx] + '_NRM.jpg');
            result.rootNode.traverse(function (node) {
                if (node.material) {
                    node.geometry.generateTangents();
                    node.material.linear = true;
                    node.material.roughness = 0.8;
                    node.material.normalMap = normalMap;
                    node.material.diffuseMap.anisotropic = 32;
                }
                if (fishIds[idx] === '15') {
                    node.rotation.rotateY(Math.PI / 2);
                }
            });
        });
        for (var i = 0; i < 500; i++) {
            var boid = new Boid();
            boid.position.x = Math.random() * 200 - 100;
            boid.position.y = Math.random() * 80 - 40;
            boid.position.z = Math.random() * 120 - 60;
            boid.velocity.x = Math.random() * 0.2 - 0.1;
            boid.velocity.y = Math.random() * 0.2 - 0.1;
            boid.velocity.z = Math.random() * 0.2 - 0.1;
            boid.setAvoidWalls(true);
            boid.setWorldSize( 260, 100, 160 );
            boid.setMaxSteerForce(0.05);
            boid.setMaxSpeed(1);

            var randomFish = results[Math.round(Math.random() * (results.length - 1))];
            var fishClone = randomFish.rootNode.clone();

            fishClone.scale.set(0.01, 0.01, 0.01);

            self._rootNode.add(fishClone);
            self._boids.push(boid);
        }
    })

    this._rootNode.position.y = 100;
}

Fishes.prototype.update = function (dTime) {
    var boids = this._boids;
    for (var i = 0; i < boids.length; i++) {
		boid = boids[ i ];
        boid.run(boids);

        var fish = this._rootNode.childAt(i);
        fish.rotation.identity();
        fish.rotation.rotateY(Math.atan2( - boid.velocity.z, boid.velocity.x ));
        fish.rotation.rotateZ(Math.asin( boid.velocity.y / boid.velocity.length()));
        fish.position.copy(boid.position);
    }
}

Fishes.prototype.getRootNode = function () {
    return this._rootNode;
};

Fishes.prototype.goTo = function (position, radius) {
    var boids = this._boids;
    for (var i = 0; i < boids.length; i++) {
		boid = boids[i];
        var goal = boid.__goal || (boid.__goal = new qtek.math.Vector3());
        goal.copy(position);
        var theta = (Math.random() - 0.5) * Math.PI;
        var phi = Math.random() * Math.PI * 2;

        var y = Math.sin(theta);
        var x = Math.cos(theta) * Math.sin(phi);
        var z = Math.cos(theta) * Math.cos(phi);

        var r = Math.sqrt(Math.random(), 2) * radius;
        goal.x += x * r;
        goal.y += y * r - this._rootNode.position.y;
        goal.z += z * r;

        boid.setGoal(boid.__goal);
        boid.setGoalIntensity(0.05);
    }
};

var canvas = document.createElement('canvas');
var ctx = canvas.getContext('2d');

canvas.style.position = 'absolute';
canvas.style.bottom = 0;
canvas.style.left = 0;
document.body.appendChild(canvas);
Fishes.prototype.setFormation = function (img, box) {

    canvas.width = img.width;
    canvas.height = img.height;


    ctx.drawImage(img, 0, 0, img.width, img.height);
    var imgData = ctx.getImageData(0, 0, img.width, img.height);

    var usedFish = 0;
    var boids = this._boids;

    var boxWidth = box.max.x - box.min.x;
    var boxHeight = box.max.y - box.min.y;
    var boxDepth = box.max.z - box.min.z;


    for (var i = 0; i < imgData.data.length;) {
        var x = (i / 4) % img.width;
        var y = Math.floor((i / 4) / img.width);

        var r = imgData.data[i++];
        var g = imgData.data[i++];
        var b = imgData.data[i++];
        var a = imgData.data[i++];

        if (a > 0.7 * 255) {
            var wx = (x / img.width) * boxWidth + box.min.x;
            console.log(y);
            var wy = (1 - y / img.height) * boxHeight + box.min.y - this._rootNode.position.y;
            var wz = Math.random() * boxDepth + box.min.z;

            var boid = boids[usedFish];
            var goal = boid.__goal || (boid.__goal = new qtek.math.Vector3());
            goal.set(wx, wy, wz);
            boid.setGoal(goal);
            boid.setGoalIntensity(10);

            usedFish++;
            if (usedFish >= boids.length) {
                break;
            }
        }
    }

    for (var i = usedFish; i < boids.length; i++) {
        boids[i].setGoal(null);
    }
};

module.exports = Fishes;