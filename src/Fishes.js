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
            var normalMap = new qtek.Texture2D();
            normalMap.load('asset/model/TropicalFish' + fishIds[idx] + '_NRM.jpg');
            result.rootNode.traverse(function (node) {
                if (node.material) {
                    node.geometry.generateTangents();
                    node.material.linear = true;
                    node.material.roughness = 0.2;
                    node.material.normalMap = normalMap;
                }
                if (fishIds[idx] === '15') {
                    node.rotation.rotateY(Math.PI / 2);
                }
            });
        });
        for (var i = 0; i < 600; i++) {
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
}

module.exports = Fishes;