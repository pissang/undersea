import {Node as clayNode, Vector3, Texture2D} from 'claygl';
import loadModel from './loadModel';
import Boid from './Boid';

const fishIds = ['01', '02', '05', '07', '12'];
const FISH_SCALE = 0.02;
export default class Fishes {
    constructor(shader, cb) {
        this._rootNode = new clayNode();
        this._boids = [];

        Promise.all(fishIds.map(function (fishId) {
            return loadModel('asset/model/TropicalFish' + fishId + '.json', {
                shader: shader,
                rootNode: new clayNode()
            });
        })).then(results => {
            results.forEach(function (result, idx) {
                // const normalMap = new Texture2D({
                //     anisotropic: 32
                // });
                // normalMap.load('asset/model/TropicalFish' + fishIds[idx] + '_NRM.jpg');
                result.rootNode.traverse(function (mesh) {
                    if (mesh.material) {
                        // mesh.geometry.generateTangents();
                        // mesh.material.set({
                        //     roughness: 0.2
                        // });
                        // mesh.material.get('diffuseMap').anisotropic = 8;
                        // mesh.material.normalMap = normalMap;
                        // console.log(JSON.stringify(mesh.geometry.attributes.texcoord0.value));
                    }
                    if (fishIds[idx] === '15') {
                        mesh.rotation.rotateY(Math.PI / 2);
                    }
                });
            });
            for (let i = 0; i < 200; i++) {
                const boid = new Boid();
                boid.velocity.x = Math.random() * 2 - 1;
                boid.velocity.y = Math.random() * 0.2 - 0.1;
                boid.velocity.z = Math.random() * 2 - 1;
                boid.setAvoidWalls(false);
                boid.setMaxSteerForce(0.1);
                boid.setMaxSpeed(1);

                const randomFish = results[Math.round(Math.random() * (results.length - 1))];
                const fishClone = randomFish.rootNode.clone();

                fishClone.scale.set(FISH_SCALE, FISH_SCALE, FISH_SCALE);

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
            boid.position.x = (Math.random() - 0.5) * 0.4 * (box.max.x - box.min.x);
            boid.position.y = (Math.random() - 0.5) * 0.4 * (box.max.y - box.min.y);
            boid.position.z = (Math.random() - 0.5) * 0.4 * (box.max.z - box.min.z);
        }, this);
    }

    setWorldSize(box) {
        const width = box.max.x - box.min.x;
        const height = box.max.y - box.min.y;
        const depth = box.max.z - box.min.z;

        if (width && height && depth) {
            this._boids.forEach(boid => {
                boid.setWorldSize(width / 2, height / 2, depth / 2);
                boid.setAvoidWalls(true);
            });
        }
        else {
            this._boids.forEach(boid => {
                boid.setAvoidWalls(false);
            });
        }

        // PENDING
        this._rootNode.position.y = -box.min.y + height / 2;
    }

    update(dTime, camera) {
        const boids = this._boids;
        const up = Vector3.UP;
        const target = new Vector3();
        const avoidTarget = camera.position.clone();
        avoidTarget.y -= this._rootNode.position.y;
        for (let i = 0; i < boids.length; i++) {
            const boid = boids[i];
            boid.repulse(avoidTarget);
            boid.run(boids);

            const fish = this._rootNode.childAt(i);
            if (boid.velocity.squaredLength() > 0.01) {
                Vector3.sub(target, fish.position, boid.velocity);
                fish.lookAt(target, up);
                fish.scale.set(FISH_SCALE, FISH_SCALE, FISH_SCALE);
            }
            fish.position.copy(boid.position);
        }
    }

    goTo(position, radius) {
        const boids = this._boids;
        for (let i = 0; i < boids.length; i++) {
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

    getCenter() {
        const boids = this._boids;
        const center = new Vector3();

        if (boids.length > 0) {
            for (let i = 0; i < boids.length; i++) {
                Vector3.add(center, center, boids[i].position);
            }
            Vector3.scale(center, center, 1 / boids.length);
            Vector3.add(center, center, this._rootNode.position);

            return center;
        }
    }
}