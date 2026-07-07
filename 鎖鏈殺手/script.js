import * as THREE from "https://unpkg.com/three@0.120.0/build/three.module.js";
import { EffectComposer } from "https://unpkg.com/three@0.120.0/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "https://unpkg.com/three@0.120.0/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "https://unpkg.com/three@0.120.0/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OrbitControls } from "https://unpkg.com/three@0.120.0/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "https://unpkg.com/three@0.120.0/examples/jsm/loaders/GLTFLoader.js";

const configs = {
  "Solar Flare (太陽耀斑)": {
    geometry: "Sphere",
    color0: [255, 120, 20], 
    color1: [255, 200, 50], 
    bloomStrength: 1.8,
    bloomRadius: 0.8,
    speed: 0.0004,
    scale: 12.0,
    displacementStrength: 0.05,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 1.0
  },
  "Candle Flame (平面燭火)": {
    geometry: "Plane",
    color0: [255, 80, 0],
    color1: [255, 255, 150],
    bloomStrength: 1.2,
    bloomRadius: 0.6,
    speed: 0.0008,
    scale: 8.0,
    displacementStrength: 0.0,
    wireframe: false,
    is2D: 1.0,
    fadeTop: 1.0
  },
  "Campfire Cone (立體營火)": {
    geometry: "Cone",
    color0: [255, 100, 0],
    color1: [255, 220, 50],
    bloomStrength: 1.5,
    bloomRadius: 0.7,
    speed: 0.0006,
    scale: 10.0,
    displacementStrength: 0.15,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 1.0
  },
  "Ghost Ring (幽靈火環)": {
    geometry: "Torus",
    color0: [0, 150, 255],
    color1: [50, 0, 255],
    bloomStrength: 2.2,
    bloomRadius: 1.0,
    speed: 0.0006,
    scale: 15.0,
    displacementStrength: 0.2,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 0.0
  },
  "Fire Pillar (烈焰火柱)": {
    geometry: "Cylinder",
    color0: [255, 50, 0],
    color1: [255, 200, 100],
    bloomStrength: 1.8,
    bloomRadius: 0.8,
    speed: 0.0008,
    scale: 8.0,
    displacementStrength: 0.1,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 0.0
  },
  "Flaming Heart (燃燒之心)": {
    geometry: "Heart",
    color0: [255, 0, 80],
    color1: [255, 100, 150],
    bloomStrength: 2.0,
    bloomRadius: 0.9,
    speed: 0.0006,
    scale: 12.0,
    displacementStrength: 0.1,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 0.0
  },
  "Star (閃耀之星)": {
    geometry: "Star",
    color0: [255, 200, 0],
    color1: [255, 255, 150],
    bloomStrength: 2.2,
    bloomRadius: 1.0,
    speed: 0.0006,
    scale: 12.0,
    displacementStrength: 0.15,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 0.0
  },
  "Fire Elemental (火焰精靈)": {
    geometry: "Elemental",
    color0: [255, 60, 10],
    color1: [255, 200, 50],
    bloomStrength: 2.0,
    bloomRadius: 0.8,
    speed: 0.0006,
    scale: 12.0,
    displacementStrength: 0.1,
    wireframe: false,
    is2D: 0.0,
    fadeTop: 0.0
  },
  "Goddess (女神)": {
    geometry: "Goddess",
    color0: [150, 0, 255],    // 深紫羅蘭色外緣
    color1: [255, 100, 255],  // 明亮粉紫色核心
    bloomStrength: 0.8,
    bloomRadius: 0.1,
    speed: 0.0004,
    scale: 30.0, 
    displacementStrength: 0.309, // 高扭曲度讓女神變成劇烈燃燒的火團
    wireframe: false,
    is2D: 0.0,
    fadeTop: 1.0, // 頂部淡出，製造火焰往上消散的效果
    dynamicColor: true // 開啟自動色彩變換
  },
  "Custom Model (自訂模型)": {
    geometry: "Custom",
    color0: [255, 0, 100],
    color1: [255, 200, 50],
    bloomStrength: 2.0,
    bloomRadius: 0.8,
    speed: 0.0006,
    scale: 12.0,
    displacementStrength: 0.02, // 針對精細模型，扭曲幅度設小一點比較好看
    wireframe: false,
    is2D: 0.0,
    fadeTop: 0.0
  },
  "Emerald Matrix (翡翠矩陣)": {
    geometry: "TorusKnot",
    color0: [50, 255, 100],
    color1: [0, 50, 10],
    bloomStrength: 1.5,
    bloomRadius: 0.9,
    speed: 0.0005,
    scale: 20.0,
    displacementStrength: 0.1,
    wireframe: true,
    is2D: 0.0,
    fadeTop: 0.0
  }
};

let currentConfigName = "Goddess (女神)";

var options = {
  preset: currentConfigName,
  bloomThreshold: 0,
  bloomStrength: configs[currentConfigName].bloomStrength,
  bloomRadius: configs[currentConfigName].bloomRadius,
  color0: configs[currentConfigName].color0,
  color1: configs[currentConfigName].color1,
  speed: configs[currentConfigName].speed,
  scale: configs[currentConfigName].scale,
  displacementStrength: configs[currentConfigName].displacementStrength,
  wireframe: configs[currentConfigName].wireframe,
  is2D: configs[currentConfigName].is2D,
  fadeTop: configs[currentConfigName].fadeTop,
  dynamicColor: configs[currentConfigName].dynamicColor || false
};

var gui = new dat.GUI({ width: 320, autoPlace: false });

gui.add(options, "preset", Object.keys(configs)).name("Flame Form (型態)").onChange(applyPreset);

