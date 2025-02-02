const canvas = document.querySelector("#gl-canvas");
const gl = canvas.getContext("webgl");

if (!gl) {
  alert("WebGL not supported");
  throw new Error("WebGL not supported");
}

// Ustawienia WebGL
gl.clearColor(0.0, 0.0, 0.0, 0.2);
gl.enable(gl.DEPTH_TEST);

// 📌 Vertex Shader
const vsSource = `
  attribute vec4 aPosition;
  attribute vec3 aNormal;
  uniform mat4 uModelViewMatrix;
  uniform mat4 uProjectionMatrix;
  varying vec3 vNormal;
  
  void main() {
    gl_Position = uProjectionMatrix * uModelViewMatrix * aPosition;
    vNormal = aNormal;
  }
`;

// 📌 Fragment Shader
const fsSource = `
  precision mediump float;
  varying vec3 vNormal;
  
  void main() {
    vec3 lightDirection = normalize(vec3(1.0, 1.0, 1.0));
    float lightIntensity = max(dot(vNormal, lightDirection), 0.2);
    vec3 color = vec3(1.0, 1.0, 1.0);
    gl_FragColor = vec4(color * lightIntensity, 1.0);
  }
`;

// 🎨 Inicjalizacja shaderów
const shaderProgram = initShaderProgram(gl, vsSource, fsSource);
const programInfo = {
  program: shaderProgram,
  attribLocations: {
    position: gl.getAttribLocation(shaderProgram, "aPosition"),
    normal: gl.getAttribLocation(shaderProgram, "aNormal"),
  },
  uniformLocations: {
    projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
    modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
  },
};

// 🔵 Tworzenie sfery
const sphere = createSphere(30, 30);
const buffers = initBuffers(gl, sphere);

// 🔥 Pozycje sfer
const spheres = [
  { x: -4, y: 0, z: -10, speed: 0.01, velocityX: 0, velocityY: 0 },
  { x: 2, y: 0, z: -5, speed: 0.015, velocityX: 0, velocityY: 0 },
  { x: 0, y: 2, z: -6, speed: 0.02, velocityX: 0, velocityY: 0 },
  { x: 1, y: 0, z: 5, speed: 0.02, velocityX: 0, velocityY: 0 },
  { x: 2, y: 5, z: 10, speed: 0.02, velocityX: 0, velocityY: 0 },
  { x: -3, y: -2, z: -8, speed: 0.018, velocityX: 0, velocityY: 0 },
  { x: 4, y: 3, z: -12, speed: 0.022, velocityX: 0, velocityY: 0 },
  { x: -2, y: 1, z: 7, speed: 0.017, velocityX: 0, velocityY: 0 },
  { x: 3, y: -1, z: -3, speed: 0.019, velocityX: 0, velocityY: 0 },
  { x: -5, y: 4, z: 9, speed: 0.025, velocityX: 0, velocityY: 0 }
];

// Add 20 more spheres with random positions and speeds
for (let i = 0; i < 20; i++) {
  spheres.push({
    x: (Math.random() - 0.5) * 20,
    y: (Math.random() - 0.5) * 20,
    z: (Math.random() - 0.5) * 20,
    speed: Math.random() * 0.03 + 0.01,
    velocityX: 0,
    velocityY: 0
  });
}

let angle = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;
let selectedSphere = null;

// 🌀 Renderowanie
function render() {
  angle += 0.01;

  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Macierz perspektywy
  const fieldOfView = (45 * Math.PI) / 180;
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
  const projectionMatrix = mat4.create();
  mat4.perspective(projectionMatrix, fieldOfView, aspect, 0.1, 100.0);

  // Update sphere positions based on velocity
  spheres.forEach((sphere) => {
    sphere.x += sphere.velocityX;
    sphere.y += sphere.velocityY;

    // Apply friction to slow down the sphere over time
    sphere.velocityX *= 0.98;
    sphere.velocityY *= 0.98;
  });

  // Rysowanie każdej sfery
  spheres.forEach((sphereData, index) => {
    const modelViewMatrix = mat4.create();
    mat4.translate(modelViewMatrix, modelViewMatrix, [sphereData.x, sphereData.y, sphereData.z]);
    mat4.rotateY(modelViewMatrix, modelViewMatrix, angle * sphereData.speed * 100);
    mat4.rotateX(modelViewMatrix, modelViewMatrix, angle * sphereData.speed * 50);

    drawSphere(projectionMatrix, modelViewMatrix);
  });

  requestAnimationFrame(render);
}

