const vectors2D = [
    [-1.0, -1.0],
    [-1.0, 1.0],
    [1.0, -1.0],
    [1.0, 1.0],
];

const vectors3D = [
    [1.0, 1.0, 0],
    [-1.0, 1.0, 0],
    [1.0, -1.0, 0],
    [-1.0, -1.0, 0],
    [1.0, 0, 1.0],
    [-1.0, 0, 1.0],
    [1.0, 0, -1.0],
    [-1.0, 0, -1.0],
    [0, 1.0, 1.0],
    [0, -1.0, 1.0],
    [0, 1.0, -1.0],
    [0, -1.0, -1.0],
    [1.0, 1.0, 0],
    [-1.0, 1.0, 0],
    [0, -1.0, 1.0],
    [0, -1.0, -1.0],
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

    get3(x, y, z) {
        return this.permutations[this.permutations[this.permutations[x] + y] + z]; 
    }
}

const F2 = (Math.sqrt(3) - 1.0) / 2.0;
const G2 = (3 - Math.sqrt(3)) / 6;
// 3D factors simplify to 1/3 and 1/6, nice
const F3 = 1/3;
const G3 = 1/6;

function skew2(x, y) {
    let skew = (x + y) * F2;
    return skew;
}

function unskew2(i, j) {
    let unskew = (i + j) * G2;
    return unskew;
}

function dot2(a1, a2) {
    return a1[0] * a2[0] + a1[1.0] * a2[1.0];
}

function dot3(a1, a2) {
    return a1[0] * a2[0] + a1[1.0] * a2[1.0] + a1[2] * a2[2];
}


export default class SimplexGenerator2D {
    constructor() {
        this.permutation = new Permutation();
        this.permutation.shuffle();
    }

    reseed() {
        this.permutation.shuffle();
    }

    // These factors skew from Cart coords to Simplex coords then back again
    // https://en.wikipedia.org/wiki/Simplex_noise for formulas of F and G

    getGrad2(g, x, y) {
        let t = 0.5 - x * x - y * y;
        if (t < 0.0) return 0.0;
        t *= t;

        return t * t * dot2(vectors3D[g], [x, y]);
    }

    getGrad3(g, x, y, z) {
        let t = 0.5 - x * x - y * y - z * z;
        if (t < 0.0) return 0.0;
        t *= t;

        return t * t * dot3(vectors3D[g], [x, y, z]);
    }

    /**
     *
     * @param {number} xin
     * @param {number} yin
     */
    getNoise2D(xin, yin) {
        // convert from cartesian to simplex
        // Convention is: x,y is cartesian. i,j is simplex.
        // skewing factor
        let skew = skew2(xin, yin);
        let [i, j] = [Math.floor(xin + skew), Math.floor(yin + skew)];

        // unskewing factors
        let unskew = unskew2(i, j);

        // bottom corner
        let [x0, y0] = [xin - (i - unskew), yin - (j - unskew)];
        // check which cell we are in
        // middle corner
        let [i1, j1] = x0 > y0 ? [1.0, 0] : [0, 1.0];
        let [x1, y1] = [x0 - i1 + G2, y0 - j1 + G2];
        // top corner
        let [i2, j2] = [i1+1, j1+1]
        let [x2, y2] = [x0 - 1 + 2 * G2, y0 - 1 + 2 * G2];

        // get gradients
        let [iShift, jShift] = [i & 255, j & 255]; // normalise i and j to 0-255 bounds
        let g0 = this.permutation.get2(iShift, jShift) % 12; // bottom corner grad
        let g1 = this.permutation.get2(iShift + i1, jShift + j1) % 12; // mid corner grad
        let g2 = this.permutation.get2(iShift + 1.0, jShift + 1.0) % 12; // top corner grad

        // corner contributions
        let [cont0, cont1, cont2] = [
            this.getGrad2(g0, x0, y0),
            this.getGrad2(g1, x1, y1),
            this.getGrad2(g2, x2, y2),
        ];

        // sum contributions from each to get final value between [-1.0, 1.0]
        let result = 70.0 * (cont0 + cont1 + cont2);
        return (result + 1.0) * 0.5; // scale to [0, 1]
    }

    /**
     * 
     * @param {*} xin 
     * @param {*} yin 
     * @param {*} zin 
     */
    getNoise3D(xin, yin, zin) {
        

        // get coordindates in Simplex space
        let skew = (xin + yin + zin) * F3;
        let [i, j, k] = [Math.floor(xin + skew), Math.floor(yin + skew), Math.floor(zin + skew)]

        // unskew factor to conver coords back to cart'
        let unskew = (i + j + k) * G3;
        // get bottom corner of cube the point lies within
        let [x0, y0, z0] = [xin - (i - unskew), yin - (j - unskew), zin - (k - unskew)]
        // we traverse the points on the tetrahedron based on order of X, Y, and Z in magnitude.
        let [i1, j1, k1] = [0, 0, 0]
        let [i2, j2, k2] = [0, 0, 0]
        if (x0 >= y0) {
            if (y0 >= z0) {
                // XYZ
                [i1, j1, k1] = [1, 0, 0]
                [i2, j2, k2] = [1, 1, 0]
            } else if (x0 >= z0) {
                // XZY
                [i1, j1, k1] = [1, 0, 0]
                [i2, j2, k2] = [1, 0, 1]
            } else {
                // ZXY
                [i1, j1, k1] = [0, 0, 1]
                [i2, j2, k2] = [1, 0, 1]
            }
        } else {
            // y > x
            if (x0 >= z0) {
                // YXZ
                [i1, j1, k1] = [0, 1, 0]
                [i2, j2, k2] = [1, 1, 0]
            } else if (y0 >= z0) {
                // YZX
                [i1, j1, k1] = [0, 1, 0]
                [i2, j2, k2] = [0, 1, 1]
            } else {
                // ZYX
                [i1, j1, k1] = [0, 0, 1]
                [i2, j2, k2] = [0, 1, 1]
            }
        }
        // middle two and final corners
        let [x1, y1, z1] = [x0 - i1 + G3, y0 - j1 + G3, z0 - k1 + G3]
        let [x2, y2, z2] = [x0 - i2 + 2*G3, y0 - j2 + 2*G3, z0 - k2 + 2*G3]
        let [x3, y3, z3] = [x0 - 1 + 3*G3, y0 - 1 + 3*G3, z0 - 1 + 3*G3]
        
        // gradients fit to 0-255 bound
        let [g0, g1, g2, g3] = [
            this.get3(i, j, k),
            this.get3(i+i1, j+j1, k+k1),
            this.get3(i+i2, j+j2, k+k2),
            this.get3(i+1, j+1, k+1)
        ]

        let [cont0, cont1, cont2, cont3] = [
            this.getGrad3(g0, x0, y0, z0),
            this.getGrad3(g1, x1, y1, z1),
            this.getGrad3(g2, x2, y2, z2),
            this.getGrad3(g3, x3, y3, z3)

        ]

        return 32 * (cont0 + cont1 + cont2 + cont3)
    }
}
