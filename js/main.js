// ------------------------------
// ----- 1. IMPORTS -------------
// ------------------------------
import Viewport from './viewport.js';
import Sidebar from './sidebar.js';
import Animator from './animator.js';
import AnimationPlayer from './player.js';
import GUI_ITEMS from './controls.js';
import * as lil from './lil-gui/lil-gui.esm.js';
import * as saveload from './saveload.js';

// ------------------------------
// ----- 2. INITIALIZATION ------
// ------------------------------
const controls = {
  bilinearInterpolation: true,
  bloom: 0.0,
  canvasSize: '512',
  hueRotation: 0,
  inputScale: 1,
  inputXOffset: 0,
  inputYOffset: 0,
  inputWidth: 512,
  inputHeight: 512,
  iterations: 20,
  n: 15,
  outsideHandling: 'mirror',
  outputXOffset: 0,
  outputYOffset: 0,
  rbfType: 'gaussian',
  rotation: 0,
  sampleMethod: 0.0,
  saturation: 1,
  spiralTurn: 0.0,
  spiralWidth: 1,
  spread: 8,
  supersampling: 4,
  value: 1,
  weightCombination: 'power',
  weightPower: 2,
  weightSquare: true,
  zoom: 150,
};

const { GUI } = lil;
const webglCanvas = document.getElementById('webgl-canvas'); // Canvas element
const gl = webglCanvas.getContext('webgl2', { premultipliedAlpha: true, alpha: true, preserveDrawingBuffer: true }); // WebGL context
const animator = new Animator(GUI_ITEMS, document.getElementById('animation-tracks'), controls);
const player = new AnimationPlayer(animator, update, gl, document.getElementById('transport'));
const viewport = new Viewport();
const gui = new GUI();
addGuiItems(gui, controls, GUI_ITEMS);
gui.onChange(update);

const inputImage = document.getElementById('input-image');
inputImage.addEventListener('load', () => {
  controls.inputWidth = inputImage.width;
  controls.inputHeight = inputImage.height;
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, inputImage);
  update();
  viewport.init();
});

const sidebar = new Sidebar();
sidebar.init(inputImage);

saveload.init(gui, animator, player, update);

// ------------------------------
// ----- 3. WEBGL INIT ----------
// ------------------------------
const vertexShaderText = await fetch('shaders/vertex.glsl').then((result) => result.text());
const fragmentShaderText = await fetch('shaders/fragment.glsl').then((result) => result.text());
const vertexShaderSource = vertexShaderText;
const fragmentShaderSource = fragmentShaderText;
function createShader(type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) {
    return shader;
  }
  console.warn(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}
const vertexShader = createShader(gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl.FRAGMENT_SHADER, fragmentShaderSource);

const program = gl.createProgram();
gl.attachShader(program, vertexShader);
gl.attachShader(program, fragmentShader);
gl.linkProgram(program);
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
  -1, -1, 0, 0,
  1, -1, 1, 0,
  -1, 1, 0, 1,
  1, 1, 1, 1,
]), gl.STATIC_DRAW);

const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

const positionLocation = gl.getAttribLocation(program, 'a_position');
const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');
gl.enableVertexAttribArray(positionLocation);
gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(texCoordLocation);
gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 16, 8);

const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

//------------------------------
// ----- 4. RENDERING LOOP -----
//------------------------------
function controlsToUniforms(guiControls) {
  const {
    bilinearInterpolation, inputWidth, inputHeight,
    inputXOffset, inputYOffset, iterations,
    n, outsideHandling, outputXOffset,
    outputYOffset, rotation: degRotation, sampleMethod, spread,
    supersampling, weightCombination: rawWeightCombination, weightPower,
    weightSquare, zoom: rawZoom, canvasSize,
    rbfType: rawRbfType, bloom, hueRotation,
    inputScale, saturation, spiralTurn,
    spiralWidth, value,
  } = guiControls;

  const [outputWidth, tempOutputHeight] = canvasSize.split('x').map((x) => parseInt(x, 10));
  const outputHeight = tempOutputHeight || outputWidth;
  const RBF_TYPES = {
    gaussian: 0, cauchy: 1, wave: 2, wave2: 3, multiquadric: 4, 'inverse-multiquadric': 5, 'inverse-quadratic': 6, expSinusoidal: 7, cubicPulse: 8, dampedCosine: 9, sinc: 10, thinPlateSpline: 11, logarithmic: 12, spline: 13, polynomial: 14, exponential: 15, rationalQuadratic: 16, bump: 17, linear: 18, cubic: 19, quintic: 20, thinPlate: 21,
  };
  const WEIGHT_COMBINATIONS = {
    sum: 0, average: 1, power: 2, min: 3, max: 4,
  };
  const SAMPLE_METHODS = {
    'around-center': 0, 'along-radius': 1,
  };

  return {
    bilinearInterpolation,
    bloom,
    hueRotation: hueRotation / 360.0,
    inputHeight,
    inputWidth,
    inputScale,
    inputXOffset: inputXOffset / 180.0,
    inputYOffset: inputYOffset / 180.0,
    iterations,
    n,
    outsideHandling,
    outputHeight,
    outputWidth,
    outputXOffset,
    outputYOffset,
    rbfType: RBF_TYPES[rawRbfType],
    rotation: (degRotation * Math.PI) / 180,
    sampleMethod,
    saturation,
    spread,
    spiralTurn,
    spiralWidth,
    supersampling,
    value,
    weightCombination: WEIGHT_COMBINATIONS[rawWeightCombination],
    weightPower,
    weightSquare: weightSquare ? 1 : 0,
    zoom: (rawZoom * rawZoom) / outputWidth,
  };
}

