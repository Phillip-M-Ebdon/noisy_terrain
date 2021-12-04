import * as THREE from 'https://cdn.skypack.dev/three';
            import { OrbitControls } from 'https://cdn.skypack.dev/three/examples/jsm/controls/OrbitControls.js';

            const vectors2D = [
                [-1, -1],
                [-1, 1],
                [1, -1],
                [1, 1]
            ]

            const vectors3D = [
                [1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],  
                [1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],  
                [0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1],
                [1,1,0],[-1,1,0],[0,-1,1],[0,-1,-1]
            ]

            // permutations ranges from 0 to 255, twice for wrapping
            class Permutation {
                constructor() {
                    this.permutations = [];
                    for(let i = 0; i < 256; i++) {
                        this.permutations.push(i);
                        this.permutations.push(i);    
                    }
                    this.shuffle();
                }

                shuffle() {
                    for(let i = 0; i < 512; i++) {
                        let newIndex = Math.floor(Math.random()*512)
                        let saved = this.permutations[i]
                        this.permutations[i] = this.permutations[newIndex]
                        this.permutations[newIndex] = saved;
                    }
                }

                get(i) {
                    return this.permutations[i];
                }

                get2(x, y) {
                    return this.permutations[this.permutations[x]+y]
                }
            }

            function linerInterp(weight, val1, val2) {
                return val1 + weight * (val2 - val1);
            }                

            function smoother(weight) {
                return ((6*weight - 15)*weight + 10)*weight*weight*weight;
            }

            class Vector2 {
                constructor(x, y) {
                    this.x = x;
                    this.y = y;
                }
                
                // dot prod with another vector
                dot(vector) {
                    return this.x * vector.x + this.y * vector.y
                }
            }

            class NoiseGenerator2D {
                constructor () {
                    this.permutations = new Permutation();
                }

                vector2FromPerm(value) {
                    const vector = vectors2D[value & 3];
                    return new Vector2(vector[0], vector[1]);
                }

                getNoise(x, y){
                    
                    // get corner of square point exists within
                    let xPrime = Math.floor(x) & 255;
                    let yPrime = Math.floor(y) & 255;
                    // get difference between corner and value
                    let xDiff = x - Math.floor(x);
                    let yDiff = y - Math.floor(y);

                    // vectors from corner to point
                    let bottomLeft = new Vector2(xDiff, yDiff);
                    let topLeft = new Vector2(xDiff, yDiff-1.0);
                    let bottomRight = new Vector2(xDiff - 1.0, yDiff);
                    let topRight = new Vector2(xDiff - 1.0, yDiff-1.0);

                    // corner values
                    let valueBottomLeft = this.permutations.get2(xPrime, yPrime); 
                    let valueTopLeft = this.permutations.get2(xPrime+1, yPrime);
                    let valueBottomRight = this.permutations.get2(xPrime, yPrime+1);
                    let valueTopRight = this.permutations.get2(xPrime+1, yPrime+1);

                    // vectors on corners
                    let topLeftVec = this.vector2FromPerm(this.permutations.get2(xPrime, yPrime+1))
                    let topRightVec = this.vector2FromPerm(this.permutations.get2(xPrime+1, yPrime+1))
                    let bottomLeftVec = this.vector2FromPerm(this.permutations.get2(xPrime, yPrime))
                    let bottomRightVec = this.vector2FromPerm(this.permutations.get2(xPrime+1, yPrime))

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
                    )

                    return (result + 1)*0.5
                }

                reseed() {
                    this.permutations.shuffle();
                }
            }
            

            const noise2Dgen = new NoiseGenerator2D();

            // settings
            const reseedButton = document.getElementById("reseedButton")
            const heightSlider = document.getElementById("heightSlider");
            const freqSlider = document.getElementById("freqSlider");
            const octaveSlider = document.getElementById("octaveSlider");
            const thresholdSlider = document.getElementById("thresholdSlider");
            const visualSelect = document.getElementById("visualSelect");

            // drawing
            const map2d = document.getElementById("map-2d");
            const map3d = document.getElementById("map-3d");

            function drawNoise() {
                const mode = visualSelect.value;
                if (mode == "2") {
                    map2d.style.display = "";
                    map3d.style.display = "none";
                    draw2D();
                }
                else if (mode == "3") {
                    map3d.style.display = "";
                    map2d.style.display = "none";
                    draw3D();
                }
            }

            function generateHeightGrid(width, height) {
                let heights = []
                let min = null;
                let max = null;
                for (let y = 0; y < width; y++){
                    heights.push([])
                    for (let x = 0; x < height; x++){
                        let total = 0.0;
                        let a = 1;
                        let f = parseInt(freqSlider.value) / 10000.0;
                        let octaveCount = parseInt(octaveSlider.value);
                        let finalMultiplier = 0.0;
                        for(let octave = 0; octave < octaveCount; octave++){
                            let value = a * noise2Dgen.getNoise(x * f, y * f);
                            finalMultiplier += a;
                            total += value
                            a *= 0.5;
                            f *= 2;
                        }

                        // for(let i = 0, multiplier = 0.5; i < octaveCount; i++){
                        //     finalMultiplier += multiplier;
                        //     multiplier *= 0.5
                        // }
                        total *= (1/finalMultiplier)
                        
                        if (min == null || min > total) {
                            min = total
                        }
                        
                        if (max == null || max < total) {
                            max = total
                        }

                        let step = parseInt(thresholdSlider.value)
                        let rgb = Math.round(total * 255);
                        // console.log(rgb, rgb % step, rgb - rgb % step)
                        rgb -= rgb % step
                        heights[y].push(rgb)
                    }
                }
                console.log(heights)
                console.log(min, max)
                return heights
            }

            let renderer, controls, scene, camera;
            const clock = new THREE.Clock();

            function draw3D() {
                 // remove then reinstantiate renderer in container
                 while(map3d.firstChild) {
                    map3d.removeChild(map3d.firstChild);
                }
                const width = 500;
                const height = 500;

                //setup camera
                camera = new THREE.PerspectiveCamera(25, 1, 1, 10000);
                camera.position.x = 1000;
                camera.position.y = 1000;
                camera.position.z = 1000;
				camera.lookAt(0,0,0);

                // setup scene
                scene = new THREE.Scene();
                scene.background = new THREE.Color( 0xefd1b5 );

                // const light = new THREE.PointLight( 0xffffff, 0.5, 0);
                // light.position.set(-1000, -500, -1000);
                // scene.add( light );

                // setup terrain using noise
                let heights = generateHeightGrid(500, 500); // [y][x] = height from 0 to 255 (step variable from 1 to N W/ N is <= 255)
                let terrainGeometry = new THREE.PlaneGeometry(500, 500, 499, 499);
                terrainGeometry.rotateX( - Math.PI / 2 );

                
                const vertices = terrainGeometry.attributes.position.array;

                const textureCanvas = document.createElement('canvas');
                const context = textureCanvas.getContext('2d');
                context.canvas.width = 500;
                context.canvas.height = 500;
				context.fillStyle = '#AAAAAA';
                context.fillRect( 0, 0, 500, 500);

                let data = []
                let offset = parseInt(heightSlider.value)
                for (let y = 0; y < heights.length; y++) {
                    for (let x = 0; x < heights[y].length; x++) {
                        // data.push(x, heights[y][x], y)
                        let rgb = heights[y][x];
                        data.push(rgb - offset);
                        context.fillStyle = `rgb(${rgb},${rgb},${rgb}`
                        context.fillRect(x, y, 1, 1)
                    }
                }

                console.log(data)

                // document.body.appendChild(textureCanvas)

                let texture = new THREE.CanvasTexture(textureCanvas);
                // texture.minFilter = THREE.LinearFilter;
                // texture.wrapS = THREE.ClampToEdgeWrapping;
				// texture.wrapT = THREE.ClampToEdgeWrapping;

				for ( let i = 0, j = 0, l = vertices.length; i < l; i ++, j += 3 ) {
					vertices[ j + 1 ] = data[ i ];
				}

                // material
                const material = new THREE.MeshBasicMaterial({ map: texture });

                // use terrain in mesh
                let mesh = new THREE.Mesh(terrainGeometry, material)
                scene.add(mesh)
                
                // add in flat plane to show x = 0, z = 0;
                let flatPlane = new THREE.PlaneGeometry(500, 500, 1, 1);
                flatPlane.rotateX( - Math.PI / 2 );
                let flatMat = new THREE.MeshBasicMaterial({ color: "#0000FF" });
                let flatMesh = new THREE.Mesh(flatPlane, flatMat)
                scene.add(flatMesh)

                renderer = new THREE.WebGLRenderer();
                renderer.setSize(500, 500);

                map3d.appendChild(renderer.domElement)

                // controls
                controls = new OrbitControls( camera, renderer.domElement );
				controls.movementSpeed = 150;
				controls.lookSpeed = 0.1;

                renderer.render(scene, camera)
                animate()
            }

            function animate() {

                requestAnimationFrame( animate );

                render();
            }


            function render() {

                controls.update( clock.getDelta() );
                renderer.render( scene, camera );

            }

            function draw2D() {
                let canvas = document.getElementsByTagName("canvas")[0].getContext("2d");
                // let freqSlider = document.getElementById("freqSlider").value;
                // let heightSlider = document.getElementById("heightSlider").value;
                let heights = generateHeightGrid(500, 500);
                for (let y = 0; y < 500; y++){
                    for (let x = 0; x < 500; x++){ 
                        let rgb = heights[y][x]
                        canvas.fillStyle = "rgba("+rgb+","+rgb+","+rgb+",1.0)";
                        canvas.fillRect(x, y, 1, 1)
                    }
                }
            }

            heightSlider.onchange = function() {
                drawNoise()
                document.getElementById("heightValue").innerText = heightSlider.value
            }

            freqSlider.onchange = function() {
                drawNoise()
                document.getElementById("freqValue").innerText = freqSlider.value
            }

            octaveSlider.onchange = function() {
                drawNoise()
                document.getElementById("octaveValue").innerText = octaveSlider.value
            }

            thresholdSlider.onchange = function() {
                drawNoise()
                document.getElementById("thresholdValue").innerText = thresholdSlider.value
            }
            
            visualSelect.onchange = function() {
                drawNoise();
            }


            reseedButton.onclick = function() {
                noise2Dgen.reseed();
                drawNoise()
            }

            function init() {
                document.getElementById("heightValue").innerText = heightSlider.value
                document.getElementById("freqValue").innerText = freqSlider.value
                document.getElementById("octaveValue").innerText = octaveSlider.value
                document.getElementById("thresholdValue").innerText = thresholdSlider.value
                drawNoise();
            }

            init();