var bloom = gui.addFolder("Bloom (光暈)");
bloom.add(options, "bloomStrength", 0.0, 5.0).name("Strength").listen();
bloom.add(options, "bloomRadius", 0.1, 2.0).name("Radius").listen();
bloom.open();

var color = gui.addFolder("Colors (顏色)");
color.add(options, "dynamicColor").name("Dynamic (自動變換)").listen();
color.addColor(options, "color0").name("Border (外緣)").listen();
color.addColor(options, "color1").name("Base (核心)").listen();
color.open();

var settings = gui.addFolder("Settings (設定)");
settings.add(options, "speed", 0.0, 0.002).name("Speed").listen();
settings.add(options, "scale", 1.0, 30.0).name("Noise Scale").listen();
settings.add(options, "displacementStrength", 0.0, 1.0).name("Displacement").listen();
settings.add(options, "fadeTop", 0.0, 1.0).name("Fade Top").listen();
settings.add(options, "wireframe").name("Wireframe").onChange(() => {
  if (material) material.wireframe = options.wireframe;
}).listen();
settings.open();

const noiseFunctions = `
  #define NUM_OCTAVES 5

  float rand(vec2 n) {
    return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453);
  }

  float noise(vec2 p){
    vec2 ip = floor(p);
    vec2 u = fract(p);
    u = u*u*(3.0-2.0*u);

    float res = mix(
      mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),
      mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
    return res*res;
  }

  float fbm(vec2 x) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.50));
    for (int i = 0; i < NUM_OCTAVES; ++i) {
      v += a * noise(x);
      x = rot * x * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }
`;

const vert = `
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vPosition;
  uniform float time;
  uniform float speed;
  uniform float displacementStrength;
  uniform float is2D;

  ` + noiseFunctions + `

  void main() {
    vNormal = normal;
    vUv = uv;
    vPosition = position;
    
    // 如果是 2D 平面，使用 UV 來計算波動；如果是立體，則使用法線。
    vec2 p = mix(normal.xy, uv, is2D) * 2.0 + time * speed * 2.0;
    float displacement = fbm(p * 5.0) * displacementStrength;
    
    vec3 newPosition;
    if (is2D > 0.5) {
      newPosition = position; // 2D 不做頂點立體位移
    } else {
      newPosition = position + normal * displacement;
    }

    gl_Position = projectionMatrix * modelViewMatrix * vec4( newPosition, 1.0 );
  }
`;

const frag = `
  uniform vec2 resolution;
  uniform vec3 color1;
  uniform vec3 color0;
  uniform float time;
  uniform float speed;
  uniform float scale;
  uniform float is2D;
  uniform float fadeTop;
  varying vec3 vNormal;
  varying vec2 vUv;
  varying vec3 vPosition;

  ` + noiseFunctions + `

  vec3 rgbcol(float r, float g, float b) {
    return vec3(r/255.0,g/255.0,b/255.0);
  }

  float setOpacity(float r, float g, float b) {
    float tone = (r + g + b) / 3.0;
    float alpha = 1.0;
    if(tone<0.99) {
      alpha = 0.0;
    }
    return alpha;
  }

  void main() {
    // 依據是否為2D選擇貼圖座標
    vec2 uv = mix(normalize(vNormal).xy * 0.5 + 0.5, vUv, is2D);
    vec2 newUv = uv + vec2(0.0, -time * speed);
    vec2 p = newUv * scale;
    float n = fbm( p + fbm( p ) );

    // fadeTop 決定是否要在頂部淡出。0.0 為全滿形狀(以 noise 決定透明)，1.0 為從下到上漸層淡出。
    float fadeBack = mix(0.65, 1.0 - uv.y, fadeTop);
    float fadeFront = mix(0.75, 1.08 - uv.y, fadeTop);

    vec4 backColor = vec4(fadeBack) + vec4(vec3(n*(fadeBack)),1.0);
    float aback = setOpacity(backColor.r,backColor.g,backColor.b);
    backColor.a = aback;
    backColor.rgb = rgbcol(color1.r,color1.g,color1.b);

    vec4 frontColor = vec4(fadeFront) + vec4(vec3(n*(fadeBack)),1.0);
    float afront = setOpacity(frontColor.r,frontColor.g,frontColor.b);
    frontColor.a = afront ;
    frontColor.rgb = rgbcol(color0.r,color0.g,color0.b);

    // 邊緣混合計算
    frontColor.a = frontColor.a - backColor.a;

    // 若為 2D (平面燭火)，需要加上火焰的遮罩讓它呈現水滴狀/火焰狀
    if (is2D > 0.5) {
       vec2 centeredUv = vUv - vec2(0.5, 0.0);
       // 越往上(vUv.y越大)，寬度越窄
       float flameWidth = 0.5 * (1.0 - vUv.y) * (1.0 - vUv.y); 
       // 產生遮罩
       float mask = 1.0 - smoothstep(flameWidth - 0.1, flameWidth + 0.05, abs(centeredUv.x));
       
       // 底部圓角修飾
       if (vUv.y < 0.1) {
           float d = length(centeredUv - vec2(0.0, 0.1));
           mask *= 1.0 - smoothstep(0.05, 0.1, d);
       }
       // 頂部直接消失
       mask *= smoothstep(1.0, 0.8, vUv.y);

       frontColor.a *= mask;
       backColor.a *= mask;
    }

    if(frontColor.a>0.0){
      gl_FragColor = frontColor;
    } else {
      gl_FragColor = backColor;
    }
  }
`;

const textVert = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
  }
