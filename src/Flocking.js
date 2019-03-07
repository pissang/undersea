import Boid from './Boid';
import Vector3 from 'claygl/src/math/Vector3';

export default class Flocking {
    constructor({ count, box }) {
        this._boids = [];

        for (let i = 0; i < count; i++) {
            const boid = new Boid();

            boid.velocity.x = Math.random() * 2 - 1;
            boid.velocity.y = Math.random() * 0.2 - 0.1;
            boid.velocity.z = Math.random() * 2 - 1;
            boid.setAvoidWalls(false);
            boid.setMaxSteerForce(0.1);
            boid.setMaxSpeed(1);

            this._boids.push(boid);
        }

        this.randomPositionInBox(box);
        this.setWorldSize(box);
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
    }

    update(dTime, avoid) {
        const boids = this._boids;
        const avoidTarget = new Vector3(
            avoid.x, avoid.y, avoid.z
        );
        for (let i = 0; i < boids.length; i++) {
            const boid = boids[i];
            boid.repulse(avoidTarget);
            boid.run(boids);
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

    getData() {
        const array = new Float32Array(this._boids.length * 6);

        for (let i = 0, k = 0; i < this._boids.length; i++) {
            const boid = this._boids[i];

            array[k++] = boid.position.x;
            array[k++] = boid.position.y;
            array[k++] = boid.position.z;

            array[k++] = boid.velocity.x;
            array[k++] = boid.velocity.y;
            array[k++] = boid.velocity.z;
        }

        return array;
    }
}