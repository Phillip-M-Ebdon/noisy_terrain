import { default as PerlinGenerator2D } from "./perlinNoise.js";
import { default as SimplexGenerator2D } from "./simplexNoise.js";
import { default as WorleyGenerator2D } from "./worleyNoise.js";
import * as THREE from "https://cdn.skypack.dev/three";
// import { OrbitControls } from "https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js";

// 2d generators
let generators2D = {
    "perlin": {
        "height" : new PerlinGenerator2D(), // elevation
        "moi" : new PerlinGenerator2D(), // moisture
        "temp" : new PerlinGenerator2D() // temperature

    },
    "simplex": {
        "height" : new SimplexGenerator2D(), // elevation
        "moi" : new SimplexGenerator2D(), // moisture
        "temp" : new SimplexGenerator2D() // temperature
    },
    "worley": {
        "height" : new WorleyGenerator2D(500, 500, 50, 50), // elevation
        "moi" : new WorleyGenerator2D(500, 500, 50, 50), // moisture
        "temp" : new WorleyGenerator2D(500, 500, 50, 50) // temperature
    }
}

// settings
const generatorSelect = document.getElementById("generatorSelect");
const reseedButton = document.getElementById("reseedButton");
const heightSlider = document.getElementById("heightSlider");
const freqSlider = document.getElementById("freqSlider");
const octaveSlider = document.getElementById("octaveSlider");
const thresholdSlider = document.getElementById("thresholdSlider");
const visualSelect = document.getElementById("visualSelect");
const smoothCheck = document.getElementById("smoothCheckbox");
const ampSlider = document.getElementById("ampSlider");

// drawing
const map2d = document.getElementById("map-2d");
const map3d = document.getElementById("map-3d");

// texture settings
const textureMode = document.getElementById("textureMode");

function drawNoise() {
    const mode = visualSelect.value;
    if (mode == "2") {
        map2d.style.display = "";
        map3d.style.display = "none";
        draw2D();
    } else if (mode == "3") {
        map3d.style.display = "";
        map2d.style.display = "none";
        draw3D();
    }
}

/**
 * Find the value between 0 and 1, that represents it as a percentage of closeness to the upper from lower
 * where 0 means value <= lower, and 1 means value = upper, hence value > 1 means value > upper.
 * @param {*} value , value to convert to percentage
 * @param {*} lower , the lowest bound of percentage
 * @param {*} upper , the upper bound for 100%
 * @returns float between 0 and 1
 */
function percentBetween(value, lower, upper) {
    let shifted = value - lower;
    if (shifted <= 0) {
        return 0;
    }

    return shifted / upper;
}

/**
 * Convert a value given its own bounds, into the value it would be if it had the new bounds
 * @param {*} value value to convert
 * @param {*} valuesBounds bounds of the supplied value
 * @param {*} newBounds bounds to fit the value between
 */
function mapValue(value, valuesBounds, newBounds) {
    const valuePercentage = percentBetween(
        value,
        valuesBounds[0],
        valuesBounds[1]
    );
    const newValue =
        (newBounds[1] - newBounds[0]) * valuePercentage + newBounds[0];
    return newValue;
}

/**
 * Uses the height2Dgen object to generate a grid of noise give a width and height
 * @param {*} width number of rows
 * @param {*} height number of columns
 * @returns a grid of values representing noise, values bounded to 0 and 255
 */
function generateHeightGrid(width, height) {
    let heights = [];
    let generatorType = generatorSelect.value;
    for (let y = 0; y < width; y++) {
        heights.push([]);
        for (let x = 0; x < height; x++) {
            let f = parseInt(freqSlider.value) / 10000.0;

            let total = 0.0;
            let a = 1;
            let octaveCount = parseInt(octaveSlider.value);
            let finalMultiplier = 0.0;
            for (let octave = 0; octave < octaveCount; octave++) {
                let value = a * generators2D[generatorType]["height"].getNoise2D(x * f, y * f);
                finalMultiplier += a;
                total += value;
                a *= 0.5;
                f *= 2;
            }

            total *= 1 / finalMultiplier;

            let step = parseInt(thresholdSlider.value);
            let rgb = Math.round(total * 255);
            // console.log(rgb, rgb % step, rgb - rgb % step)
            rgb -= rgb % step;
            heights[y].push(rgb);
        }
    }
    return heights;
}

/**
 * generates a temperature map for a give altitude map, using noise values which are then bounded between -10 and a max of 40
 * the max temperature is inversely proporitional to temp, with the max height of 255 being -10 to -10
 * @param {*} width number of rows
 * @param {*} height number of columns
 * @param {*} heightGrid grid of equal width and height containing altitudes ranging from 0 and 255
 * @re
 */