requestAnimationFrame(render);

// 📌 Rysowanie sfery
function drawSphere(projectionMatrix, modelViewMatrix) {
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.position);
  gl.vertexAttribPointer(programInfo.attribLocations.position, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.position);

  gl.bindBuffer(gl.ARRAY_BUFFER, buffers.normal);
  gl.vertexAttribPointer(programInfo.attribLocations.normal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(programInfo.attribLocations.normal);

  gl.useProgram(programInfo.program);
  gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, projectionMatrix);
  gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, modelViewMatrix);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, buffers.indices);
  gl.drawElements(gl.TRIANGLES, sphere.indices.length, gl.UNSIGNED_SHORT, 0);
}

// 📌 Generowanie sfery
function createSphere(latitudeBands, longitudeBands) {
  const positions = [];
  const normals = [];
  const indices = [];

  for (let lat = 0; lat <= latitudeBands; lat++) {
    const theta = (lat * Math.PI) / latitudeBands;
    const sinTheta = Math.sin(theta);
    const cosTheta = Math.cos(theta);

    for (let lon = 0; lon <= longitudeBands; lon++) {
      const phi = (lon * 2 * Math.PI) / longitudeBands;
      const sinPhi = Math.sin(phi);
      const cosPhi = Math.cos(phi);

      const x = cosPhi * sinTheta;
      const y = cosTheta;
      const z = sinPhi * sinTheta;

      positions.push(x, y, z);
      normals.push(x, y, z);
    }
  }

  for (let lat = 0; lat < latitudeBands; lat++) {
    for (let lon = 0; lon <= longitudeBands; lon++) {
      const first = lat * (longitudeBands + 1) + lon;
      const second = first + longitudeBands + 1;

      indices.push(first, second, first + 1);
      indices.push(second, second + 1, first + 1);
    }
  }

  return { positions, normals, indices };
}

// 📌 Bufory WebGL
function initBuffers(gl, sphere) {
  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.positions), gl.STATIC_DRAW);

  const normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphere.normals), gl.STATIC_DRAW);

  const indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sphere.indices), gl.STATIC_DRAW);

  return { position: positionBuffer, normal: normalBuffer, indices: indexBuffer };
}

// 📌 Shader Program
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error("Shader program failed to link: " + gl.getProgramInfoLog(shaderProgram));
    return null;
  }
  return shaderProgram;
}

// 📌 Kompilacja shaderów
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error: " + gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

// Event listeners for moving spheres
canvas.addEventListener('mousedown', (event) => {
  isDragging = true;
  lastMouseX = event.clientX;
  lastMouseY = event.clientY;

  // Detect which sphere is clicked
  const rect = canvas.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / canvas.width) * 2 - 1;
  const y = ((event.clientY - rect.top) / canvas.height) * -2 + 1;

  selectedSphere = null;
  let minDistance = Infinity;

  spheres.forEach((sphere, index) => {
    const distance = Math.sqrt((sphere.x - x) ** 2 + (sphere.y - y) ** 2);
    if (distance < minDistance) {
      minDistance = distance;
      selectedSphere = sphere;
    }
  });
});

canvas.addEventListener('mousemove', (event) => {
  if (isDragging && selectedSphere) {
    const deltaX = event.clientX - lastMouseX;
    const deltaY = event.clientY - lastMouseY;
    selectedSphere.x += deltaX * 0.01;
    selectedSphere.y -= deltaY * 0.01;
    selectedSphere.velocityX = deltaX * 0.01;
    selectedSphere.velocityY = -deltaY * 0.01;
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
  }
});

canvas.addEventListener('mouseup', () => {
  isDragging = false;
  selectedSphere = null;
});

canvas.addEventListener('mouseleave', () => {
  isDragging = false;
  selectedSphere = null;
});