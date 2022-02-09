export default class WorleyGenerator2D {

    constructor(width, height, cellRows, cellColumns) {
        // setup initial grid
        this.width = width
        this.height = height
        this.grid = []
        for(let i = 0; i < this.width; i++){
            this.grid.push([])
            for(let j = 0; j < this.height; j++){
                this.grid[i].push(0)
            }
        }
        // setup overlay of cells
        // user indicates number of desired cells by row and column. size of cell is rounded down based on width and height
        this.cellWidth = Math.floor(width / cellColumns)
        this.cellHeight = Math.floor(height / cellRows)
        // number of cells, the final cells may not reach the edge if values are chosen with remainder
        this.cellRows = height / this.cellHeight
        this.cellColumns = width / this.cellWidth

        this.cellGrid = []
        for(let i = 0; i < this.cellRows; i++){
            this.cellGrid.push([])
            for(let j = 0; j < this.cellColumns; j++){
                // randomise point coordinates in this particular cell
                this.grid[i].push([Math.random() * this.cellWidth, Math.random() * this.cellHeight])
            }
        }

        this.reseed();
        this.calculateGrid();
    }

    reseed() {
        this.cellGrid.forEach((column) => {
            column.forEach((cell) => {
                cell = [Math.random() * this.cellWidth, Math.random() * this.cellHeight]
            })
        })
        this.calculateGrid();
    }

    calculateGrid() {
        for(let x = 0; x < this.width; x++) {
            for(let y = 0; y < this.height; y++) {
                // TODO check all cells in 9x9 grid
                // find distance to point inside own cell
                let cellRow = Math.floor(x / this.cellWidth)
                let cellColumn = Math.floor(y / this.cellHeight)
                let cell = this.cellGrid[cellRow][cellColumn];
                
                // pythag yo!
                let dist = Math.sqrt((x - cell[0])**2 + (y - cell[1])**2);
                this.grid[x][y] = dist;
            }
        }
    }

    getNoise2D() {
        return this.grid;
    }

}

let generator = new WorleyGenerator2D(500, 500, 100, 100);

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

function draw2D() {
    let canvas = document.getElementsByTagName("canvas")[0].getContext("2d");
    // let freqSlider = document.getElementById("freqSlider").value;
    // let heightSlider = document.getElementById("heightSlider").value;
    let rgbMap = heightToRGB(generator.grid);
    for (let y = 0; y < 500; y++) {
        for (let x = 0; x < 500; x++) {
            canvas.fillStyle = rgbMap[y][x];
            canvas.fillRect(x, y, 1, 1);
        }
    }
}

draw2D();