function generateTemperatureGrid(width, height, heightGrid) {
    let temperatures = [];
    let generatorType = generatorSelect.value;

    for (let y = 0; y < width; y++) {
        temperatures.push([]);
        for (let x = 0; x < height; x++) {
            // want temperatures smooth, no octaves
            // but what if octaves?
            let total = 0.0;
            let a = 1;
            let octaveCount = parseInt(octaveSlider.value);
            let finalMultiplier = 0.0;
            let f = parseInt(freqSlider.value) / 100000.0;
            for (let octave = 0; octave < octaveCount; octave++) {
                let value = a * generators2D[generatorType]["temp"].getNoise2D(x * f, y * f);
                finalMultiplier += a;
                total += value;
                a *= 0.5;
                f *= 2;
            }

            total *= 1 / finalMultiplier;

            // altitude sets the upper bound for temperature, inversley proportional
            // aka higher is colder
            let altitude = heightGrid[y][x];
            let maxTemp = 40 - 10 * percentBetween(altitude, 0, 255); // yeah this sucks, should be using constants or variables. whoops.
            total = mapValue(total, [0, 1], [-10, maxTemp]);

            temperatures[y].push(total);
        }
    }
    return temperatures;
}

/**
 * generate a very simple grid of noise to act in place of moisture/humidity
 * values on a grid are bounded to 0 and 1, representing 0% and 100% moisture/humidity
 * the temperature dictates the maxmimum moisture, where colder reduced maximum
 *
 * @param {*} width
 * @param {*} height
 * @returns
 */
function generateMoistureGrid(width, height, temperatures) {
    let moistures = [];
    let generatorType = generatorSelect.value;

    for (let y = 0; y < width; y++) {
        moistures.push([]);
        for (let x = 0; x < height; x++) {
            // want moisture to be smooth, no octaves
            const temp = temperatures[y][x];
            const maxMoisture = percentBetween(temp, -10, 40) * 100;
            let f = parseInt(freqSlider.value) / 100000.0;

            let total = 0.0;
            let a = 1;
            let octaveCount = parseInt(octaveSlider.value);
            let finalMultiplier = 0.0;
            for (let octave = 0; octave < octaveCount; octave++) {
                let value = a * generators2D[generatorType]["moi"].getNoise2D(x * f, y * f);
                finalMultiplier += a;
                total += value;
                a *= 0.5;
                f *= 2;
            }

            total *= 1 / finalMultiplier;

            total = mapValue(total, [0, 1], [0, maxMoisture]);
            moistures[y].push(total);
        }
    }
    return moistures;
}

const BIOME_COLOURS = {
    snow: "rgb(255, 255, 255)",
    borealForest: "rgb(14, 56, 46)",
    forest: "rgb(0, 51, 20)",
    rainForest: "rgb(34, 140, 34)",
    tropicalForest: "rgb(125, 186, 7)",
    grassland: "rgb(198, 204, 81)",
    savanna: "rgb(251, 208, 116)",
    desert: "rgb(222, 189, 149)",
    mountain: "rgb(168, 171, 180)",
    waterShallow: "rgb(80, 127, 169)",
    waterDeep: "rgb(10, 70, 107)",
};

function simulateBiomes(heightGrid) {
    const width = heightGrid[0].length;
    const height = heightGrid.length;
    let tempGrid = generateTemperatureGrid(width, height, heightGrid);
    let moiGrid = generateMoistureGrid(width, height, tempGrid);

    console.log(Math.min);

    const max = Math.max(...[].concat(...tempGrid));
    const min = Math.min(...[].concat(...tempGrid));
    console.log(max);
    console.log(min);

    console.log(heightGrid, tempGrid, moiGrid);

    let rgbMap = [];
    for (let y = 0; y < width; y++) {
        rgbMap.push([]);
        for (let x = 0; x < height; x++) {
            let alt = heightGrid[y][x];
            let moi = moiGrid[y][x];
            let temp = tempGrid[y][x];
            let biome;

            // overrides
            if (alt > 200 || alt < 90) {
                // mountains
                if (alt > 225) biome = "snow";
                else if (alt > 200) biome = "mountain";
                // water
                else if (alt > 50) biome = "waterShallow";
                else biome = "waterDeep";
            } else {
                // cold
                if (temp <= 0) {
                    // but enough moisture
                    if (moi > 15) biome = "borealForest";
                    // nothing but ice
                    else biome = "snow";
                }

                // temperate
                else if (temp > 0 && temp < 20) {
                    // just right, but a little drier
                    if (moi < 20) biome = "grassland";
                    // enought moisture for something more
                    else biome = "forest";
                }

                // hot
                else {
                    // and dry
                    if (moi < 20) biome = "desert";
                    // a little mositure
                    else if (moi < 40) biome = "savanna";
                    // a lot of moisture
                    else if (moi < 70) biome = "rainForest";
                    // welcome to the tropics
                    else biome = "tropicalForest";
                }
            }
            rgbMap[y].push(BIOME_COLOURS[biome]);
        }
    }
    return rgbMap;
}