`;

const textFrag = `
  uniform vec3 color1;
  uniform vec3 color0;
  uniform float time;
  uniform float speed;
  uniform float scale;
  uniform float fadeTop;
  uniform float textOpacity;
  uniform sampler2D textTexture;
  varying vec2 vUv;

  ` + noiseFunctions + `

  vec3 rgbcol(float r, float g, float b) {
    return vec3(r/255.0,g/255.0,b/255.0);
  }

  float setOpacity(float r, float g, float b) {
    float tone = (r + g + b) / 3.0;
    float alpha = 1.0;
    if(tone<0.99) {
      alpha = 0.0;
    }
    return alpha;
  }

  void main() {
    vec2 uv = vUv;
    vec2 newUv = uv + vec2(0.0, -time * speed);
    vec2 p = newUv * scale;
    float n = fbm( p + fbm( p ) );

    // 完全套用與女神相同的邊緣燃燒計算
    float fadeBack = mix(0.65, 1.0 - uv.y, fadeTop);
    float fadeFront = mix(0.75, 1.08 - uv.y, fadeTop);

    vec4 backColor = vec4(fadeBack) + vec4(vec3(n*(fadeBack)),1.0);
    float aback = setOpacity(backColor.r,backColor.g,backColor.b);
    backColor.a = aback;
    backColor.rgb = rgbcol(color1.r,color1.g,color1.b);

    vec4 frontColor = vec4(fadeFront) + vec4(vec3(n*(fadeBack)),1.0);
    float afront = setOpacity(frontColor.r,frontColor.g,frontColor.b);
    frontColor.a = afront ;
    frontColor.rgb = rgbcol(color0.r,color0.g,color0.b);

    frontColor.a = frontColor.a - backColor.a;

    vec4 finalColor;
    if(frontColor.a>0.0){
      finalColor = frontColor;
    } else {
      finalColor = backColor;
    }
    
    vec4 texel = texture2D(textTexture, vUv);
    
    // 將這個火焰效果限制在文字的筆畫範圍內
    finalColor.a *= texel.a * textOpacity;
    
    gl_FragColor = finalColor;
  }
