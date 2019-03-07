// Based on http://www.openprocessing.org/visuals/?visualID=6910
import Vector3 from 'claygl/src/math/Vector3';

var Boid = function () {

    var vector = new Vector3(),
    _acceleration, _width = 500, _height = 500, _depth = 200, _goal, _neighborhoodRadius = 50,
    _maxSpeed = 0.5, _maxSteerForce = 0.1, _avoidWalls = false,

    _goalIntensity = 0.001;

    this.position = new Vector3();
    this.velocity = new Vector3();
    _acceleration = new Vector3();

    this.setGoal = function ( target ) {

        _goal = target;

    };

    this.setGoalIntensity  = function (goalIntensity) {
        _goalIntensity = goalIntensity;
    };

    this.setAvoidWalls = function ( value ) {

        _avoidWalls = value;

    };

    this.setWorldSize = function ( width, height, depth ) {

        _width = width;
        _height = height;
        _depth = depth;

    };

    this.setMaxSpeed = function (speed) {
        _maxSpeed = speed;
    };

    this.setMaxSteerForce = function (maxSteerForce) {
        _maxSteerForce = maxSteerForce;
    };

    this.run = function ( boids ) {

        if ( _avoidWalls ) {

            vector.set( - _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.scale( 5 );
            _acceleration.add( vector );

            vector.set( _width, this.position.y, this.position.z );
            vector = this.avoid( vector );
            vector.scale( 5 );
            _acceleration.add( vector );

            vector.set( this.position.x, - _height, this.position.z );
            vector = this.avoid( vector );
            vector.scale( 5 );
            _acceleration.add( vector );

            vector.set( this.position.x, _height, this.position.z );
            vector = this.avoid( vector );
            vector.scale( 5 );
            _acceleration.add( vector );

            vector.set( this.position.x, this.position.y, - _depth );
            vector = this.avoid( vector );
            vector.scale( 5 );
            _acceleration.add( vector );

            vector.set( this.position.x, this.position.y, _depth );
            vector = this.avoid( vector );
            vector.scale( 5 );
            _acceleration.add( vector );

        }/* else {

            this.checkBounds();

        }
        */

        if ( Math.random() > 0.5 ) {

            this.flock( boids );

        }

        this.move();

    };

    this.flock = function ( boids ) {

        if ( _goal ) {

            _acceleration.add( this.reach( _goal, _goalIntensity ) );

        }

        _acceleration.add( this.alignment( boids ) );
        _acceleration.add( this.cohesion( boids ) );
        _acceleration.add( this.separation( boids ) );
    };

    this.move = function () {

        _acceleration.y *= 0.5;

        this.velocity.add( _acceleration );

        var l = this.velocity.len();

        if ( l > _maxSpeed ) {

            this.velocity.scale( _maxSpeed / l );

        }

        this.position.add( this.velocity );
        _acceleration.set( 0, 0, 0 );

    };

    this.checkBounds = function () {

        if ( this.position.x >   _width ) this.position.x = - _width;
        if ( this.position.x < - _width ) this.position.x =   _width;
        if ( this.position.y >   _height ) this.position.y = - _height;
        if ( this.position.y < - _height ) this.position.y =  _height;
        if ( this.position.z >  _depth ) this.position.z = - _depth;
        if ( this.position.z < - _depth ) this.position.z =  _depth;

    };

    //

    this.avoid = function ( target ) {

        var steer = new Vector3();

        Vector3.copy(steer, this.position );
        Vector3.sub(steer, steer, target );

        Vector3.scale(steer, steer, 1 / this.position.squaredDistance( target ) );

        return steer;

    };

    this.repulse = function ( target ) {

        var distance = Vector3.distance(this.position, target);

        if ( distance < 30 ) {

            var steer = new Vector3();

            Vector3.sub(steer, this.position, target );
            Vector3.scale(steer, steer, 0.1 / distance );

            Vector3.add(_acceleration, _acceleration, steer );

        }

    };

    this.reach = function ( target, amount ) {

        var steer = new Vector3();

        Vector3.sub(steer, target, this.position );
        Vector3.scale(steer, steer, amount );

        return steer;

    };

    this.alignment = function ( boids ) {

        var boid, velSum = new Vector3(),
        count = 0;

        for ( var i = 0, il = boids.length; i < il; i++ ) {

            if ( Math.random() > 0.6 ) continue;

            boid = boids[ i ];

            var distance = Vector3.distance(boid.position, this.position );

            if ( distance > 0 && distance <= _neighborhoodRadius ) {

                Vector3.add(velSum, velSum, boid.velocity );
                count++;

            }

        }

        if ( count > 0 ) {

            Vector3.scale(velSum, velSum, 1 /  count );

            var l = velSum.length();

            if ( l > _maxSteerForce ) {

                Vector3.scale(velSum, velSum, _maxSteerForce / l);

            }

        }

        return velSum;

    };

    this.cohesion = function ( boids ) {

        var boid, distance,
        posSum = new Vector3(),
        steer = new Vector3(),
        count = 0;

        for ( var i = 0, il = boids.length; i < il; i ++ ) {

            if ( Math.random() > 0.6 ) continue;

            boid = boids[ i ];
            distance = Vector3.distance(boid.position, this.position);

            if ( distance > 0 && distance <= _neighborhoodRadius ) {

                Vector3.add(posSum, posSum, boid.position);
                count++;

            }

        }

        if ( count > 0 ) {

            Vector3.scale(posSum, posSum, 1 / count);

        }

        Vector3.sub(steer, posSum, this.position );

        var l = steer.length();

        if ( l > _maxSteerForce ) {

            Vector3.scale(steer, steer, _maxSteerForce / l);

        }

        return steer;

    };

    this.separation = function ( boids ) {

        var boid, distance,
        posSum = new Vector3(),
        repulse = new Vector3();

        for ( var i = 0, il = boids.length; i < il; i ++ ) {

            if ( Math.random() > 0.6 ) continue;

            boid = boids[ i ];
            distance = Vector3.distance(boid.position, this.position );

            if ( distance > 0 && distance <= _neighborhoodRadius ) {

                Vector3.sub(repulse, this.position, boid.position);

                Vector3.normalize(repulse, repulse);
                Vector3.scale(repulse, repulse, 1 / distance);
                Vector3.add(posSum, posSum, repulse);

            }

        }

        return posSum;

    };

};

export default Boid;