/**
 * Output a grid of RGB values acting as a texture for a heightGrid
 * colours chosen to roughly mimic a world-map / atlas style diagram
 * @param {*} heightGrid
 * @returns
 */
function generateAtlasMap(heightGrid) {
    const width = heightGrid[0].length;
    const height = heightGrid.length;
    let rgbMap = [];
    for (let y = 0; y < width; y++) {
        rgbMap.push([]);
        for (let x = 0; x < height; x++) {
            let alt = heightGrid[y][x];
            if (alt < 75) {
                rgbMap[y].push(
                    `rgb(${157},${200 + percentBetween(alt, 0, 74) * 25},${255}`
                );
            } else if (alt < 90) {
                rgbMap[y].push(
                    `rgb(${195},${210 + percentBetween(alt, 0, 90) * 25},${255}`
                );
            } else if (alt < 100) {
                rgbMap[y].push(
                    `rgb(${255},${210 + percentBetween(alt, 90, 100) * 40},${
                        190 + percentBetween(alt, 90, 100) * 10
                    }`
                );
            } else if (alt < 125) {
                rgbMap[y].push(
                    `rgb(${180},${220 + percentBetween(alt, 100, 124) * 30},${
                        180 + percentBetween(alt, 100, 124) * 20
                    }`
                );
            } else if (alt < 150) {
                rgbMap[y].push(
                    `rgb(${170},${200 + percentBetween(alt, 125, 149) * 10},${
                        170 + percentBetween(alt, 125, 149) * 10
                    }`
                );
            } else if (alt < 200) {
                rgbMap[y].push(
                    `rgb(${
                        200 + percentBetween(alt, 150, 199) * 55
                    },${180},${150}`
                );
            } else
                rgbMap[y].push(
                    `rgb(${250 + percentBetween(alt, 250, 255) * 5},${
                        250 + percentBetween(alt, 250, 255) * 5
                    },${250 + percentBetween(alt, 250, 255) * 5}`
                );
        }
    }
    return rgbMap;
}

/**
 * Return the appropriate grid of RGB values to be interpreted as a texture
 * @param {*} heightGrid
 * @returns
 */
function heightToRGB(heightGrid) {
    const mode = textureMode.value;

    switch (mode) {
        case "atlas":
            // some arbitrary colours in a switch to emulate an Atlas or world map
            return generateAtlasMap(heightGrid);
            break;

        case "simulate":
            // whack
            return simulateBiomes(heightGrid);
            break;

        default:
            // output greyscale
            let rgbMap = [];
            const width = heightGrid[0].length;
            const height = heightGrid.length;
            for (let y = 0; y < width; y++) {
                rgbMap.push([]);
                for (let x = 0; x < height; x++) {
                    let alt = heightGrid[y][x];
                    rgbMap[y].push(`rgb(${alt},${alt},${alt}`);
                }
            }
            return rgbMap;
            break;
    }
}

let renderer, controls, scene, camera;
const clock = new THREE.Clock();

