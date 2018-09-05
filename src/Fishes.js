import {Node as clayNode, Vector3, Texture2D} from 'claygl';
import loadModel from './loadModel';
import Boid from './Boid';

const fishIds = ['01', '02', '05', '07', '12'];

export default class Fishes {
    constructor(shader, cb) {
        this._rootNode = new clayNode();
        this._boids = [];

        Promise.all(fishIds.map(function (fishId) {
            return loadModel('asset/model/TropicalFish' + fishId + '.gltf', {
                shader: shader,
                rootNode: new clayNode()
            });
        })).then(results => {
            results.forEach(function (result, idx) {
                const normalMap = new Texture2D({
                    anisotropic: 32
                });
                normalMap.load('asset/model/TropicalFish' + fishIds[idx] + '_NRM.jpg');
                result.rootNode.traverse(function (mesh) {
                    if (mesh.material) {
                        mesh.geometry.generateTangents();
                        mesh.material.set({
                            roughness: 0.8
                        });
                        mesh.material.get('diffuseMap').anisotropic = 8;
                        mesh.material.normalMap = normalMap;
                    }
                    if (fishIds[idx] === '15') {
                        mesh.rotation.rotateY(Math.PI / 2);
                    }
                });
            });
            for (let i = 0; i < 500; i++) {
                const boid = new Boid();
                boid.velocity.x = Math.random() * 0.2 - 0.1;
                boid.velocity.y = Math.random() * 0.2 - 0.1;
                boid.velocity.z = Math.random() * 2 - 1;
                boid.setAvoidWalls(false);
                boid.setMaxSteerForce(0.1);
                boid.setMaxSpeed(1);

                const randomFish = results[Math.round(Math.random() * (results.length - 1))];
                const fishClone = randomFish.rootNode.clone();

                fishClone.scale.set(0.01, 0.01, 0.01);

                this._rootNode.add(fishClone);
                this._boids.push(boid);
            }
            cb && cb();
        });
    }

    getRootNode() {
        return this._rootNode;
    }

    randomPositionInBox(box) {
        this._boids.forEach(boid => {
            boid.position.x = Math.random() * (box.max.x - box.min.x) + box.min.x;
            boid.position.y = Math.random() * (box.max.y - box.min.y) + box.min.y - this._rootNode.position.y;
            boid.position.z = Math.random() * (box.max.z - box.min.z) + box.min.z;
        }, this);
    }

    setWorldSize(box) {
        const width = box.max.x - box.min.x;
        const height = box.max.y - box.min.y;
        const depth = box.max.z - box.min.z;

        if (width && height && depth) {
            this._boids.forEach(boid => {
                boid.setWorldSize(width, height, depth);
                boid.setAvoidWalls(true);
            });
        }
        else {
            this._boids.forEach(boid => {
                boid.setAvoidWalls(false);
            });
        }

        // PENDING
        this._rootNode.position.y = height + box.min.y;
    }

    update(dTime) {
        const boids = this._boids;
        const z = new Vector3(0, 0, 1);
        const dir = new Vector3();
        for (let i = 0; i < boids.length; i++) {
            const boid = boids[i];
            boid.run(boids);

            const fish = this._rootNode.childAt(i);
            Vector3.normalize(dir, boid.velocity);
            if (dir.len() > 0.01) {
                fish.rotation.rotationTo(z, dir);
            }
            // fish.rotation.identity();
            // fish.rotation.rotateY(Math.atan2(-boid.velocity.z, boid.velocity.x));
            // fish.rotation.rotateX(Math.asin(boid.velocity.y / boid.velocity.len()));
            fish.position.copy(boid.position);
        }
    }

    goTo(position, radius) {
        const boids = this._boids;
        for (const i = 0; i < boids.length; i++) {
            const boid = boids[i];
            const goal = boid.__goal || (boid.__goal = new Vector3());
            goal.copy(position);
            const theta = (Math.random() - 0.5) * Math.PI;
            const phi = Math.random() * Math.PI * 2;

            const y = Math.sin(theta);
            const x = Math.cos(theta) * Math.sin(phi);
            const z = Math.cos(theta) * Math.cos(phi);

            const r = Math.sqrt(Math.random(), 2) * radius;
            goal.x += x * r;
            goal.y += y * r - this._rootNode.position.y;
            goal.z += z * r;

            boid.setGoal(boid.__goal);
            boid.setGoalIntensity(0.02);
        }
    }
}