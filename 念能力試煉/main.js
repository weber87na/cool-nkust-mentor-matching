class LaserGame {
    constructor() {
        // Core Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-window.innerWidth/2, window.innerWidth/2, window.innerHeight/2, -window.innerHeight/2, 1, 1000);
        this.camera.position.z = 100;
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gameCanvas'), alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000000, 0);
        
        // Game state
        this.score = 0;
        this.gameStarted = false;
        this.gameOver = false;
        const timerElement = document.getElementById('timer');
        this.totalGameTime = Number(timerElement?.dataset.totalSeconds || timerElement?.textContent || 20);
        this.abilityMode = 'eye';
        this.gameStartTime = 0;
        this.characterScores = {};
        this.characterLastHit = {};
        this.lastHitSequence = 0;
        this.flowState = null;
        this.currentStudent = null;
        this.availableSeniors = [];
        this.pairingAllowed = false;
        this.assignmentInProgress = false;
        this.isCalibrated = false;
        this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
        this.isPortrait = window.innerHeight > window.innerWidth;
        
        // Game objects arrays
        this.enemies = [];
        this.lasers = [];
        this.particles = [];
        this.bombs = [];
        
        // Timing
        this.lastEnemySpawn = 0;
        this.lastBombSpawn = 0;
        this.lastLaserTime = 0;
        this.enemySpawnInterval = 750;
        this.bombSpawnInterval = 8000;
        
        // Two-player face tracking
        this.faceMesh = null;
        this.detectionEnabled = false;
        this.numPlayers = 0;
        
        // Player 1 data
        this.player1 = {
            leftEye: { x: 0.35, y: 0.4 },
            rightEye: { x: 0.45, y: 0.4 },
            mouth: { x: 0.4, y: 0.55, isOpen: false, width: 0, height: 0, openFrames: 0, closeFrames: 0 },
            gaze: { x: 0.4, y: 0.4 },
            smoothGaze: { x: 0.4, y: 0.4 },
            faceCenter: { x: 0.4, y: 0.4 },
            currentFaceCenter: { x: 0.4, y: 0.4 },
            calibrated: false,
            color: 'blue',
            laserTip: null,
            lastLaserTime: 0,
            lastMouthLaserTime: 0
        };
        
        // Player 2 data
        this.player2 = {
            leftEye: { x: 0.55, y: 0.4 },
            rightEye: { x: 0.65, y: 0.4 },
            mouth: { x: 0.6, y: 0.55, isOpen: false, width: 0, height: 0, openFrames: 0, closeFrames: 0 },
            gaze: { x: 0.6, y: 0.4 },
            smoothGaze: { x: 0.6, y: 0.4 },
            faceCenter: { x: 0.6, y: 0.4 },
            currentFaceCenter: { x: 0.6, y: 0.4 },
            calibrated: false,
            color: 'red',
            laserTip: null,
            lastLaserTime: 0,
            lastMouthLaserTime: 0
        };
        
        // Enhanced calibration system for both players
        this.calibrationHistory = { player1: [], player2: [] };
        this.maxCalibrationHistory = 30;
        this.lastRecalibrationTime = { player1: 0, player2: 0 };
        this.recalibrationCooldown = 2000;
        this.positionChangeThreshold = 0.12;
        this.distanceChangeThreshold = 0.27;
        this.stabilityFrames = 10;
        this.currentStabilityCount = { player1: 0, player2: 0 };
        this.pendingRecalibration = { player1: false, player2: false };
        this.baseFaceDistance = { player1: 0, player2: 0 };
        
        // Assets
        this.ghostTexture = null;
        this.enemyTextures = [];
        this.bombTexture = null;
        this.textureLoader = new THREE.TextureLoader();
        this.laserTip = null;

        this.init();
    }
    
    async init() {
        await this.initializeFlowState();
        await Promise.all([this.setupMediaPipe(), this.loadSprites(), this.setupVideo()]);
        this.setupShaders();
        this.setupEventListeners();
        this.createLaserTip();
        this.animate();
        this.waitUntilReady();
    }

    setFlowStatus(message) {
        const flowStatus = document.getElementById('flowStatus');
        if (flowStatus) flowStatus.textContent = message;
    }

    async initializeFlowState() {
        if (!window.FlowState) {
            this.setFlowStatus('請用本機服務開啟頁面，才能連接配對流程。');
            return;
        }

        try {
            const flow = await FlowState.init();
            this.flowState = flow;
            this.currentStudent = flow.currentStudent;

            if (!flow.currentStudent) {
                this.setFlowStatus('請先回抽抽樂選定本輪學弟妹。');
                return;
            }

            if (flow.currentStudent.學長姐) {
                this.setFlowStatus(`${flow.currentStudent.姓名} 已配對 ${flow.currentStudent.學長姐}，不會覆寫結果。`);
                return;
            }

            this.availableSeniors = flow.availableSeniors.length ? flow.availableSeniors : flow.seniors;
            if (!this.availableSeniors.length) {
                this.setFlowStatus('目前沒有可抽的學長姐。');
                return;
            }

            this.pairingAllowed = true;
            this.setFlowStatus(`目前學弟妹：${flow.currentStudent.姓名}｜可試煉學長姐：${this.availableSeniors.length} 位`);
        } catch (error) {
            this.setFlowStatus(error.message);
        }
    }

    waitUntilReady() {
        const startBtn = document.getElementById('startButton');
        startBtn.disabled = true;
        startBtn.textContent = "⏳ 念場展開中...";

        const checkReady = setInterval(() => {
            if (!this.pairingAllowed) {
                startBtn.disabled = true;
                startBtn.textContent = this.currentStudent?.學長姐 ? "已完成配對" : "請先選定學弟妹";
                clearInterval(checkReady);
                return;
            }

            if (this.video?.readyState >= 2 && this.enemyTextures.length) {
                startBtn.disabled = false;
                startBtn.textContent = "📡 開始試煉";
                clearInterval(checkReady);
            }
        }, 500);
    }

    async loadSprites() {
        const loadTexture = (path, fallback) => new Promise(resolve => {
            this.textureLoader.load(path, texture => {
                texture.magFilter = texture.minFilter = THREE.NearestFilter;
                resolve(texture);
            }, undefined, () => {
                console.warn(`Could not load ${path}, using fallback`);
                fallback.call(this);
                if (fallback === createFallbackBombTexture) {
                    resolve(this.bombTexture);
                } else {
                    resolve(this.ghostTexture);
                }
            });
        });

        [this.ghostTexture, this.bombTexture] = await Promise.all([
            loadTexture('assets/game/ghost.webp', createFallbackGhostTexture),
            loadTexture('assets/game/bomb.webp', createFallbackBombTexture)
        ]);

        if (!this.availableSeniors.length) {
            this.enemyTextures = [];
            return;
        }

        this.enemyTextures = await Promise.all(
            this.availableSeniors.map(senior => {
                const photo = senior.照片 || '';
                const path = `../shared/assets/seniors-common/${photo}`;
                return loadTexture(path, createFallbackGhostTexture).then(texture => {
                    const seniorTexture = texture.clone ? texture.clone() : texture;
                    seniorTexture.needsUpdate = true;
                    seniorTexture.userData = {
                        seniorName: senior.姓名,
                        characterName: senior.綽號 || senior.姓名 || photo.replace(/\.(png|webp)$/i, ''),
                        photo
                    };
                    return seniorTexture;
                });
            })
        );

        this.enemyTextures = this.enemyTextures.filter(texture => {
            const name = texture.userData?.seniorName;
            if (!name) {
                console.warn('Senior texture missing formal name, ignored:', texture.userData);
                return false;
            }
            return true;
        });

        if (!this.enemyTextures.length) {
            this.pairingAllowed = false;
            this.setFlowStatus('可抽學長姐圖片載入失敗，無法開始試煉。');
        }
    }
    
    async setupMediaPipe() {
        try {
            if (typeof window.FaceMesh !== 'undefined') {
                this.faceMesh = new window.FaceMesh({
                    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/${file}`
                });
                this.faceMesh.setOptions({ 
                    maxNumFaces: 2, // Allow 2 faces
                    refineLandmarks: true, 
                    minDetectionConfidence: 0.3, 
                    minTrackingConfidence: 0.3 
                });
                this.faceMesh.onResults(results => {
                    if (results.multiFaceLandmarks) {
                        this.updateMultipleGazes(results.multiFaceLandmarks);
                    }
                });
                this.detectionEnabled = true;
            } else {
                this.setupMouseFallback();
            }
        } catch {
            this.setupMouseFallback();
        }
    }
    
    setupMouseFallback() {
        this.detectionEnabled = false;
        this.isCalibrated = true;
        this.player1.calibrated = true;
        this.numPlayers = 1;
        
        document.addEventListener('mousemove', e => {
            const player = this.player1;
            player.gaze.x = player.currentFaceCenter.x = player.mouth.x = e.clientX / window.innerWidth;
            player.gaze.y = player.currentFaceCenter.y = e.clientY / window.innerHeight;
            player.smoothGaze.x = player.gaze.x;
            player.smoothGaze.y = player.gaze.y;
            player.leftEye.x = player.gaze.x - 0.05;
            player.rightEye.x = player.gaze.x + 0.05;
            player.leftEye.y = player.rightEye.y = player.gaze.y;
            player.mouth.y = player.gaze.y + 0.1;
            player.mouth.isOpen = false;
            
            // Update laser tip position immediately in mouse mode
            if (this.laserTip && this.gameStarted) {
                this.laserTip.position.x = (player.smoothGaze.x - 0.5) * window.innerWidth;
                this.laserTip.position.y = -(player.smoothGaze.y - 0.5) * window.innerHeight;
            }
        });
        
        console.log("Mouse fallback setup complete, player1.calibrated:", this.player1.calibrated);
    }
    
    updateMultipleGazes(multiFaceLandmarks) {
        this.numPlayers = Math.min(multiFaceLandmarks.length, 2);
        
        multiFaceLandmarks.forEach((landmarks, index) => {
            if (index >= 2) return; // Only handle first 2 faces
            
            const player = index === 0 ? this.player1 : this.player2;
            const playerId = index === 0 ? 'player1' : 'player2';
            
            this.updatePlayerGaze(landmarks, player, playerId);
        });
        
        this.updateEyeUI();
    }
    
    updatePlayerGaze(landmarks, player, playerId) {
        const leftEye = landmarks[468] || landmarks[33];
        const rightEye = landmarks[473] || landmarks[362];
        if (!leftEye || !rightEye) return;
        
        const currentCenter = { x: (leftEye.x + rightEye.x) / 2, y: (leftEye.y + rightEye.y) / 2 };
        
        // Calculate face distance (approximate) using eye separation
        const eyeDistance = Math.sqrt((rightEye.x - leftEye.x) ** 2 + (rightEye.y - leftEye.y) ** 2);
        const currentFaceData = {
            center: currentCenter,
            distance: eyeDistance,
            timestamp: Date.now()
        };
        
        // Add to calibration history
        this.calibrationHistory[playerId].push(currentFaceData);
        if (this.calibrationHistory[playerId].length > this.maxCalibrationHistory) {
            this.calibrationHistory[playerId].shift();
        }
        
        // Initial calibration
        if (!player.calibrated) {
            player.faceCenter = { ...currentCenter };
            this.baseFaceDistance[playerId] = eyeDistance;
            player.calibrated = true;
            this.isCalibrated = this.player1.calibrated || this.player2.calibrated;
            console.log(`Initial calibration completed for ${playerId}`);
            
            // Show laser tip when player gets calibrated and game is started
            if (this.gameStarted && player.laserTip) {
                player.laserTip.visible = this.abilityMode === 'eye' || (this.abilityMode === 'mouth' && player.mouth.isOpen);
                console.log(`${playerId} laser tip made visible after calibration`);
            }
            
            return;
        }
        
        // Check if we need to recalibrate
        this.checkForRecalibration(currentFaceData, player, playerId);
        
        player.currentFaceCenter = { ...currentCenter };
        
        // Calculate relative distance change for scaling sensitivity
        const distanceRatio = this.baseFaceDistance[playerId] / eyeDistance;
        const sensitivityScale = Math.max(0.5, Math.min(2.0, distanceRatio));
        
        // Calculate gaze from head movement with distance compensation
        const baseScaleX = this.isPortrait ? 0.06 : 0.08;
        const baseScaleY = this.isPortrait ? 0.08 : 0.05;
        
        const scaleX = baseScaleX * sensitivityScale;
        const scaleY = baseScaleY * sensitivityScale;
        
        const deltaX = (currentCenter.x - player.faceCenter.x) / scaleX;
        const deltaY = (currentCenter.y - player.faceCenter.y) / scaleY;

        player.gaze.x = Math.max(0, Math.min(1, 0.5 - deltaX));
        player.gaze.y = Math.max(0, Math.min(1, 0.5 + deltaY));
        
        // Smooth gaze and eye positions
        player.smoothGaze.x += (player.gaze.x - player.smoothGaze.x) * 0.15;
        player.smoothGaze.y += (player.gaze.y - player.smoothGaze.y) * 0.15;
        player.leftEye.x = 1 - leftEye.x;
        player.leftEye.y = leftEye.y;
        player.rightEye.x = 1 - rightEye.x;
        player.rightEye.y = rightEye.y;
        
        // Mouth tracking
        const [upperLip, lowerLip, leftCorner, rightCorner] = [landmarks[13], landmarks[14], landmarks[308], landmarks[78]];
        if (upperLip && lowerLip && leftCorner && rightCorner) {
            player.mouth.x = 1 - ((upperLip.x + lowerLip.x) / 2);
            player.mouth.y = (upperLip.y + lowerLip.y) / 2;
            player.mouth.width = Math.abs(rightCorner.x - leftCorner.x);
            player.mouth.height = Math.abs(lowerLip.y - upperLip.y);
            const openRatio = player.mouth.width > 0 ? player.mouth.height / player.mouth.width : 0;
            const definitelyOpen = openRatio > 0.62 && player.mouth.height > 0.022;
            const definitelyClosed = openRatio < 0.42 || player.mouth.height < 0.016;

            if (definitelyOpen) {
                player.mouth.openFrames++;
                player.mouth.closeFrames = 0;
            } else if (definitelyClosed) {
                player.mouth.closeFrames++;
                player.mouth.openFrames = 0;
            } else {
                player.mouth.openFrames = Math.max(0, player.mouth.openFrames - 1);
                player.mouth.closeFrames = Math.max(0, player.mouth.closeFrames - 1);
            }

            if (player.mouth.openFrames >= 3) {
                player.mouth.isOpen = true;
            } else if (player.mouth.closeFrames >= 2) {
                player.mouth.isOpen = false;
            }
        }
    }

    checkForRecalibration(currentFaceData, player, playerId) {
        const now = Date.now();
        
        // Don't recalibrate too frequently
        if (now - this.lastRecalibrationTime[playerId] < this.recalibrationCooldown) {
            return;
        }
        
        // Need enough history for comparison
        if (this.calibrationHistory[playerId].length < this.stabilityFrames) {
            return;
        }
        
        // Calculate position change from current calibration center
        const positionChange = Math.sqrt(
            Math.pow(currentFaceData.center.x - player.faceCenter.x, 2) +
            Math.pow(currentFaceData.center.y - player.faceCenter.y, 2)
        );
        
        // Calculate distance change from baseline
        const distanceChange = Math.abs(currentFaceData.distance - this.baseFaceDistance[playerId]) / this.baseFaceDistance[playerId];
        
        // Check if we've moved significantly
        const significantPositionChange = positionChange > this.positionChangeThreshold;
        const significantDistanceChange = distanceChange > this.distanceChangeThreshold;
        
        if (significantPositionChange || significantDistanceChange) {
            if (!this.pendingRecalibration[playerId]) {
                this.pendingRecalibration[playerId] = true;
                this.currentStabilityCount[playerId] = 0;
                console.log(`Significant movement detected for ${playerId}, checking for stability...`);
            }
            
            // Check if position has been stable for enough frames
            this.checkPositionStability(currentFaceData, player, playerId);
        } else {
            // Reset pending recalibration if we're back in normal range
            this.pendingRecalibration[playerId] = false;
            this.currentStabilityCount[playerId] = 0;
        }
    }

    checkPositionStability(currentFaceData, player, playerId) {
        if (this.calibrationHistory[playerId].length < this.stabilityFrames) {
            return;
        }
        
        // Check if the last N frames have been stable
        const recentFrames = this.calibrationHistory[playerId].slice(-this.stabilityFrames);
        const avgCenter = {
            x: recentFrames.reduce((sum, frame) => sum + frame.center.x, 0) / recentFrames.length,
            y: recentFrames.reduce((sum, frame) => sum + frame.center.y, 0) / recentFrames.length
        };
        const avgDistance = recentFrames.reduce((sum, frame) => sum + frame.distance, 0) / recentFrames.length;
        
        // Check variance in recent frames
        const maxVariance = 0.02; // Maximum allowed variance for stability
        const centerVariance = recentFrames.reduce((maxVar, frame) => {
            const variance = Math.sqrt(
                Math.pow(frame.center.x - avgCenter.x, 2) +
                Math.pow(frame.center.y - avgCenter.y, 2)
            );
            return Math.max(maxVar, variance);
        }, 0);
        
        const distanceVariance = recentFrames.reduce((maxVar, frame) => {
            return Math.max(maxVar, Math.abs(frame.distance - avgDistance) / avgDistance);
        }, 0);
        
        if (centerVariance < maxVariance && distanceVariance < 0.1) {
            this.currentStabilityCount[playerId]++;
            
            if (this.currentStabilityCount[playerId] >= this.stabilityFrames) {
                this.performRecalibration(avgCenter, avgDistance, player, playerId);
            }
        } else {
            this.currentStabilityCount[playerId] = 0;
        }
    }

    performRecalibration(newCenter, newDistance, player, playerId) {
        const oldCenter = { ...player.faceCenter };
        const oldDistance = this.baseFaceDistance[playerId];
        
        player.faceCenter = { ...newCenter };
        this.baseFaceDistance[playerId] = newDistance;
        this.lastRecalibrationTime[playerId] = Date.now();
        this.pendingRecalibration[playerId] = false;
        this.currentStabilityCount[playerId] = 0;
        
        console.log(`Auto-recalibrated face tracking for ${playerId}:`);
        console.log(`Position change: (${(newCenter.x - oldCenter.x).toFixed(3)}, ${(newCenter.y - oldCenter.y).toFixed(3)})`);
        console.log(`Distance change: ${((newDistance - oldDistance) / oldDistance * 100).toFixed(1)}%`);
    }

    forceRecalibration() {
        ['player1', 'player2'].forEach(playerId => {
            const player = playerId === 'player1' ? this.player1 : this.player2;
            if (this.calibrationHistory[playerId].length > 0) {
                const latest = this.calibrationHistory[playerId][this.calibrationHistory[playerId].length - 1];
                this.performRecalibration(latest.center, latest.distance, player, playerId);
            } else {
                player.calibrated = false;
            }
        });
        this.isCalibrated = this.player1.calibrated || this.player2.calibrated;
    }
    
    updateEyeUI() {
        const videoRect = document.getElementById('videoElement').getBoundingClientRect();
        const shouldShowLaserTip = player => {
            if (!this.gameStarted) return false;
            if (this.abilityMode === 'eye') return true;
            return this.abilityMode === 'mouth' && player.mouth.isOpen;
        };
        const applyScarletEye = eye => {
            eye.style.background = 'radial-gradient(circle at 50% 50%, #170004 0 13%, #fff2f3 14% 18%, #ff123f 20% 38%, #820018 39% 58%, #1c0005 59% 100%)';
            eye.style.border = '2px solid #ffd3da';
            eye.style.boxShadow = '0 0 0 3px rgba(128, 0, 18, 0.75), 0 0 18px #ff234f, 0 0 56px rgba(255, 35, 79, 0.9), inset 0 0 12px #ff7890';
        };
        
        // Update Player 1 eyes (original colors)
        if (this.player1.calibrated) {
            const leftEye1 = document.getElementById('leftEye');
            const rightEye1 = document.getElementById('rightEye');
            leftEye1.style.left = this.player1.leftEye.x * window.innerWidth + 'px';
            leftEye1.style.top = (videoRect.top + this.player1.leftEye.y * videoRect.height) + 'px';
            applyScarletEye(leftEye1);
            rightEye1.style.left = this.player1.rightEye.x * window.innerWidth + 'px';
            rightEye1.style.top = (videoRect.top + this.player1.rightEye.y * videoRect.height) + 'px';
            applyScarletEye(rightEye1);
            
            // Update Player 1 laser tip position and visibility.
            if (this.player1.laserTip) {
                this.player1.laserTip.position.x = (this.player1.smoothGaze.x - 0.5) * window.innerWidth;
                this.player1.laserTip.position.y = -(this.player1.smoothGaze.y - 0.5) * window.innerHeight;
                this.player1.laserTip.visible = shouldShowLaserTip(this.player1);
            }
        }

        // Create/Update Player 2 eyes (same colors as player 1)
        if (this.numPlayers >= 2 && this.player2.calibrated) {
            let leftEye2 = document.getElementById('leftEye2');
            let rightEye2 = document.getElementById('rightEye2');
            
            if (!leftEye2) {
                leftEye2 = document.createElement('div');
                leftEye2.id = 'leftEye2';
                leftEye2.className = 'eye-glow';
                leftEye2.style.display = this.gameStarted && this.abilityMode === 'eye' ? 'block' : 'none';
                document.getElementById('gameContainer').appendChild(leftEye2);
            }
            
            if (!rightEye2) {
                rightEye2 = document.createElement('div');
                rightEye2.id = 'rightEye2';
                rightEye2.className = 'eye-glow';
                rightEye2.style.display = this.gameStarted && this.abilityMode === 'eye' ? 'block' : 'none';
                document.getElementById('gameContainer').appendChild(rightEye2);
            }
            
            leftEye2.style.left = this.player2.leftEye.x * window.innerWidth + 'px';
            leftEye2.style.top = (videoRect.top + this.player2.leftEye.y * videoRect.height) + 'px';
            applyScarletEye(leftEye2);
            rightEye2.style.left = this.player2.rightEye.x * window.innerWidth + 'px';
            rightEye2.style.top = (videoRect.top + this.player2.rightEye.y * videoRect.height) + 'px';
            applyScarletEye(rightEye2);
            
            // Update Player 2 laser tip position and visibility.
            if (this.player2.laserTip) {
                this.player2.laserTip.position.x = (this.player2.smoothGaze.x - 0.5) * window.innerWidth;
                this.player2.laserTip.position.y = -(this.player2.smoothGaze.y - 0.5) * window.innerHeight;
                this.player2.laserTip.visible = shouldShowLaserTip(this.player2);
            }
        }

        // Update mouth portals
        [this.player1, this.player2].forEach((player, index) => {
            if (!player.calibrated) return;
            
            let mouthPortal = document.getElementById(`mouthPortal${index + 1}`);
            if (!mouthPortal && index === 1) {
                mouthPortal = document.createElement('div');
                mouthPortal.id = 'mouthPortal2';
                mouthPortal.className = 'mouth-portal';
                mouthPortal.style.display = 'none';
                mouthPortal.style.background = 'radial-gradient(circle, #e6feff 0%, #00eaff 24%, #006f8f 58%, transparent 100%)';
                document.getElementById('gameContainer').appendChild(mouthPortal);
            }
            
            if (index === 0) mouthPortal = document.getElementById('mouthPortal');
            
            if (mouthPortal) {
                mouthPortal.style.display = player.mouth.isOpen && this.gameStarted && this.abilityMode === 'mouth' ? 'block' : 'none';
                if (player.mouth.isOpen && this.gameStarted && this.abilityMode === 'mouth') {
                    mouthPortal.style.left = player.mouth.x * window.innerWidth + 'px';
                    mouthPortal.style.top = (videoRect.top + player.mouth.y * videoRect.height) + 'px';
                }
            }
        });
    }
    
    setupShaders() {
        const shaderConfig = {
            laser: {
                uniforms: { time: { value: 0 }, intensity: { value: 1 }, color: { value: new THREE.Color(0.1, 0.1, 1.0) } },
                vertexShader: `
                    varying vec2 vUv; uniform float time;
                    void main() {
                        vUv = uv; vec3 pos = position;
                        pos.x += sin(time * 20.0 + position.y * 0.1) * 1.8 * (1.0 - abs(uv.y - 0.5) * 2.0);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }`,
                fragmentShader: `
                    uniform float time, intensity; uniform vec3 color; varying vec2 vUv;
                    void main() {
                        float centerDist = abs(vUv.y - 0.5) * 2.0;
                        float beam = 1.0 - smoothstep(0.0, 0.4, centerDist);
                        float core = 1.0 - smoothstep(0.0, 0.15, centerDist);
                        float pulse = sin(time * 25.0) * 0.3 + 0.7;
                        vec3 finalColor = color * (beam * 2.0 + core * 6.0) * pulse * intensity;
                        gl_FragColor = vec4(finalColor, (beam * 2.5 + core * 2.0) * intensity * pulse);
                    }`
            },
            laserTip: {
                uniforms: { time: { value: 0 }, intensity: { value: 1 } },
                vertexShader: `
                    varying vec2 vUv; uniform float time;
                    void main() {
                        vUv = uv; vec3 pos = position;
                        float swirl = sin(time * 8.0) * 0.8;
                        pos.x += cos(time * 10.0 + pos.y * 0.5) * swirl;
                        pos.y += sin(time * 12.0 + pos.x * 0.5) * swirl;
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }`,
                fragmentShader: `
                    uniform float time, intensity; varying vec2 vUv;
                    void main() {
                        vec2 center = vUv - 0.5; float dist = length(center), angle = atan(center.y, center.x);
                        float swirl = sin(angle * 6.0 + time * 15.0 + dist * 20.0) * 0.5 + 0.5;
                        float spiral = sin(angle * 3.0 - time * 8.0 + dist * 15.0) * 0.5 + 0.5;
                        float core = 1.0 - smoothstep(0.0, 0.2, dist);
                        float ring = smoothstep(0.2, 0.6, dist) - smoothstep(0.3, 0.6, dist);
                        float pulse = sin(time * 20.0) * 0.8 + 1.7;
                        vec3 color1 = vec3(1.0, 0.2, 0.2), color2 = vec3(1.0, 0.8, 0.2), color3 = vec3(0.2, 0.8, 1.0);
                        vec3 finalColor = mix(color1, color2, swirl) * core + mix(color2, color3, spiral) * ring;
                        finalColor *= pulse * intensity * 2.0;
                        gl_FragColor = vec4(finalColor, (core + ring * 1.2) * pulse * intensity);
                    }`
            },
            explosion: {
                uniforms: { time: { value: 0 }, progress: { value: 0 }, intensity: { value: 2 } },
                vertexShader: `
                    varying vec2 vUv; uniform float time, progress;
                    void main() { vUv = uv; vec3 pos = position * (1.0 + progress * 1.0); gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); }`,
                fragmentShader: `
                    uniform float time, progress, intensity; varying vec2 vUv;
                    void main() {
                        vec2 center = vUv - 0.5; float dist = length(center), angle = atan(center.y, center.x);
                        float rays = sin(angle * 12.0 + time * 20.0) * 0.5 + 0.5;
                        float blast = 1.0 - smoothstep(0.0, progress, dist);
                        float ring = smoothstep(progress * 0.7, progress, dist) * (1.0 - smoothstep(progress, progress * 1.2, dist));
                        vec3 colors[4]; colors[0] = vec3(1.0, 0.0, 1.0); colors[1] = vec3(0.0, 1.0, 1.0); colors[2] = vec3(1.0, 1.0, 0.0); colors[3] = vec3(1.0, 0.0, 0.0);
                        float colorProgress = dist / progress;
                        vec3 finalColor = colorProgress < 0.33 ? mix(colors[0], colors[1], colorProgress * 3.0) : 
                                         colorProgress < 0.66 ? mix(colors[1], colors[2], (colorProgress - 0.33) * 3.0) : 
                                         mix(colors[2], colors[3], (colorProgress - 0.66) * 3.0);
                        vec3 rainbowRing = vec3(sin(angle * 3.0 + time * 10.0) * 0.5 + 0.5, sin(angle * 3.0 + time * 10.0 + 2.094) * 0.5 + 0.5, sin(angle * 3.0 + time * 10.0 + 4.188) * 0.5 + 0.5);
                        finalColor = mix(finalColor, rainbowRing, ring * 1.0) * (blast + ring * rays) * intensity * (1.2 - progress * 0.6);
                        gl_FragColor = vec4(finalColor, (blast + ring) * intensity * (1.0 - progress));
                    }`
            },
            particle: {
                uniforms: { time: { value: 0 }, size: { value: 20 } },
                vertexShader: `
                    uniform float time, size; attribute float life, sparkIndex; attribute vec3 velocity; varying float vLife, vIndex;
                    void main() {
                        vLife = life; vIndex = sparkIndex; float lifeProgress = 1.0 - life;
                        vec3 pos = position + velocity * lifeProgress * 2.0; pos.y -= lifeProgress * lifeProgress * 60.0;
                        gl_PointSize = size * life * (0.8 + sin(time * 25.0 + sparkIndex * 10.0) * 0.8);
                        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                    }`,
                fragmentShader: `
                    uniform float time; varying float vLife, vIndex;
                    void main() {
                        vec2 center = gl_PointCoord - vec2(0.5); if (length(center) > 0.5) discard;
                        float alpha = (1.0 - length(center) * 1.5) * vLife * (0.9 + sin(time * 40.0 + vIndex * 15.0) * 0.3) * 1.8;
                        vec3 color = mix(vec3(1.0), vec3(1.0, 0.3, 0.1), 1.0 - vLife) * 1.5;
                        gl_FragColor = vec4(color, alpha);
                    }`
            }
        };

        Object.entries(shaderConfig).forEach(([name, config]) => {
            this[name + 'Material'] = new THREE.ShaderMaterial({
                ...config,
                transparent: true,
                blending: THREE.AdditiveBlending
            });
        });
    }

    createLaserTip() {
        // Create separate materials for each player to avoid conflicts
        const laserTipMaterial1 = new THREE.ShaderMaterial({
            uniforms: { 
                time: { value: 0 }, 
                intensity: { value: 1 } 
            },
            vertexShader: `
                varying vec2 vUv; uniform float time;
                void main() {
                    vUv = uv; vec3 pos = position;
                    float swirl = sin(time * 8.0) * 0.8;
                    pos.x += cos(time * 10.0 + pos.y * 0.5) * swirl;
                    pos.y += sin(time * 12.0 + pos.x * 0.5) * swirl;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }`,
            fragmentShader: `
                uniform float time, intensity; varying vec2 vUv;
                void main() {
                    vec2 center = vUv - 0.5; float dist = length(center), angle = atan(center.y, center.x);
                    float swirl = sin(angle * 6.0 + time * 15.0 + dist * 20.0) * 0.5 + 0.5;
                    float spiral = sin(angle * 3.0 - time * 8.0 + dist * 15.0) * 0.5 + 0.5;
                    float core = 1.0 - smoothstep(0.0, 0.2, dist);
                    float ring = smoothstep(0.2, 0.6, dist) - smoothstep(0.3, 0.6, dist);
                    float pulse = sin(time * 20.0) * 0.8 + 1.7;
                    vec3 color1 = vec3(0.2, 0.2, 1.0), color2 = vec3(0.2, 0.8, 1.0), color3 = vec3(1.0, 0.8, 0.2);
                    vec3 finalColor = mix(color1, color2, swirl) * core + mix(color2, color3, spiral) * ring;
                    finalColor *= pulse * intensity * 2.0;
                    gl_FragColor = vec4(finalColor, (core + ring * 1.2) * pulse * intensity);
                }`,
            transparent: true,
            blending: THREE.AdditiveBlending
        });

        const laserTipMaterial2 = new THREE.ShaderMaterial({
            uniforms: { 
                time: { value: 0 }, 
                intensity: { value: 1 } 
            },
            vertexShader: `
                varying vec2 vUv; uniform float time;
                void main() {
                    vUv = uv; vec3 pos = position;
                    float swirl = sin(time * 8.0) * 0.8;
                    pos.x += cos(time * 10.0 + pos.y * 0.5) * swirl;
                    pos.y += sin(time * 12.0 + pos.x * 0.5) * swirl;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }`,
            fragmentShader: `
                uniform float time, intensity; varying vec2 vUv;
                void main() {
                    vec2 center = vUv - 0.5; float dist = length(center), angle = atan(center.y, center.x);
                    float swirl = sin(angle * 6.0 + time * 15.0 + dist * 20.0) * 0.5 + 0.5;
                    float spiral = sin(angle * 3.0 - time * 8.0 + dist * 15.0) * 0.5 + 0.5;
                    float core = 1.0 - smoothstep(0.0, 0.2, dist);
                    float ring = smoothstep(0.2, 0.6, dist) - smoothstep(0.3, 0.6, dist);
                    float pulse = sin(time * 20.0) * 0.8 + 1.7;
                    vec3 color1 = vec3(1.0, 0.2, 0.2), color2 = vec3(1.0, 0.8, 0.2), color3 = vec3(0.2, 0.8, 1.0);
                    vec3 finalColor = mix(color1, color2, swirl) * core + mix(color2, color3, spiral) * ring;
                    finalColor *= pulse * intensity * 2.0;
                    gl_FragColor = vec4(finalColor, (core + ring * 1.2) * pulse * intensity);
                }`,
            transparent: true,
            blending: THREE.AdditiveBlending
        });
        
        // Create laser tip for player 1 (blue theme)
        this.player1.laserTip = new THREE.Mesh(new THREE.CircleGeometry(80, 32), laserTipMaterial1);
        this.player1.laserTip.position.z = 50;
        this.player1.laserTip.visible = false;
        this.scene.add(this.player1.laserTip);
        
        // Create laser tip for player 2 (red theme)
        this.player2.laserTip = new THREE.Mesh(new THREE.CircleGeometry(80, 32), laserTipMaterial2);
        this.player2.laserTip.position.z = 50;
        this.player2.laserTip.visible = false;
        this.scene.add(this.player2.laserTip);
        
        // Keep the old reference for backward compatibility
        this.laserTip = this.player1.laserTip;
    }
    
    async setupVideo() {
        const video = document.getElementById('videoElement');
        try {
            video.srcObject = await navigator.mediaDevices.getUserMedia({
                video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
            });
            this.video = video;
            video.onloadeddata = () => {
                if (this.detectionEnabled && this.faceMesh) this.startFaceDetection();
            };
        } catch {
            alert('需要開啟攝影機，緋紅之眼才能覺醒。');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.ability-option').forEach(button => {
            button.addEventListener('click', () => {
                document.querySelectorAll('.ability-option').forEach(option => option.classList.remove('active'));
                button.classList.add('active');
                this.abilityMode = button.dataset.ability || 'eye';
            });
        });

        document.getElementById('startButton').addEventListener('click', () => {
            if (this.video?.readyState < 2) {
                alert("請稍候，念場與臉部追蹤尚未穩定。");
                return;
            }
            this.startGame();
        });
        
        document.addEventListener('keydown', e => { 
            if (e.key.toLowerCase() === 'c') {
                this.forceRecalibration();
            }
        });
        
        window.addEventListener('resize', () => {
            this.isPortrait = window.innerHeight > window.innerWidth;
            this.camera.left = -window.innerWidth / 2;
            this.camera.right = window.innerWidth / 2;
            this.camera.top = window.innerHeight / 2;
            this.camera.bottom = -window.innerHeight / 2;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }
    
    startGame() {
        const selectedAbility = document.querySelector('.ability-option.active');
        this.abilityMode = selectedAbility?.dataset.ability || this.abilityMode || 'eye';
        if (!this.pairingAllowed || !this.enemyTextures.length) {
            this.setFlowStatus(this.currentStudent ? '目前沒有可試煉的學長姐。' : '請先回抽抽樂選定本輪學弟妹。');
            return;
        }

        // UI updates
        document.getElementById('start-overlay').style.display = 'none';
        document.getElementById('gameOverScreen').style.display = 'none';
        
        // Show player eyes only when the scarlet-eye ability is selected.
        ['leftEye', 'rightEye'].forEach(id => {
            document.getElementById(id).style.display = this.abilityMode === 'eye' ? 'block' : 'none';
        });
        
        // Show player 2 eyes if they exist
        if (this.numPlayers >= 2) {
            ['leftEye2', 'rightEye2'].forEach(id => {
                const eye = document.getElementById(id);
                if (eye) eye.style.display = this.abilityMode === 'eye' ? 'block' : 'none';
            });
        }

        if (this.player1.laserTip) this.player1.laserTip.visible = false;
        if (this.player2.laserTip) this.player2.laserTip.visible = false;
        
        // Game state reset
        Object.assign(this, {
            gameStarted: true,
            gameOver: false,
            score: 0,
            gameStartTime: Date.now(),
            characterScores: {},
            characterLastHit: {},
            lastHitSequence: 0,
            lastEnemySpawn: Date.now(),
            lastBombSpawn: Date.now(),
            enemySpawnInterval: 750
        });
        
        // Note: Laser tips will be made visible automatically when players get calibrated
        // This happens in updatePlayerGaze() and updateEyeUI()
        
        this.updateScoreboard();
        this.updateTimer();
        
        // Clear previous game objects
        [this.enemies, this.lasers, this.particles, this.bombs].forEach(arr => {
            arr.forEach(obj => this.scene.remove(obj));
            arr.length = 0;
        });
        
        if (this.detectionEnabled && this.faceMesh && this.video) this.startFaceDetection();
    }
    
    async startFaceDetection() {
        const detect = async () => {
            if (!this.gameStarted) return;
            if (this.video.readyState >= 2) {
                try { await this.faceMesh.send({image: this.video}); } catch {}
            }
            requestAnimationFrame(detect);
        };
        detect();
    }
    
    spawnEnemy() {
        const enemyTexture = this.enemyTextures.length
            ? this.enemyTextures[Math.floor(Math.random() * this.enemyTextures.length)]
            : this.ghostTexture;
        const characterName = enemyTexture.userData?.characterName || 'Unknown';
        const seniorName = enemyTexture.userData?.seniorName || characterName;
        const enemy = new THREE.Mesh(
            new THREE.PlaneGeometry(80, 80),
            new THREE.MeshBasicMaterial({ map: enemyTexture, transparent: true, alphaTest: 0.1 })
        );
        
        const positions = [
            [(Math.random() - 0.5) * window.innerWidth, -window.innerHeight / 2 - 100],
            [window.innerWidth / 2 + 100, (Math.random() - 0.5) * window.innerHeight],
            [-window.innerWidth / 2 - 100, (Math.random() - 0.5) * window.innerHeight]
        ];
        
        [enemy.position.x, enemy.position.y] = positions[Math.floor(Math.random() * 3)];
        enemy.position.z = 0;
        
        enemy.userData = {
            health: 100,
            speed: this.isMobile ? 30 + Math.random() * 30 : 40 + Math.random() * 40,
            initialY: enemy.position.y,
            bobSpeed: 6 + Math.random() * 4,
            bobAmount: 40 + Math.random() * 20,
            rotationSpeed: 4 + Math.random() * 3,
            rotationAmount: (25 + Math.random() * 10) * (Math.PI / 180),
            timeOffset: Math.random() * Math.PI * 2,
            seniorName,
            characterName,
            targetX: (Math.random() - 0.5) * (window.innerWidth - 160),
            targetY: (Math.random() - 0.5) * (window.innerHeight - 160)
        };
        
        this.scene.add(enemy);
        this.enemies.push(enemy);
    }
    
    spawnBomb() {
        const bomb = new THREE.Mesh(
            new THREE.PlaneGeometry(170, 170),
            new THREE.ShaderMaterial({
                uniforms: { time: { value: 0 }, map: { value: this.bombTexture }, flashIntensity: { value: 0 } },
                vertexShader: `
                    uniform float time; varying vec2 vUv;
                    void main() { vUv = uv; vec3 pos = position * (1.0 + sin(time * 4.0) * 0.5); gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0); }`,
                fragmentShader: `
                    uniform sampler2D map; uniform float time, flashIntensity; varying vec2 vUv;
                    void main() {
                        vec4 texColor = texture2D(map, vUv); if (texColor.a < 0.1) discard;
                        vec3 finalColor = mix(texColor.rgb, vec3(1.0, 1.0, 0.3), flashIntensity);
                        gl_FragColor = vec4(finalColor, texColor.a);
                    }`,
                transparent: true
            })
        );
        
        const margin = 120;
        bomb.position.x = (Math.random() - 0.5) * (window.innerWidth - margin * 2);
        bomb.position.y = (Math.random() - 0.5) * (window.innerHeight - margin * 2);
        bomb.position.z = 10;
        
        bomb.userData = {
            health: 3,
            direction: { x: (Math.random() - 0.5) * 60, y: (Math.random() - 0.5) * 60 },
            speed: 20 + Math.random() * 30,
            rotationSpeed: 2 + Math.random() * 2,
            bobSpeed: 3 + Math.random() * 2,
            bobAmount: 15 + Math.random() * 10,
            timeOffset: Math.random() * Math.PI * 2,
            nextFlash: Date.now() + 2000 + Math.random() * 3000,
            flashDuration: 0
        };
        
        this.scene.add(bomb);
        this.bombs.push(bomb);
    }
    
    createLaser(startX, startY, endX, endY, player, beamType = 'eye') {
        const distance = Math.sqrt((endX - startX) ** 2 + (endY - startY) ** 2) * 4;
        const material = this.laserMaterial.clone();
        if (beamType === 'mouth') {
            material.uniforms.color.value = new THREE.Color(0.0, 0.9, 1.0);
        } else if (player.color === 'red') {
            material.uniforms.color.value = new THREE.Color(1.0, 0.02, 0.12);
        } else {
            material.uniforms.color.value = new THREE.Color(1.0, 0.22, 0.06);
        }
        const radiusTop = beamType === 'mouth' ? 32 : 25;
        const radiusBottom = beamType === 'mouth' ? 24 : 20;
        const laser = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, distance, 8), material);
        laser.position.set((startX + endX) / 2, (startY + endY) / 2, 20);
        laser.rotation.z = Math.atan2(endY - startY, endX - startX) - Math.PI / 2;
        laser.userData = { life: beamType === 'mouth' ? 0.35 : 0.5, maxLife: 1, player: player.color, beamType };
        this.scene.add(laser);
        this.lasers.push(laser);
    }
    
    createParticles(x, y, count = 8) {
        const positions = new Float32Array(count * 3);
        const lives = new Float32Array(count);
        const velocities = new Float32Array(count * 3);
        const indices = new Float32Array(count);
        
        for (let i = 0; i < count; i++) {
            const idx = i * 3;
            positions[idx] = x; positions[idx + 1] = y; positions[idx + 2] = 1;
            lives[i] = 1; indices[i] = i;
            const angle = (i / count) * Math.PI * 2;
            const speed = 50 + Math.random() * 250;
            velocities[idx] = Math.cos(angle) * speed;
            velocities[idx + 1] = Math.sin(angle) * speed;
            velocities[idx + 2] = (Math.random() - 0.5) * 40;
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('life', new THREE.BufferAttribute(lives, 1));
        geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
        geometry.setAttribute('sparkIndex', new THREE.BufferAttribute(indices, 1));
        
        const particles = new THREE.Points(geometry, this.particleMaterial);
        particles.userData = { life: 0.8, maxLife: 0.8, lives };
        this.scene.add(particles);
        this.particles.push(particles);
    }
    
    createExplosion(x, y, radius = 300) {
        const explosion = new THREE.Mesh(new THREE.CircleGeometry(radius, 32), this.explosionMaterial.clone());
        explosion.position.set(x, y, 25);
        explosion.userData = { life: 1.0, maxLife: 1.0, radius };
        this.scene.add(explosion);
        this.particles.push(explosion);
        return explosion;
    }

    recordCharacterHit(enemy) {
        const name = enemy.userData.seniorName || enemy.userData.characterName || 'Unknown';
        this.characterScores[name] = (this.characterScores[name] || 0) + 1;
        this.characterLastHit[name] = ++this.lastHitSequence;
        this.score++;
        this.updateScoreboard();
    }

    getWinner() {
        const entries = Object.entries(this.characterScores);
        if (!entries.length) {
            const availableNames = this.enemyTextures
                .map(texture => texture.userData?.seniorName)
                .filter(Boolean);
            const randomName = availableNames.length
                ? availableNames[Math.floor(Math.random() * availableNames.length)]
                : '尚無';

            return { name: randomName, score: 0, random: true };
        }

        entries.sort((a, b) => {
            const scoreDifference = b[1] - a[1];
            if (scoreDifference !== 0) {
                return scoreDifference;
            }

            return (this.characterLastHit[b[0]] || 0) - (this.characterLastHit[a[0]] || 0);
        });

        return { name: entries[0][0], score: entries[0][1], random: false };
    }

    updateScoreboard() {
        const winner = this.getWinner();
        const scoreElement = document.getElementById('score');
        const leaderElement = document.getElementById('leaderName');

        if (scoreElement) scoreElement.textContent = this.score;
        if (leaderElement) leaderElement.textContent = winner.score > 0 ? `${winner.name}（${winner.score}）` : '尚無';
    }

    updateTimer() {
        const timerElement = document.getElementById('timer');
        if (!timerElement || !this.gameStarted) return 0;

        const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
        const remaining = Math.max(0, this.totalGameTime - elapsed);
        timerElement.textContent = remaining;
        return remaining;
    }

    async finishTimedGame() {
        this.gameOver = true;
        this.gameStarted = false;

        ['leftEye', 'rightEye', 'leftEye2', 'rightEye2', 'mouthPortal', 'mouthPortal2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        if (this.player1.laserTip) this.player1.laserTip.visible = false;
        if (this.player2.laserTip) this.player2.laserTip.visible = false;
        if (this.laserTip) this.laserTip.visible = false;

        const winner = this.getWinner();
        const winnerName = document.getElementById('winnerName');
        if (winnerName) winnerName.textContent = winner.random ? `${winner.name}（隨機）` : `${winner.name}（${winner.score}）`;
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'block';

        const resultStatus = document.getElementById('resultStatus');
        if (!window.FlowState || !this.pairingAllowed || !winner.name || winner.name === '尚無') {
            if (resultStatus) resultStatus.textContent = '無法寫入配對，請確認已從本機服務開啟並選定學弟妹。';
            return;
        }

        this.assignmentInProgress = true;
        if (resultStatus) resultStatus.textContent = `正在將 ${winner.name} 寫入目前學弟妹...`;
        this.setFlowStatus(`試煉完成，正在配對 ${winner.name}...`);

        try {
            await FlowState.assignSenior(winner.name, '念能力試煉');
            if (resultStatus) resultStatus.textContent = `已配對：${winner.name}`;
            this.setFlowStatus(`已將 ${winner.name} 寫入 ${this.currentStudent?.姓名 || '目前學弟妹'}。`);
            this.pairingAllowed = false;
        } catch (error) {
            if (resultStatus) resultStatus.textContent = error.message;
            this.setFlowStatus(error.message);
        } finally {
            this.assignmentInProgress = false;
        }
    }
    
    explodeBomb(bomb) {
        const explosionRadius = 400;
        this.createExplosion(bomb.position.x, bomb.position.y, explosionRadius);
        this.createParticles(bomb.position.x, bomb.position.y, 20);
        
        // Destroy enemies in blast radius
        this.enemies = this.enemies.filter(enemy => {
            const distance = Math.sqrt((enemy.position.x - bomb.position.x) ** 2 + (enemy.position.y - bomb.position.y) ** 2);
            if (distance < explosionRadius) {
                this.scene.remove(enemy);
                this.createParticles(enemy.position.x, enemy.position.y, 8);
                playGhostPopSound();
                return false;
            }
            return true;
        });
        
        // Remove bomb
        this.scene.remove(bomb);
        this.bombs.splice(this.bombs.indexOf(bomb), 1);
        playBombExplosionSound();
    }
    
    fireLaser(player) {
        if (!player.calibrated) return;
        
        const targetX = (player.smoothGaze.x - 0.5) * window.innerWidth;
        const targetY = -(player.smoothGaze.y - 0.5) * window.innerHeight;
        const leftEyeX = (player.leftEye.x - 0.5) * window.innerWidth;
        const leftEyeY = -(player.leftEye.y - 0.5) * window.innerHeight;
        const rightEyeX = (player.rightEye.x - 0.5) * window.innerWidth;
        const rightEyeY = -(player.rightEye.y - 0.5) * window.innerHeight;
        
        this.createLaser(leftEyeX, leftEyeY, targetX, targetY, player);
        this.createLaser(rightEyeX, rightEyeY, targetX, targetY, player);
        this.createParticles(targetX, targetY, 2);
        this.checkHit(targetX, targetY);
    }

    fireMouthLaser(player) {
        if (!player.calibrated || !player.mouth.isOpen) return;

        const targetX = (player.smoothGaze.x - 0.5) * window.innerWidth;
        const targetY = -(player.smoothGaze.y - 0.5) * window.innerHeight;
        const mouthX = (player.mouth.x - 0.5) * window.innerWidth;
        const mouthY = -(player.mouth.y - 0.5) * window.innerHeight;

        this.createLaser(mouthX, mouthY, targetX, targetY, player, 'mouth');
        this.createParticles(targetX, targetY, 4);
        this.checkHit(targetX, targetY, 'mouth');
    }

    checkHit(x, y, source = 'eye') {
        // Check bomb hits first
        for (let i = this.bombs.length - 1; i >= 0; i--) {
            const bomb = this.bombs[i];
            if (Math.sqrt((bomb.position.x - x) ** 2 + (bomb.position.y - y) ** 2) < 120) {
                bomb.userData.health--;
                if (bomb.material.uniforms?.flashIntensity) bomb.material.uniforms.flashIntensity.value = 1.0;
                this.createParticles(bomb.position.x, bomb.position.y, 4);
                playBombHitSound();
                setTimeout(() => {
                    if (bomb.material?.uniforms?.flashIntensity) bomb.material.uniforms.flashIntensity.value = 0;
                }, 150);
                if (bomb.userData.health <= 0) this.explodeBomb(bomb);
                return;
            }
        }
        
        // Check enemy hits
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (Math.sqrt((enemy.position.x - x) ** 2 + (enemy.position.y - y) ** 2) < 120) {
                this.recordCharacterHit(enemy);
                enemy.userData.health -= source === 'mouth' ? 45 : 35;
                enemy.material.color.setHex(source === 'mouth' ? 0x00eaff : 0xff224c);
                this.createParticles(enemy.position.x, enemy.position.y, source === 'mouth' ? 12 : 8);
                playGhostPopSound();
                setTimeout(() => { if (enemy.material) enemy.material.color.setHex(0xffffff); }, 100);
                if (enemy.userData.health <= 0) {
                    this.scene.remove(enemy);
                    this.enemies.splice(i, 1);
                }
                return;
            }
        }
    }
    
    checkMouthEating() {
        if (!this.gameStarted) return;
        
        [this.player1, this.player2].forEach(player => {
            if (!player.mouth.isOpen || !player.calibrated) return;
            
            const mouthX = (player.mouth.x - 0.5) * window.innerWidth;
            const mouthY = -(player.mouth.y - 0.5) * window.innerHeight;
            
            this.enemies = this.enemies.filter(enemy => {
                const distance = Math.sqrt((enemy.position.x - mouthX) ** 2 + (enemy.position.y - mouthY) ** 2);
                if (distance < 160) {
                    this.scene.remove(enemy);
                    this.createParticles(enemy.position.x, enemy.position.y, 12);
                    playMouthEatSound();
                    return false;
                }
                return true;
            });
        });
    }
    
    triggerGameOver() {
        this.gameOver = true;
        this.gameStarted = false;
        
        // Hide all eye indicators
        ['leftEye', 'rightEye', 'leftEye2', 'rightEye2', 'mouthPortal', 'mouthPortal2'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });
        
        // Hide both laser tips
        if (this.player1.laserTip) this.player1.laserTip.visible = false;
        if (this.player2.laserTip) this.player2.laserTip.visible = false;
        
        // Keep backward compatibility
        if (this.laserTip) this.laserTip.visible = false;
        
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'block';
    }
    
    update(deltaTime) {
        if (this.gameOver) return;
        
        const now = Date.now();
        const time = now * 0.001;
        
        if (this.updateTimer() <= 0) {
            this.finishTimedGame();
            return;
        }
        
        // Spawning
        if (now - this.lastEnemySpawn > this.enemySpawnInterval) {
            this.spawnEnemy();
            this.lastEnemySpawn = now;
            this.enemySpawnInterval = Math.max(220, this.enemySpawnInterval - 18);
        }
        
        if (now - this.lastBombSpawn > this.bombSpawnInterval) {
            this.spawnBomb();
            this.lastBombSpawn = now;
            this.bombSpawnInterval = 6000 + Math.random() * 7000;
        }
        
        // Auto-fire for both players
        [this.player1, this.player2].forEach(player => {
            if (this.abilityMode === 'eye' && player.calibrated && now - player.lastLaserTime > 180) {
                this.fireLaser(player);
                player.lastLaserTime = now;
            }

            if (this.abilityMode === 'mouth' && player.calibrated && player.mouth.isOpen && now - player.lastMouthLaserTime > 260) {
                this.fireMouthLaser(player);
                player.lastMouthLaserTime = now;
            }
        });
        
        // Mouth-open shots use a separate beam; direct mouth eating is disabled.
        
        // Update bombs
        this.bombs.forEach(bomb => {
            const userData = bomb.userData;
            
            if (bomb.material.uniforms) {
                bomb.material.uniforms.time.value = time;
                
                // Flash effect
                if (now > userData.nextFlash) {
                    userData.flashDuration = 600;
                    userData.nextFlash = now + 2000 + Math.random() * 2000;
                }
                
                if (userData.flashDuration > 0) {
                    userData.flashDuration -= deltaTime * 1000;
                    bomb.material.uniforms.flashIntensity.value = Math.max(0, userData.flashDuration / 300) * 0.8;
                } else {
                    bomb.material.uniforms.flashIntensity.value = 0;
                }
            }
            
            // Random direction changes
            if (Math.random() < 0.02) {
                userData.direction.x += (Math.random() - 0.5) * 40;
                userData.direction.y += (Math.random() - 0.5) * 40;
                const speed = Math.sqrt(userData.direction.x ** 2 + userData.direction.y ** 2);
                if (speed > userData.speed) {
                    userData.direction.x = (userData.direction.x / speed) * userData.speed;
                    userData.direction.y = (userData.direction.y / speed) * userData.speed;
                }
            }
            
            // Move and bounce
            bomb.position.x += userData.direction.x * deltaTime;
            bomb.position.y += userData.direction.y * deltaTime;
            
            const margin = 100;
            if (bomb.position.x > window.innerWidth/2 - margin || bomb.position.x < -window.innerWidth/2 + margin) {
                userData.direction.x *= -1;
                bomb.position.x = Math.max(-window.innerWidth/2 + margin, Math.min(window.innerWidth/2 - margin, bomb.position.x));
            }
            if (bomb.position.y > window.innerHeight/2 - margin || bomb.position.y < -window.innerHeight/2 + margin) {
                userData.direction.y *= -1;
                bomb.position.y = Math.max(-window.innerHeight/2 + margin, Math.min(window.innerHeight/2 - margin, bomb.position.y));
            }
            
            // Bobbing and rotation
            bomb.position.y += Math.sin(time * userData.bobSpeed + userData.timeOffset) * userData.bobAmount * deltaTime;
            bomb.rotation.z += userData.rotationSpeed * deltaTime;
        });
        
        // Update enemies
        this.enemies.forEach(enemy => {
            const dx = enemy.userData.targetX - enemy.position.x;
            const dy = enemy.userData.targetY - enemy.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 5) {
                enemy.position.x += (dx / distance) * enemy.userData.speed * deltaTime;
                enemy.position.y += (dy / distance) * enemy.userData.speed * deltaTime;
            } else {
                enemy.userData.targetX = (Math.random() - 0.5) * (window.innerWidth - 160);
                enemy.userData.targetY = (Math.random() - 0.5) * (window.innerHeight - 160);
            }
            
            // Bobbing and rotation
            enemy.position.y += Math.sin(time * enemy.userData.bobSpeed + enemy.userData.timeOffset) * enemy.userData.bobAmount * deltaTime;
            enemy.rotation.z = Math.sin(time * enemy.userData.rotationSpeed + enemy.userData.timeOffset) * enemy.userData.rotationAmount;
        });
        
        // Update lasers
        this.lasers = this.lasers.filter(laser => {
            laser.userData.life -= deltaTime;
            if (laser.material.uniforms) laser.material.uniforms.intensity.value = laser.userData.life / laser.userData.maxLife;
            if (laser.userData.life <= 0) {
                this.scene.remove(laser);
                return false;
            }
            return true;
        });
        
        // Update particles
        this.particles = this.particles.filter(particles => {
            particles.userData.life -= deltaTime;
            
            // Handle explosion effects
            if (particles.material === this.explosionMaterial || particles.material.uniforms?.progress) {
                const progress = 1.0 - particles.userData.life / particles.userData.maxLife;
                if (particles.material.uniforms?.progress) particles.material.uniforms.progress.value = progress;
            }
            
            // Handle regular particles
            if (particles.userData.lives) {
                const lives = particles.userData.lives;
                for (let j = 0; j < lives.length; j++) {
                    lives[j] -= deltaTime * (0.8 + Math.random() * 1.6);
                    lives[j] = Math.max(0, lives[j]);
                }
                particles.geometry.attributes.life.needsUpdate = true;
            }
            
            if (particles.userData.life <= 0) {
                this.scene.remove(particles);
                return false;
            }
            return true;
        });
    }
    
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const time = Date.now() * 0.001;
        
        // Update shader uniforms for all materials
        [this.laserMaterial, this.particleMaterial, this.explosionMaterial].forEach(material => {
            if (material?.uniforms?.time) material.uniforms.time.value = time;
        });
        
        // Update laser tip materials for both players
        if (this.player1.laserTip?.material?.uniforms?.time) {
            this.player1.laserTip.material.uniforms.time.value = time;
        }
        if (this.player2.laserTip?.material?.uniforms?.time) {
            this.player2.laserTip.material.uniforms.time.value = time;
        }
        
        // Update bomb shader uniforms
        this.bombs.forEach(bomb => {
            if (bomb.material.uniforms?.time) bomb.material.uniforms.time.value = time;
        });
        
        if (this.gameStarted) {
            this.update(0.016);
            // Always update eye UI regardless of detection mode
            this.updateEyeUI();
        }
        
        this.renderer.render(this.scene, this.camera);
    }
}

window.addEventListener('load', () => new LaserGame());