function draw3D() {
    // remove then reinstantiate renderer in container
    while (map3d.firstChild) {
        map3d.removeChild(map3d.firstChild);
    }
    const width = 500;
    const height = 500;

    //setup camera
    camera = new THREE.PerspectiveCamera(25, 2, 1, 10000);
    camera.position.x = 1000;
    camera.position.y = 1000;
    camera.position.z = 1000;
    camera.lookAt(0, 0, 0);

    // setup scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xefd1b5);

    // const light = new THREE.PointLight( 0xffffff, 0.5, 0);
    // light.position.set(-1000, -500, -1000);
    // scene.add( light );

    // setup terrain using noise
    let heights = generateHeightGrid(500, 500); // [y][x] = height from 0 to 255 (step variable from 1 to N W/ N is <= 255)
    let terrainGeometry = new THREE.PlaneGeometry(500, 500, 499, 499);
    terrainGeometry.rotateX(-Math.PI / 2);

    const vertices = terrainGeometry.attributes.position.array;

    const textureCanvas = document.createElement("canvas");
    const context = textureCanvas.getContext("2d");
    context.canvas.width = 500;
    context.canvas.height = 500;
    context.fillStyle = "#AAAAAA";
    context.fillRect(0, 0, 500, 500);

    console.log(smoothCheck);

    let data = [];
    let offset = parseFloat(heightSlider.value);
    let amplification = parseFloat(ampSlider.value);

    offset = smoothCheck.checked
        ? offset * (amplification / parseFloat(freqSlider.value))
        : offset;

    let rgbMap = heightToRGB(heights);

    for (let y = 0; y < heights.length; y++) {
        for (let x = 0; x < heights[y].length; x++) {
            // data.push(x, heights[y][x], y)
            let height = heights[y][x];
            if (smoothCheck.checked) {
                // Smoth the 3D so the frequency acts as a ZOOM, not, Density
                height =
                    height * (amplification / parseFloat(freqSlider.value)) -
                    amplification / parseFloat(freqSlider.value);
            }
            data.push(height - offset);
            context.fillStyle = rgbMap[y][x];
            context.fillRect(x, y, 1, 1);
        }
    }

    console.log(data);

    // document.body.appendChild(textureCanvas)

    let texture = new THREE.CanvasTexture(textureCanvas);
    // texture.minFilter = THREE.LinearFilter;
    // texture.wrapS = THREE.ClampToEdgeWrapping;
    // texture.wrapT = THREE.ClampToEdgeWrapping;

    for (let i = 0, j = 0, l = vertices.length; i < l; i++, j += 3) {
        vertices[j + 1] = data[i];
    }

    // material
    const material = new THREE.MeshBasicMaterial({ map: texture });

    // use terrain in mesh
    let mesh = new THREE.Mesh(terrainGeometry, material);
    scene.add(mesh);

    // add in flat plane to show x = 0, z = 0;
    let flatPlane = new THREE.PlaneGeometry(500, 500, 1, 1);
    flatPlane.rotateX(-Math.PI / 2);
    let flatMat = new THREE.MeshBasicMaterial({ color: "#0000FF" });
    let flatMesh = new THREE.Mesh(flatPlane, flatMat);
    scene.add(flatMesh);

    renderer = new THREE.WebGLRenderer();
    renderer.setSize(500, 500);

    map3d.appendChild(renderer.domElement);

    // controls
    // controls = new OrbitControls(camera, renderer.domElement);
    // controls.movementSpeed = 150;
    // controls.lookSpeed = 0.1;

    renderer.render(scene, camera);
    animate();
}

function drawSphere() {

}

function animate() {
    requestAnimationFrame(animate);

    render();
}

function render() {
    controls.update(clock.getDelta());
    renderer.render(scene, camera);
}

function draw2D() {
    let canvas = document.getElementsByTagName("canvas")[0].getContext("2d");
    // let freqSlider = document.getElementById("freqSlider").value;
    // let heightSlider = document.getElementById("heightSlider").value;
    let heights = generateHeightGrid(500, 500);
    let rgbMap = heightToRGB(heights);
    for (let y = 0; y < 500; y++) {
        for (let x = 0; x < 500; x++) {
            canvas.fillStyle = rgbMap[y][x];
            canvas.fillRect(x, y, 1, 1);
        }
    }
}

generatorSelect.onchange = function () {
    drawNoise();
}

heightSlider.onchange = function () {
    drawNoise();
    document.getElementById("heightValue").innerText = heightSlider.value;
};

freqSlider.onchange = function () {
    drawNoise();
    document.getElementById("freqValue").innerText = freqSlider.value;
};

octaveSlider.onchange = function () {
    drawNoise();
    document.getElementById("octaveValue").innerText = octaveSlider.value;
};

thresholdSlider.onchange = function () {
    drawNoise();
    document.getElementById("thresholdValue").innerText = thresholdSlider.value;
};

ampSlider.onchange = function () {
    drawNoise();
    document.getElementById("ampValue").innerText = ampSlider.value;
};

visualSelect.onchange = function () {
    drawNoise();
};

smoothCheck.onchange = function () {
    drawNoise();
};

reseedButton.onclick = function () {
    let generatorType = generatorSelect.value;

    generators2D[generatorType]["height"].reseed();
    generators2D[generatorType]["moi"].reseed();
    generators2D[generatorType]["temp"].reseed();
    drawNoise();
};

const paletteDiv = document.getElementById("palette");

textureMode.onchange = function () {
    drawNoise();
    while (paletteDiv.firstChild) {
        paletteDiv.removeChild(paletteDiv.firstChild);
    }

    if (textureMode.value == "simulate") {
        Object.keys(BIOME_COLOURS).forEach((biome) => {
            let colourSwash = document.createElement("div");
            colourSwash.className = "colour-swash";
            colourSwash.style.background = BIOME_COLOURS[biome];
            colourSwash.innerText = biome;

            paletteDiv.appendChild(colourSwash);
        });
    }
};

function init() {
    document.getElementById("heightValue").innerText = heightSlider.value;
    document.getElementById("freqValue").innerText = freqSlider.value;
    document.getElementById("octaveValue").innerText = octaveSlider.value;
    document.getElementById("thresholdValue").innerText = thresholdSlider.value;
    document.getElementById("ampValue").innerText = ampSlider.value;
    generatorSelect.value = "perlin";
    textureMode.value = "grey";
    drawNoise();
}

init();
