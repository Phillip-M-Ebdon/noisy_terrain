const vectors2D = [
    [-1, -1],
    [-1, 1],
    [1, -1],
    [1, 1],
];

const vectors3D = [
    [1, 1, 0],
    [-1, 1, 0],
    [1, -1, 0],
    [-1, -1, 0],
    [1, 0, 1],
    [-1, 0, 1],
    [1, 0, -1],
    [-1, 0, -1],
    [0, 1, 1],
    [0, -1, 1],
    [0, 1, -1],
    [0, -1, -1],
    [1, 1, 0],
    [-1, 1, 0],
    [0, -1, 1],
    [0, -1, -1],
];

// permutations ranges from 0 to 255, twice for wrapping
class Permutation {
    constructor() {
        this.permutations = [];
        for (let i = 0; i < 256; i++) {
            this.permutations.push(i);
            this.permutations.push(i);
        }
        this.shuffle();
    }

    shuffle() {
        for (let i = 0; i < 512; i++) {
            let newIndex = Math.floor(Math.random() * 512);
            let saved = this.permutations[i];
            this.permutations[i] = this.permutations[newIndex];
            this.permutations[newIndex] = saved;
        }
    }

    get(i) {
        return this.permutations[i];
    }

    get2(x, y) {
        return this.permutations[this.permutations[x] + y];
    }
}

function linerInterp(weight, val1, val2) {
    return val1 + weight * (val2 - val1);
}

function smoother(weight) {
    return ((6 * weight - 15) * weight + 10) * weight * weight * weight;
}

class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    // dot prod with another vector
    dot(vector) {
        return this.x * vector.x + this.y * vector.y;
    }
}

export default class PerlinGenerator2D {
    constructor() {
        this.permutations = new Permutation();
    }

    vector2FromPerm(value) {
        const vector = vectors2D[value & 3];
        return new Vector2(vector[0], vector[1]);
    }

    /**
     * Generates a noise value for a coordindate, bounded between 0 and 1
     * @param {*} x
     * @param {*} y
     * @returns
     */
    getNoise2D(x, y) {
        // get corner of square point exists within
        let xPrime = Math.floor(x) & 255;
        let yPrime = Math.floor(y) & 255;
        // get difference between corner and value
        let xDiff = x - Math.floor(x);
        let yDiff = y - Math.floor(y);

        // vectors from corner to point
        let bottomLeft = new Vector2(xDiff, yDiff);
        let topLeft = new Vector2(xDiff, yDiff - 1.0);
        let bottomRight = new Vector2(xDiff - 1.0, yDiff);
        let topRight = new Vector2(xDiff - 1.0, yDiff - 1.0);

        // vectors on corners
        let topLeftVec = this.vector2FromPerm(
            this.permutations.get2(xPrime, yPrime + 1)
        );
        let topRightVec = this.vector2FromPerm(
            this.permutations.get2(xPrime + 1, yPrime + 1)
        );
        let bottomLeftVec = this.vector2FromPerm(
            this.permutations.get2(xPrime, yPrime)
        );
        let bottomRightVec = this.vector2FromPerm(
            this.permutations.get2(xPrime + 1, yPrime)
        );

        // vectors on corner dot vectors from corner to point
        let dotTopLeft = topLeftVec.dot(topLeft);
        let dotTopRight = topRightVec.dot(topRight);
        let dotBottomLeft = bottomLeftVec.dot(bottomLeft);
        let dotBottomRight = bottomRightVec.dot(bottomRight);

        // interpolate values, weighted?
        let xSmooth = smoother(xDiff);
        let ySmooth = smoother(yDiff);

        let result = linerInterp(
            xSmooth,
            linerInterp(ySmooth, dotBottomLeft, dotTopLeft),
            linerInterp(ySmooth, dotBottomRight, dotTopRight)
        );

        return (result + 1) * 0.5;
    }

    reseed() {
        this.permutations.shuffle();
    }
}
