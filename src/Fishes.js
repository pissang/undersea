var qtek = require('qtek');
var Boid = require('./Boid');

function Fishes() {
    this._rootNode = new qtek.Node();
    this._boids = [];

    var self = this;

    // Scene objects
    var loader = new qtek.loader.GLTF({
        rootNode: new qtek.Node()
    });
    loader.success(function (result) {
        result.rootNode.traverse(function (node) {
            if (node.material) {
                node.material.linear = true;
            }
        });
        for (var i = 0; i < 700; i++) {
            var boid = new Boid();
            boid.position.x = Math.random() * 200 - 100;
            boid.position.y = Math.random() * 80 - 40;
            boid.position.z = Math.random() * 120 - 60;
            boid.velocity.x = Math.random() * 0.2 - 0.1;
            boid.velocity.y = Math.random() * 0.2 - 0.1;
            boid.velocity.z = Math.random() * 0.2 - 0.1;
            boid.setAvoidWalls( true );
            boid.setWorldSize( 260, 100, 160 );

            var fishClone = result.rootNode.clone();

            fishClone.scale.set(0.01, 0.01, 0.01);

            self._rootNode.add(fishClone);
            self._boids.push(boid);
        }
    });
    loader.load('asset/model/TropicalFish12.gltf');

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