function update() {
  const animatedControls = animator.getAnimatedValues(player.time, controls);
  const frame = controlsToUniforms(animatedControls);

  webglCanvas.width = frame.outputWidth;
  webglCanvas.height = frame.outputHeight;
  gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);

  gl.uniform1f(gl.getUniformLocation(program, 'u_spread'), frame.spread);
  gl.uniform1f(gl.getUniformLocation(program, 'u_slices'), frame.n);
  gl.uniform1f(gl.getUniformLocation(program, 'u_zoomLevel'), frame.zoom);
  gl.uniform1f(gl.getUniformLocation(program, 'u_rotation'), frame.rotation);
  gl.uniform1i(gl.getUniformLocation(program, 'u_iterations'), frame.iterations);
  gl.uniform1i(gl.getUniformLocation(program, 'u_weightCombination'), frame.weightCombination);
  gl.uniform1f(gl.getUniformLocation(program, 'u_weightPower'), frame.weightPower);
  gl.uniform1f(gl.getUniformLocation(program, 'u_sampleMethod'), frame.sampleMethod);
  gl.uniform1i(gl.getUniformLocation(program, 'u_weightSquare'), frame.weightSquare);
  gl.uniform1f(gl.getUniformLocation(program, 'u_spiralTurn'), frame.spiralTurn);
  gl.uniform1f(gl.getUniformLocation(program, 'u_spiralWidth'), frame.spiralWidth);
  gl.uniform1i(gl.getUniformLocation(program, 'u_supersampling'), frame.supersampling);
  gl.uniform1i(gl.getUniformLocation(program, 'u_rbftype'), frame.rbfType);
  gl.uniform2f(gl.getUniformLocation(program, 'u_outputResolution'), frame.outputWidth, frame.outputHeight);
  gl.uniform1f(gl.getUniformLocation(program, 'u_inputScale'), frame.inputScale);
  gl.uniform1f(gl.getUniformLocation(program, 'u_inputXOffset'), frame.inputXOffset);
  gl.uniform1f(gl.getUniformLocation(program, 'u_inputYOffset'), frame.inputYOffset);
  gl.uniform1f(gl.getUniformLocation(program, 'u_outputXOffset'), frame.outputXOffset);
  gl.uniform1f(gl.getUniformLocation(program, 'u_outputYOffset'), frame.outputYOffset);
  gl.uniform1f(gl.getUniformLocation(program, 'u_bloom'), frame.bloom);
  gl.uniform1f(gl.getUniformLocation(program, 'u_hueRotation'), frame.hueRotation);
  gl.uniform1f(gl.getUniformLocation(program, 'u_saturation'), frame.saturation);
  gl.uniform1f(gl.getUniformLocation(program, 'u_value'), frame.value);

  switch (frame.outsideHandling) {
    case 'repeat':
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      break;
    case 'clamp':
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      break;
    case 'mirror':
    default:
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
      break;
  }

  if (frame.bilinearInterpolation) {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  } else {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  }

  gl.clearColor(1, 0, 0, 1);
  gl.clear(gl.COLOR_BUFFER_BIT);

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
}

// ------------------------------
// -------- MISCELLANEOUS --------
// ------------------------------
function clampNumberInput(input) {
  const initialValue = parseFloat(input.getAttribute('value'));
  const min = input.getAttribute('min') !== null ? parseFloat(input.getAttribute('min')) : -Infinity;
  const max = input.getAttribute('max') !== null ? parseFloat(input.getAttribute('max')) : Infinity;
  const currentValue = parseFloat(input.value);

  if (Number.isNaN(currentValue)) {
    input.value = initialValue;
  } else {
    input.value = Math.min(Math.max(currentValue, min), max);
  }
}

const numberInputs = document.querySelectorAll('input[type="number"]');

numberInputs.forEach((input) => {
  input.addEventListener('change', () => {
    clampNumberInput(input);
  });
});

function addGuiItems() {
  GUI_ITEMS.forEach((item) => {
    switch (item.type) {
      case 'select':
        gui
          .add(controls, item.key, item.options)
          .name(item.label);
        break;

      case 'float':
        gui
          .add(controls, item.key, item.min, item.max, item.step || 0.01)
          .name(item.label);
        break;

      case 'bool':
        gui
          .add(controls, item.key)
          .name(item.label);
        break;

      default:
        console.warn('Unsupported guiItem type:', item.type);
        break;
    }
  });
}

// ------------------------------
// -------- STARTUP CODE --------
// ------------------------------

// Load the default image, which will trigger the update() function
inputImage.src = 'sample_images/may.png';