`;

// (Background Branching System removed per user request)

var scene,
  camera,
  renderer,
  width = window.innerWidth,
  height = window.innerHeight,
  material,
  bloomPass,
  composer,
  controls,
  currentMesh,
  chainsMesh,
  starsMesh,
  mouseChainMesh,
  triggerCube,
  triggerCubeCore,
  triggerCubeLight;

let mouse = new THREE.Vector2();
let targetMouse = new THREE.Vector2();
let mouseChainPos = [];
const mouseChainLinks = 50;
let pairingTriggered = false;
let cubeExplosionPieces = [];

var uniforms = {
  time: { type: "f", value: 10.0 },
  resolution: { value: new THREE.Vector2(width, height) },
  color1: { value: new THREE.Vector3(...options.color1) },
  color0: { value: new THREE.Vector3(...options.color0) },
  speed: { value: options.speed },
  scale: { value: options.scale },
  displacementStrength: { value: options.displacementStrength },
  is2D: { value: options.is2D },
  fadeTop: { value: options.fadeTop }
};

// --- Floating Subtitle System ---
let floatingTexts = [];
let textCursor = { active: false, isLeft: true, x: -8, y: 8, z: -3 };

window.resetTextCursor = function() {
  textCursor.active = false;
};

window.startNewFloatingSentence = function() {
  textCursor.active = true;
  textCursor.isLeft = Math.random() > 0.5;
  
  // 動態計算相機在 Z=-3 時的可視範圍 (相機在 Z=5, 距離 8, FOV=75)
  let visibleHeight = 2 * 8 * Math.tan((75 / 2) * (Math.PI / 180)); // 約 12.27
  let visibleWidth = visibleHeight * (window.innerWidth / window.innerHeight);
  
  let halfW = visibleWidth / 2;
  let halfH = visibleHeight / 2;
  
  let maxX = halfW - 0.8; // 扣掉一點邊緣安全距離
  let minX = 0.8; // 縮小避開中央的區域，讓文字可以出現在中間一點的地方
  
  // 如果視窗太窄(例如手機直向)，就不避開中央了，直接重疊
  if (maxX < minX + 1.0) {
    minX = 0;
  }
  
  let range = maxX - minX;
  if (range < 0) range = 0;
  
  // 隨機在合法的範圍內選擇 X
  textCursor.x = textCursor.isLeft ? 
    (-minX - Math.random() * range) : 
    (minX + Math.random() * range);
    
  // Y: 從畫面上緣開始往下
  textCursor.y = halfH - 1.0;
  textCursor.z = -3;
};

window.spawnFloatingText = function(textStr) {
  if (!textStr) return;
  
  // 動態計算畫面底部界線
  let visibleHeight = 2 * 8 * Math.tan((75 / 2) * (Math.PI / 180));
  let bottomY = -(visibleHeight / 2) + 1.0;
  
  // 逐字處理，遇標點符號換行
  for (let i = 0; i < textStr.length; i++) {
    let char = textStr[i].trim();
    if (char === '') continue; 
    
    if (/[，。！？、\n]/.test(char)) {
      window.startNewFloatingSentence();
      continue; 
    }
    
    if (!textCursor.active) {
      window.startNewFloatingSentence();
    }
    
    spawnSingleCharacter(char, textCursor.x, textCursor.y, textCursor.z);
    
    // 往下排版
    textCursor.y -= 1.4; 
    
    // 到底部自動換行
    if (textCursor.y < bottomY) {
      window.startNewFloatingSentence();
    }
  }
};

function spawnSingleCharacter(char, posX, posY, posZ) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.font = 'bold 80px "Microsoft JhengHei", "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  // 只需要純白文字作為 shader 的遮罩 (mask)
  ctx.fillStyle = '#ffffff'; 
  ctx.fillText(char, canvas.width / 2, canvas.height / 2);
  
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  
  // 幾何體大小
  const geo = new THREE.PlaneGeometry(1.5, 1.5);
  
  // 使用特製的火焰 shader
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: Math.random() * 100 }, // 給予隨機初始時間，讓每個字的火不一樣
      color0: { value: new THREE.Vector3(255, 30, 10) }, // 火焰紅
      color1: { value: new THREE.Vector3(255, 150, 0) }, // 橘色核心
      speed: { value: 0.0015 },
      scale: { value: 6.0 },
      fadeTop: { value: 0.0 },
      textTexture: { value: texture },
      textOpacity: { value: 0.0 }
    },
    vertexShader: textVert,
    fragmentShader: textFrag,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  
  const mesh = new THREE.Mesh(geo, mat);
  
  mesh.position.set(posX, posY, posZ);
  
  scene.add(mesh);
  
  floatingTexts.push({
    mesh: mesh,
    life: 1.0,
    driftX: 0, // 停止左右漂浮，確保句子能排整齊
    driftY: 0.003 // 全體一起極緩慢上升
  });
}
// --- End Floating Subtitle System ---

function init() {
  scene = new THREE.Scene();
  
  // 繪製宇宙星空背景
  const starGeo = new THREE.BufferGeometry();
  const starCount = 3000;
  const starPos = new Float32Array(starCount * 3);
  for(let i = 0; i < starCount; i++) {
    let r = 40 + Math.random() * 60; // 產生半徑 40~100 的球狀分佈
    let theta = Math.random() * Math.PI * 2;
    let phi = Math.acos((Math.random() * 2) - 1);
    
    starPos[i*3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i*3+2] = r * Math.cos(phi);
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.15,
    transparent: true,
    opacity: 0.8,
    sizeAttenuation: true
  });
  starsMesh = new THREE.Points(starGeo, starMat);
  scene.add(starsMesh);

  // 繪製鎖鏈背景
  // 【效能優化 1】降低圓環的幾何多邊形數量：原本是 16, 32，改為 8, 16，單一個環的頂點數直接減少 75%
  const torusGeo = new THREE.TorusGeometry(0.6, 0.15, 8, 16);
  const chainMat = new THREE.MeshStandardMaterial({
    color: 0x333333, // 深灰色
    metalness: 0.9,
    roughness: 0.4
  });
  
  const chainCount = 40; 
  const linksPerChain = 80; 
  const totalLinks = chainCount * linksPerChain;
  chainsMesh = new THREE.InstancedMesh(torusGeo, chainMat, totalLinks);
  
  const dummy = new THREE.Object3D();
  const up = new THREE.Vector3(0, 1, 0);
  let instanceIndex = 0;
  
  for(let i = 0; i < chainCount; i++) {
    // 隨機起點，讓鎖鏈遍佈整個 3D 空間
    let currentPos = new THREE.Vector3(
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100,
      (Math.random() - 0.5) * 100
    );
    
    // 初始 3D 方向
    let currentDir = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    
    // 隨機產生一個垂直於初始方向的「彎曲軸」
    let temp = new THREE.Vector3(Math.random(), Math.random(), Math.random()).normalize();
    let bendAxis = new THREE.Vector3().crossVectors(currentDir, temp).normalize();
    
    // 讓鎖鏈產生自然波浪曲線的參數
    let bendFreq = Math.random() * 0.05 + 0.02; // 彎曲的頻率
    let bendAmp = Math.random() * 0.1; // 彎曲的幅度
    let chainRotY = Math.random() * Math.PI; // 鎖鏈自轉角度
    
    for(let j = 0; j < linksPerChain; j++) {
      // 利用正弦函數計算目前的彎曲角度，並以此旋轉方向向量
      let currentBend = Math.sin(j * bendFreq) * bendAmp;
      currentDir.applyAxisAngle(bendAxis, currentBend).normalize();
      
      // 沿著最新的方向前進 0.9 單位
      currentPos.add(currentDir.clone().multiplyScalar(0.9));
      dummy.position.copy(currentPos);
      
      // 計算從 Y 軸旋轉到目前方向的四元數，讓環的方向對齊曲線切線
      let quaternion = new THREE.Quaternion().setFromUnitVectors(up, currentDir);
      
      // 先設定環與環的 90 度交錯
      dummy.rotation.set(0, chainRotY + (j % 2 === 0 ? 0 : Math.PI / 2), 0);
      // 再套用 3D 曲線方向旋轉
      dummy.applyQuaternion(quaternion);
      
      dummy.updateMatrix();
      chainsMesh.setMatrixAt(instanceIndex++, dummy.matrix);
    }
  }
  scene.add(chainsMesh);

  // 建立滑鼠互動的專屬鎖鏈
  mouseChainMesh = new THREE.InstancedMesh(torusGeo, chainMat, mouseChainLinks);
  mouseChainMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage); // 優化頻繁更新
  for(let i=0; i<mouseChainLinks; i++) {
     mouseChainPos.push(new THREE.Vector3(0, -i * 0.9, 0.8)); // 稍微推遠
  }
  scene.add(mouseChainMesh);

  // 加入光源照亮金屬鎖鏈，使用較冷或中性的光源避免變成咖啡色
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 10, 5);
  scene.add(dirLight);
  const dirLight2 = new THREE.DirectionalLight(0xaabbff, 0.8);
  dirLight2.position.set(-5, -5, -5);
  scene.add(dirLight2);

  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
  camera.position.z = 2.5; // 讓初始鏡頭更靠近
  camera.position.y = 0;

  renderer = new THREE.WebGLRenderer({ alpha: true });
  renderer.antialias = true;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  document.getElementById("world").appendChild(renderer.domElement);

  camera.position.z = 5;

  // 移除閃電效果，只保留主場景

  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.autoRotate = false; // 關閉 360 度自動旋轉，確保正面朝前
  
  // 限制左右旋轉角度，最多只能轉 45 度，防止繞到背後
  controls.minAzimuthAngle = -Math.PI / 4;
  controls.maxAzimuthAngle = Math.PI / 4;
  
  // 限制上下視角，防止翻到底部或頂部
  controls.minPolarAngle = Math.PI / 3;
  controls.maxPolarAngle = Math.PI * 2/3;
  
  controls.enablePan = false;

  var renderScene = new RenderPass(scene, camera);

  bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    1.5,
    0.4,
    0.85
  );
  bloomPass.threshold = options.bloomThreshold;
  bloomPass.strength = options.bloomStrength;
  bloomPass.radius = options.bloomRadius;

  composer = new EffectComposer(renderer);
  composer.addPass(renderScene);
  composer.addPass(bloomPass);

  createTriggerCube();
  applyPreset(options.preset);
  animate();
}

function viewportPointToWorld(ndcX, ndcY, distance) {
  const vector = new THREE.Vector3(ndcX, ndcY, 0.5);
  vector.unproject(camera);
  vector.sub(camera.position).normalize();
  return camera.position.clone().add(vector.multiplyScalar(distance));
}

function createTriggerCube() {
  triggerCube = new THREE.Group();

  const cubeGeo = new THREE.BoxGeometry(0.82, 0.82, 0.82, 4, 4, 4);
  const cubeMat = new THREE.MeshStandardMaterial({
    color: 0x9f1118,
    metalness: 1,
    roughness: 0.26,
    emissive: 0x2a0204,
    emissiveIntensity: 0.22
  });
  triggerCubeCore = new THREE.Mesh(cubeGeo, cubeMat);
  triggerCubeCore.name = "pairing-trigger-cube";
  triggerCubeCore.castShadow = true;
  triggerCube.add(triggerCubeCore);

  triggerCubeLight = new THREE.PointLight(0xffffff, 2.4, 5.5);
  triggerCubeLight.position.set(-0.35, 0.45, 1.2);
  triggerCube.add(triggerCubeLight);

  triggerCube.scale.setScalar(0.9);
  scene.add(triggerCube);
  updateTriggerCubePosition();
}

function updateTriggerCubePosition() {
  if (!triggerCube || pairingTriggered) return;
  triggerCube.position.copy(viewportPointToWorld(0.68, -0.58, 4.2));
  triggerCube.lookAt(camera.position);
}

function isMouseChainTouchingCube() {
  if (!triggerCube || pairingTriggered || !mouseChainPos.length) return false;
  return mouseChainPos[0].distanceTo(triggerCube.position) < 1.08;
}

function triggerCubeExplosion() {
  if (!triggerCube || pairingTriggered) return;
  pairingTriggered = true;

  const origin = triggerCube.position.clone();
  scene.remove(triggerCube);

  const shardMat = new THREE.MeshStandardMaterial({
    color: 0xb9c2cc,
    metalness: 1,
    roughness: 0.28,
    emissive: 0x233652,
    emissiveIntensity: 0.45,
    transparent: true,
    opacity: 1
  });

  for (let i = 0; i < 64; i++) {
    const size = 0.08 + Math.random() * 0.16;
    const shard = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), shardMat.clone());
    const offset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8
    );
    shard.position.copy(origin).add(offset);
    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(shard);

    const velocity = offset.lengthSq() > 0.001
      ? offset.normalize().multiplyScalar(0.08 + Math.random() * 0.16)
      : new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(0.12);
    cubeExplosionPieces.push({
      mesh: shard,
      velocity,
      rotation: new THREE.Vector3(Math.random() * 0.18, Math.random() * 0.18, Math.random() * 0.18),
      life: 1
    });
  }

  const flash = new THREE.PointLight(0xffffff, 6, 12);
  flash.position.copy(origin);
  scene.add(flash);
  cubeExplosionPieces.push({ light: flash, life: 0.35 });

  setTimeout(() => {
    if (typeof window.startGeminiPairing === "function") {
      window.startGeminiPairing();
    }
  }, 650);
}

function createObject() {
  if (currentMesh) {
    scene.remove(currentMesh);
    // 清除舊的 Geometry 釋放記憶體 (處理單一 Mesh 或 Group)
    if (currentMesh.isGroup) {
      currentMesh.traverse(child => {
        if (child.isMesh && child.geometry) child.geometry.dispose();
      });
    } else if (currentMesh.geometry) {
      currentMesh.geometry.dispose();
    }
    if (material) material.dispose();
  }

  const geomType = configs[options.preset].geometry;
  
  material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    transparent: true,
    vertexShader: vert,
    fragmentShader: frag,
    wireframe: options.wireframe,
    side: THREE.DoubleSide
  });

  // 如果是火焰精靈，用多個基本形狀組合成一個 Group
  if (geomType === "Elemental") {
    currentMesh = new THREE.Group();
    
    const headGeom = new THREE.SphereGeometry(0.5, 64, 64);
    const head = new THREE.Mesh(headGeom, material);
    head.position.set(0, 1.8, 0);
    currentMesh.add(head);

    const bodyGeom = new THREE.CylinderGeometry(0.6, 0.4, 1.5, 64, 16);
    const body = new THREE.Mesh(bodyGeom, material);
    body.position.set(0, 0.5, 0);
    currentMesh.add(body);

    const armGeom = new THREE.CylinderGeometry(0.15, 0.1, 1.2, 32, 8);
    const lArm = new THREE.Mesh(armGeom, material);
    lArm.position.set(-0.9, 0.8, 0);
    lArm.rotation.z = Math.PI / 6;
    currentMesh.add(lArm);

    const rArm = new THREE.Mesh(armGeom, material);
    rArm.position.set(0.9, 0.8, 0);
    rArm.rotation.z = -Math.PI / 6;
    currentMesh.add(rArm);

    const legGeom = new THREE.CylinderGeometry(0.2, 0.15, 1.4, 32, 8);
    const lLeg = new THREE.Mesh(legGeom, material);
    lLeg.position.set(-0.3, -0.9, 0);
    currentMesh.add(lLeg);

    const rLeg = new THREE.Mesh(legGeom, material);
    rLeg.position.set(0.3, -0.9, 0);
    currentMesh.add(rLeg);

    currentMesh.position.y = -0.5; // 整體置中
    scene.add(currentMesh);
    return;
  }

  // 如果是火焰女神，載入資料夾內的模型
  if (geomType === "Goddess") {
    currentMesh = new THREE.Group();
    scene.add(currentMesh);

    const loader = new GLTFLoader();
    loader.load(
      'statue_of_a_woman/scene.gltf',
      function ( gltf ) {
        const model = gltf.scene;
        
        // 走訪模型中所有的網格，並套用我們的火焰材質
        model.traverse(function (child) {
          if (child.isMesh) {
            child.material = material;
          }
        });
        
        // 自動計算模型大小並縮放/置中
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z);
        const targetSize = 4.5; // 我們場景適合的大小
        const scale = targetSize / maxDim;
        
        model.scale.set(scale, scale, scale);
        
        // 置中
        model.position.x = -center.x * scale;
        model.position.y = -center.y * scale - 1.0; // 稍微往下移
        model.position.z = -center.z * scale;

        currentMesh.add(model);

        // --- 增加紅色光球眼睛 ---
        const eyeGeo = new THREE.SphereGeometry(1, 16, 16);
        // 使用純紅色，配合原本的 Bloom 發光效果
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        
        window.eyeLeft = new THREE.Mesh(eyeGeo, eyeMat);
        window.eyeRight = new THREE.Mesh(eyeGeo, eyeMat);
        currentMesh.add(window.eyeLeft);
        currentMesh.add(window.eyeRight);
        
        // 定義更新眼睛位置與大小的函數
        window.updateEyes = function() {
          if(!window.eyeLeft || !window.eyeRight) return;
          window.eyeLeft.position.set(-options.eyeX, options.eyeY, options.eyeZ);
          window.eyeRight.position.set(options.eyeX, options.eyeY, options.eyeZ);
          window.eyeLeft.scale.setScalar(options.eyeSize);
          window.eyeRight.scale.setScalar(options.eyeSize);
        };
        
        // 第一次載入時，建立控制參數與面板，方便對齊模型臉部位置
        if (!window.eyeFolderAdded) {
          window.eyeFolderAdded = true;
          // 預估的大約位置
          options.eyeY = 0.85;
          options.eyeZ = 0.25;
          options.eyeX = 0.06;
          options.eyeSize = 0.03;
          let eyeFolder = gui.addFolder("Goddess Eyes (眼睛微調)");
          eyeFolder.add(options, "eyeY", -2.0, 3.0).name("Height (高低)").onChange(updateEyes);
          eyeFolder.add(options, "eyeZ", -2.0, 2.0).name("Depth (深淺)").onChange(updateEyes);
          eyeFolder.add(options, "eyeX", 0.0, 0.5).name("Spacing (間距)").onChange(updateEyes);
          eyeFolder.add(options, "eyeSize", 0.01, 0.2).name("Size (大小)").onChange(updateEyes);
          eyeFolder.open();
        }
        updateEyes();
      },
      undefined,
      function ( error ) {
        console.error("載入雕像模型失敗", error);
        alert("載入模型失敗！請確認有啟動 Local Server。");
      }
    );
    return;
  }

  // 如果是自訂模型，透過 GLTFLoader 載入
  if (geomType === "Custom") {
    currentMesh = new THREE.Group();
    scene.add(currentMesh);

    const loader = new GLTFLoader();
    loader.load(
      'model.glb', // 預設讀取同資料夾下的 model.glb
      function ( gltf ) {
        const model = gltf.scene;
        
        // 走訪模型中所有的網格，並套用我們的火焰材質
        model.traverse(function (child) {
          if (child.isMesh) {
            child.material = material;
          }
        });
        
        // 根據模型原始尺寸，您可能需要調整這裡的縮放比例與位置
        // model.scale.set(1.0, 1.0, 1.0);
        // model.position.y = -1.5;
        
        currentMesh.add(model);
      },
      undefined,
      function ( error ) {
        console.error("載入模型失敗，請確認是否有放置 model.glb 檔案", error);
        alert("載入模型失敗！\n1. 請確認資料夾內是否有 'model.glb' 檔案。\n2. 請確認您是透過本機伺服器 (Local Server, 如 VS Code 的 Live Server) 執行，否則瀏覽器會阻擋檔案讀取。");
      }
    );
    return;
  }

  let geometry;
  if (geomType === "Sphere") {
    geometry = new THREE.SphereGeometry(1.5, 128, 128); 
  } else if (geomType === "Torus") {
    geometry = new THREE.TorusGeometry(1.2, 0.4, 64, 128);
  } else if (geomType === "TorusKnot") {
    geometry = new THREE.TorusKnotGeometry(1.0, 0.35, 256, 64);
  } else if (geomType === "Plane") {
    geometry = new THREE.PlaneGeometry(3.0, 3.0, 32, 32);
    geometry.translate(0, 1.5, 0);
  } else if (geomType === "Cone") {
    geometry = new THREE.ConeGeometry(1.2, 3.0, 64, 64, true);
    geometry.translate(0, 1.5, 0);
  } else if (geomType === "Cylinder") {
    geometry = new THREE.CylinderGeometry(0.8, 0.8, 4.0, 64, 32);
    geometry.translate(0, 2.0, 0);
  } else if (geomType === "Heart") {
    const x = 0, y = 0;
    const heartShape = new THREE.Shape();
    heartShape.moveTo( x + 5, y + 5 );
    heartShape.bezierCurveTo( x + 5, y + 5, x + 4, y, x, y );
    heartShape.bezierCurveTo( x - 6, y, x - 6, y + 7,x - 6, y + 7 );
    heartShape.bezierCurveTo( x - 6, y + 11, x - 3, y + 15.4, x + 5, y + 19 );
    heartShape.bezierCurveTo( x + 12, y + 15.4, x + 16, y + 11, x + 16, y + 7 );
    heartShape.bezierCurveTo( x + 16, y + 7, x + 16, y, x + 10, y );
    heartShape.bezierCurveTo( x + 7, y, x + 5, y + 5, x + 5, y + 5 );
    const extrudeSettings = { depth: 2, bevelEnabled: true, bevelSegments: 16, steps: 2, bevelSize: 1, bevelThickness: 1 };
    geometry = new THREE.ExtrudeGeometry( heartShape, extrudeSettings );
    geometry.center();
    geometry.scale(0.15, -0.15, 0.15); // Scale down and flip Y
  } else if (geomType === "Star") {
    const starShape = new THREE.Shape();
    const outerRadius = 2.0;
    const innerRadius = 0.8;
    const points = 5;
    for (let i = 0; i < points * 2; i++) {
      const r = (i % 2 === 0) ? outerRadius : innerRadius;
      const a = (i / (points * 2)) * Math.PI * 2 + Math.PI / 2; // Start at top
      if (i === 0) starShape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      else starShape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const extrudeSettings = { depth: 0.5, bevelEnabled: true, bevelSegments: 8, steps: 1, bevelSize: 0.2, bevelThickness: 0.2 };
    geometry = new THREE.ExtrudeGeometry(starShape, extrudeSettings);
    geometry.center();
    geometry.scale(0.7, 0.7, 0.7);
  }

  currentMesh = new THREE.Mesh(geometry, material);
  
  if (geomType === "Plane" || geomType === "Cone") {
    currentMesh.position.y = -1.5; // 為了置中
  } else if (geomType === "Cylinder") {
    currentMesh.position.y = -2.0;
  }

  scene.add(currentMesh);
}

function applyPreset(name) {
  const config = configs[name];
  options.color0 = [...config.color0];
  options.color1 = [...config.color1];
  options.bloomStrength = config.bloomStrength;
  options.bloomRadius = config.bloomRadius;
  options.speed = config.speed;
  options.scale = config.scale;
  options.displacementStrength = config.displacementStrength;
  options.wireframe = config.wireframe;
  options.is2D = config.is2D;
  options.fadeTop = config.fadeTop;
  options.dynamicColor = config.dynamicColor || false;

  createObject();
}

function handleResize() {
  width = window.innerWidth;
  height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  composer.setSize(width, height);
  uniforms.resolution.value.set(width, height);
}

// 解析 dat.gui 改變顏色時可能產生的各種型別 (Array, Object, String)
// 以防止 WebGL 傳入 NaN 而導致黑屏當掉
function getColorVector(val) {
  if (typeof val === 'string') {
    if (val.startsWith('#')) {
      const c = new THREE.Color(val);
      return [c.r * 255, c.g * 255, c.b * 255];
    }
    if (val.startsWith('rgb')) {
      const match = val.match(/\d+/g);
      if (match) return [parseInt(match[0]), parseInt(match[1]), parseInt(match[2])];
    }
  } else if (Array.isArray(val)) {
    return val;
  } else if (val && typeof val === 'object') {
    if (val.r !== undefined && val.g !== undefined && val.b !== undefined) {
      return [val.r, val.g, val.b];
    }
  }
  return [255, 255, 255]; // fallback
}

window.addEventListener("resize", handleResize, false);
window.addEventListener("mousemove", (event) => {
  targetMouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  targetMouse.y = -(event.clientY / window.innerHeight) * 2 + 1; // 修正 NDC 座標轉換
});
function animate(delta) {
  requestAnimationFrame(animate);
  
  if (options.dynamicColor) {
    let t = Date.now() * 0.0003;
    let baseHue = t % 1;
    // 外圍用較深、飽和的顏色
    let c0 = new THREE.Color().setHSL(baseHue, 1.0, 0.4);
    // 核心用稍亮的同色系
    let c1 = new THREE.Color().setHSL((baseHue + 0.1) % 1, 1.0, 0.6);
    
    options.color0 = [c0.r * 255, c0.g * 255, c0.b * 255];
    options.color1 = [c1.r * 255, c1.g * 255, c1.b * 255];
  }

  if (starsMesh) {
    // 宇宙星空的緩慢自轉
    starsMesh.rotation.y += 0.0003;
    starsMesh.rotation.x += 0.0001;
  }

  if (chainsMesh) {
    // 鎖鏈背景的緩慢自轉
    chainsMesh.rotation.y -= 0.0005;
  }

  if (triggerCube && !pairingTriggered) {
    updateTriggerCubePosition();
    triggerCubeCore.rotation.x += 0.018;
    triggerCubeCore.rotation.y += 0.024;
    triggerCubeCore.rotation.z += 0.009;
    triggerCube.scale.setScalar(0.88 + Math.sin(Date.now() * 0.004) * 0.04);
    if (triggerCubeLight) triggerCubeLight.intensity = 2.15 + Math.sin(Date.now() * 0.006) * 0.35;
  }

  for (let i = cubeExplosionPieces.length - 1; i >= 0; i--) {
    const piece = cubeExplosionPieces[i];
    piece.life -= 0.018;

    if (piece.mesh) {
      piece.mesh.position.add(piece.velocity);
      piece.velocity.multiplyScalar(0.982);
      piece.velocity.y -= 0.002;
      piece.mesh.rotation.x += piece.rotation.x;
      piece.mesh.rotation.y += piece.rotation.y;
      piece.mesh.rotation.z += piece.rotation.z;
      piece.mesh.material.opacity = Math.max(0, piece.life);
    }

    if (piece.light) {
      piece.light.intensity = Math.max(0, piece.life * 12);
    }

    if (piece.life <= 0) {
      if (piece.mesh) {
        scene.remove(piece.mesh);
        piece.mesh.geometry.dispose();
        piece.mesh.material.dispose();
      }
      if (piece.light) scene.remove(piece.light);
      cubeExplosionPieces.splice(i, 1);
    }
  }

  // 滑鼠互動鎖鏈的物理與波動邏輯
  if (mouseChainMesh) {
    mouse.lerp(targetMouse, 0.15); // 平滑追隨滑鼠
    
    // 計算滑鼠在 3D 空間中的座標 (固定在攝影機前方 4.2 單位，推遠一點)
    let vector = new THREE.Vector3(mouse.x, mouse.y, 0.5);
    vector.unproject(camera);
    vector.sub(camera.position).normalize();
    let headPos = camera.position.clone().add(vector.multiplyScalar(4.2));
    
    // 頭部追隨滑鼠
    mouseChainPos[0].lerp(headPos, 0.4);
    
    let t = Date.now() * 0.005;
    for(let i = 1; i < mouseChainLinks; i++) {
       let prev = mouseChainPos[i-1];
       let curr = mouseChainPos[i];
       
       let diff = curr.clone().sub(prev);
       if (diff.lengthSq() < 0.0001) diff.set(0, -1, 0);
       
       // 維持每個環的固定間距 (0.9)
       diff.normalize().multiplyScalar(0.9);
       let targetPos = prev.clone().add(diff);
       
       // 加入重力下垂
       targetPos.y -= 0.1; 
       
       // 加入主動波動效果 (越尾端波動越大)
       let waveAmp = i * 0.008;
       targetPos.x += Math.sin(t - i * 0.2) * waveAmp;
       targetPos.z += Math.cos(t - i * 0.2) * waveAmp;
       
       // 彈性平滑移動
       curr.lerp(targetPos, 0.35);
    }
    
    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);
    for(let i = 0; i < mouseChainLinks; i++) {
       dummy.position.copy(mouseChainPos[i]);
       
       // 計算鎖鏈方向以正確旋轉環
       let linkDir;
       if (i < mouseChainLinks - 1) {
           linkDir = mouseChainPos[i].clone().sub(mouseChainPos[i+1]).normalize();
       } else {
           linkDir = mouseChainPos[i-1].clone().sub(mouseChainPos[i]).normalize();
       }
       
       let quaternion = new THREE.Quaternion().setFromUnitVectors(up, linkDir);
       dummy.rotation.set(0, (i % 2 === 0 ? 0 : Math.PI / 2), 0);
       dummy.applyQuaternion(quaternion);
       
       dummy.updateMatrix();
       mouseChainMesh.setMatrixAt(i, dummy.matrix);
    }
    mouseChainMesh.instanceMatrix.needsUpdate = true;

    if (isMouseChainTouchingCube()) {
      triggerCubeExplosion();
    }
  }

  // 讓女神的眼睛閃爍紅光
  if (window.eyeLeft && window.eyeLeft.material) {
    let t = Date.now() * 0.003;
    // 混和不同頻率的正弦波與少許隨機雜訊，創造出類似火光般的不規則閃爍感
    let intensity = 0.6 + 0.3 * Math.sin(t) + 0.2 * Math.sin(t * 2.7) + 0.1 * Math.random();
    // 確保亮度在合理範圍內
    intensity = Math.max(0.2, Math.min(1.5, intensity)); 
    // 設定 RGB，因為是紅色光球，只改變 R 的亮度
    window.eyeLeft.material.color.setRGB(intensity, 0, 0);
  }
  
  // 處理分散漂浮字幕動畫
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    let ft = floatingTexts[i];
    ft.life -= 0.003; 
    
    // 更新火焰 Shader 的時間
    ft.mesh.material.uniforms.time.value += 0.016;
    
    // 漂浮移動
    ft.mesh.position.x += ft.driftX;
    ft.mesh.position.y += ft.driftY;
    
    // 淡入與淡出邏輯
    if (ft.life > 0.8) {
      ft.mesh.material.uniforms.textOpacity.value = (1.0 - ft.life) * 5; 
    } else {
      ft.mesh.material.uniforms.textOpacity.value = ft.life * 1.25; 
    }
    
    // 壽命結束，清理資源
    if (ft.life <= 0) {
      scene.remove(ft.mesh);
      ft.mesh.geometry.dispose();
      ft.mesh.material.uniforms.textTexture.value.dispose();
      ft.mesh.material.dispose();
      floatingTexts.splice(i, 1);
    }
  }
  
  controls.update();

  if (material) {
    material.uniforms.time.value = delta;
    // 使用 getColorVector 來安全地解析顏色，避免字串展開造成的 NaN 錯誤
    material.uniforms.color0.value.set(...getColorVector(options.color0));
    material.uniforms.color1.value.set(...getColorVector(options.color1));
    material.uniforms.speed.value = options.speed;
    material.uniforms.scale.value = options.scale;
    material.uniforms.displacementStrength.value = options.displacementStrength;
    material.uniforms.is2D.value = options.is2D;
    material.uniforms.fadeTop.value = options.fadeTop;
  }

  bloomPass.threshold = options.bloomThreshold;
  bloomPass.strength = options.bloomStrength;
  bloomPass.radius = options.bloomRadius;
  
  composer.render();
}

init();
