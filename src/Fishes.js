import {Node as clayNode, Vector3, Texture2D, InstancedMesh, Matrix4} from 'claygl';
import loadModel from './loadModel';
import Flocking from './Flocking';

const fishIds = ['01', '02', '05', '07', '12'];
const FISH_SCALE = 0.02;

const FISH_COUNT = 400;
const INSTANCING = false;
const WORKER = false;

const BOX = {
    min: {x: -500, y: 0, z: -500},
    max: {x: 500, y: 120, z: 500}
};

export default class Fishes {
    constructor(shader, cb, app) {
        if (WORKER) {
            this._worker = new Worker('./dist/worker.js');
            this._workerInited = false;
            this._workerLocked = false;
            this._elapsedTime = 0;

            this._worker.onmessage = e => {
                if (e.data.type === 'updated') {
                    this._updated(e.data.data);
                }
                else if (e.data.type === 'inited') {
                    this._workerInited = true;
                    cb && cb();
                }
            };
        }
        else {
            this._flocking = new Flocking({
                count: FISH_COUNT,
                box: BOX
            });
        }

        this._rootNode = new clayNode();
        this._rootNode.position.y = BOX.max.y / 2;

        this._fishes = [];

        Promise.all(fishIds.map(function (fishId) {
            return loadModel('asset/model/TropicalFish' + fishId + '.json', {
                shader: shader,
                rootNode: new clayNode()
            }).then(fish => {
                console.log(`Fish ${fishId} loaded`);
                return fish;
            });
        })).then(results => {

            const meshes = [];
            results.forEach((result, idx) => {
                const mesh = result.meshes[0];
                if (fishIds[idx] === '15') {
                    mesh.rotation.rotateY(Math.PI / 2);
                }

                if (INSTANCING) {
                    const instancedMesh = new InstancedMesh({
                        geometry: mesh.geometry,
                        material: mesh.material
                    });

                    result.rootNode.update();

                    meshes.push(instancedMesh);

                    app.scene.add(instancedMesh);
                }
            });
            for (let i = 0; i < FISH_COUNT; i++) {
                let fishNode;
                const randomFishIndex = Math.round(Math.random() * (results.length - 1));
                if (!INSTANCING) {
                    const randomFish = results[randomFishIndex];
                    fishNode = randomFish.rootNode.clone();
                }
                else {
                    fishNode = new clayNode();
                    const fishInnerNode = new clayNode();
                    fishNode.add(fishInnerNode);
                    fishInnerNode.setLocalTransform(results[randomFishIndex].meshes[0].worldTransform);
                    meshes[randomFishIndex].instances.push({
                        node: fishInnerNode
                    });
                    fishNode.scale.set(FISH_SCALE, FISH_SCALE, FISH_SCALE);
                }

                this._rootNode.add(fishNode);
                this._fishes.push(fishNode);
            }

            if (WORKER) {
                this._worker.postMessage({
                    count: FISH_COUNT,
                    box: BOX,
                    action: 'init'
                });
            }
        });

    }

    update(frameTime, camera) {
        let {x, y, z} = camera.position;
        y -= this._rootNode.position.y;
        const avoid = {x, y, z};
        if (WORKER) {
            this._elapsedTime += frameTime;

            if (this._workerLocked || !this._workerInited) {
                return;
            }


            this._workerLocked = true;
            this._worker.postMessage({
                action: 'update',
                deltaTime: this._elapsedTime,
                avoid
            });
        }
        else {
            this._flocking.update(frameTime, avoid);
            this._updated(this._flocking.getData());
        }
    }

    _updated(data) {
        const up = Vector3.UP;
        const target = new Vector3();
        const velocity = new Vector3();
        for (let i = 0, k = 0; i < this._fishes.length; i++) {
            const fishNode = this._fishes[i];
            const x = data[k++];
            const y = data[k++];
            const z = data[k++];
            const vx = data[k++];
            const vy = data[k++];
            const vz = data[k++];

            fishNode.position.set(x, y, z);
            velocity.set(vx, vy, vz);

            if (velocity.squaredLength() > 0.01) {
                Vector3.sub(target, fishNode.position, velocity);
                fishNode.lookAt(target, up);
                fishNode.scale.set(FISH_SCALE, FISH_SCALE, FISH_SCALE);
            }
        }

        this._workerLocked = false;
        this._elapsedTime = 0;
    }

    getRootNode() {
        return this._rootNode;
    }

    getCenter() {
        const fishes = this._fishes;
        const center = new Vector3();

        if (fishes.length > 0) {
            for (let i = 0; i < fishes.length; i++) {
                Vector3.add(center, center, fishes[i].position);
            }
            Vector3.scale(center, center, 1 / fishes.length);
            Vector3.add(center, center, this._rootNode.position);

            return center;
        }
    }

}