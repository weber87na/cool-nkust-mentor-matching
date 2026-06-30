// sound.js - Fixed version to prevent Tone.js timing conflicts
// Import Tone.js
const toneScript = document.createElement('script');
toneScript.src = "https://cdnjs.cloudflare.com/ajax/libs/tone/14.8.49/Tone.min.js";
document.head.appendChild(toneScript);

// Sound player setup
let popSynth, dangerSynth, bombHitSynth, explosionSynth, mouthEatSynth;
let audioContext;
let isAudioInitialized = false;

// Track last play times to prevent overlapping sounds
let lastSoundTimes = {
    ghostPop: 0,
    kittenAlert: 0,
    bombHit: 0,
    bombExplosion: 0,
    mouthEat: 0
};

// Minimum time between identical sounds (in milliseconds)
const SOUND_COOLDOWNS = {
    ghostPop: 50,
    kittenAlert: 100,
    bombHit: 100,
    bombExplosion: 500,
    mouthEat: 150
};

// Helper function to safely trigger sounds with timing protection
function safeTrigger(synthName, synth, note, duration, soundType) {
    if (!synth || !isAudioInitialized) return;
    
    const now = Date.now();
    const lastTime = lastSoundTimes[soundType] || 0;
    const cooldown = SOUND_COOLDOWNS[soundType] || 50;
    
    // Check if enough time has passed since last sound of this type
    if (now - lastTime < cooldown) {
        return; // Skip this sound to prevent overlap
    }
    
    try {
        // Ensure audio context is running
        if (Tone.context.state !== 'running') {
            Tone.context.resume();
        }
        
        // Use Tone.now() + small offset for scheduling
        const scheduleTime = Tone.now() + 0.001;
        
        if (duration) {
            synth.triggerAttackRelease(note, duration, scheduleTime);
        } else {
            synth.triggerAttackRelease(note, scheduleTime);
        }
        
        lastSoundTimes[soundType] = now;
    } catch (error) {
        console.warn(`Sound error for ${synthName}:`, error.message);
        // Attempt to restart audio context if needed
        if (error.message.includes('Start time')) {
            setTimeout(() => {
                try {
                    Tone.Transport.stop();
                    Tone.Transport.start();
                } catch (e) {
                    console.warn('Failed to restart Tone.js transport:', e);
                }
            }, 100);
        }
    }
}

// Initialize audio context properly
function initializeAudio() {
    if (isAudioInitialized) return Promise.resolve();
    
    return new Promise((resolve) => {
        const tryInit = async () => {
            try {
                await Tone.start();
                isAudioInitialized = true;
                console.log('Audio context initialized successfully');
                resolve();
            } catch (error) {
                console.warn('Failed to initialize audio context:', error);
                // Try again after user interaction
                setTimeout(tryInit, 1000);
            }
        };
        tryInit();
    });
}

// Add click listener to initialize audio on first user interaction
document.addEventListener('click', initializeAudio, { once: true });
document.addEventListener('touchstart', initializeAudio, { once: true });

toneScript.onload = () => {
    // Initialize audio context
    initializeAudio().then(() => {
        // Retro Pop Synth for ghost hit
        popSynth = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 2,
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.001,
                decay: 0.4,
                sustain: 0.01,
                release: 0.2
            }
        }).toDestination();
        popSynth.volume.value = -4;

        // Danger Alert Synth for kitten capture
        dangerSynth = new Tone.MonoSynth({
            oscillator: { type: "sawtooth" },
            envelope: {
                attack: 0.001,
                decay: 0.3,
                sustain: 0.1,
                release: 0.5
            },
            filterEnvelope: {
                attack: 0.01,
                decay: 0.2,
                sustain: 0.2,
                release: 0.4,
                baseFrequency: 200,
                octaves: 4
            }
        }).toDestination();
        dangerSynth.volume.value = -2;

        // Bomb Hit Synth - metallic clang sound
        bombHitSynth = new Tone.MetalSynth({
            frequency: 200,
            envelope: {
                attack: 0.001,
                decay: 0.1,
                release: 0.2
            },
            harmonicity: 5.1,
            modulationIndex: 32,
            resonance: 4000,
            octaves: 1.5
        }).toDestination();
        bombHitSynth.volume.value = -6;

        // Explosion Synth - big boom sound
        explosionSynth = new Tone.NoiseSynth({
            noise: { type: "brown" },
            envelope: {
                attack: 0.001,
                decay: 1.2,
                sustain: 0,
                release: 2.0
            }
        }).toDestination();
        explosionSynth.volume.value = 6;

        // Add reverb and distortion for explosion
        const explosionReverb = new Tone.Reverb({
            decay: 3,
            wet: 0.5
        }).toDestination();
        
        const explosionDistortion = new Tone.Distortion({
            distortion: 0.3,
            wet: 0.4
        }).connect(explosionReverb);
        
        explosionSynth.connect(explosionDistortion);
        
        // Mouth Eat Synth - satisfying chomping sound
        mouthEatSynth = new Tone.NoiseSynth({
            noise: { type: "brown" },
            envelope: {
                attack: 0.005,
                decay: 0.08,
                sustain: 0.02,
                release: 0.12
            }
        }).toDestination();
        mouthEatSynth.volume.value = -1;
    });
};

// Play pop when ghost is hit
function playGhostPopSound() {
    safeTrigger('popSynth', popSynth, "G3", "64n", 'ghostPop');
}

// Play alert when kitten disappears
function playKittenAlertSound() {
    if (!dangerSynth || !isAudioInitialized) return;
    
    const now = Date.now();
    if (now - (lastSoundTimes.kittenAlert || 0) < SOUND_COOLDOWNS.kittenAlert) {
        return;
    }
    
    try {
        const baseTime = Tone.now();
        dangerSynth.triggerAttackRelease("C5", "16n", baseTime + 0.001);
        dangerSynth.triggerAttackRelease("EB4", "16n", baseTime + 0.101);
        dangerSynth.triggerAttackRelease("C4", "16n", baseTime + 0.201);
        lastSoundTimes.kittenAlert = now;
    } catch (error) {
        console.warn('Kitten alert sound error:', error.message);
    }
}

// Play metallic clang when bomb is hit
function playBombHitSound() {
    safeTrigger('bombHitSynth', bombHitSynth, "C4", "32n", 'bombHit');
}

// Play explosion sound when bomb detonates
function playBombExplosionSound() {
    if (!explosionSynth || !isAudioInitialized) return;
    
    const now = Date.now();
    if (now - (lastSoundTimes.bombExplosion || 0) < SOUND_COOLDOWNS.bombExplosion) {
        return;
    }
    
    try {
        const baseTime = Tone.now();
        
        // Main explosion
        explosionSynth.triggerAttackRelease("8n", baseTime + 0.001);
        
        // Create temporary synths for layered explosion effects
        // Bass rumbles
        const rumbleSynth1 = new Tone.MembraneSynth({
            pitchDecay: 0.08,
            octaves: 3,
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.001,
                decay: 0.6,
                sustain: 0.1,
                release: 2.0
            }
        }).toDestination();
        rumbleSynth1.volume.value = -3;
        rumbleSynth1.triggerAttackRelease("C0", "2n", baseTime + 0.002);
        
        const rumbleSynth2 = new Tone.MembraneSynth({
            pitchDecay: 0.05,
            octaves: 2,
            oscillator: { type: "triangle" },
            envelope: {
                attack: 0.005,
                decay: 0.8,
                sustain: 0.05,
                release: 1.8
            }
        }).toDestination();
        rumbleSynth2.volume.value = -5;
        rumbleSynth2.triggerAttackRelease("G0", "4n", baseTime + 0.003);
        
        // Delayed effects with proper timing
        setTimeout(() => {
            try {
                const crackleSynth = new Tone.NoiseSynth({
                    noise: { type: "white" },
                    envelope: {
                        attack: 0.001,
                        decay: 0.4,
                        sustain: 0,
                        release: 0.8
                    }
                }).toDestination();
                crackleSynth.volume.value = 3;
                crackleSynth.triggerAttackRelease("16n", Tone.now() + 0.001);
            } catch (e) {
                console.warn('Crackle sound error:', e);
            }
        }, 20);
        
        setTimeout(() => {
            try {
                const shrapnelSynth = new Tone.MetalSynth({
                    frequency: 400,
                    envelope: {
                        attack: 0.001,
                        decay: 0.5,
                        release: 1.2
                    },
                    harmonicity: 12,
                    modulationIndex: 50,
                    resonance: 3000,
                    octaves: 3
                }).toDestination();
                shrapnelSynth.volume.value = -6;
                
                const shrapnelTime = Tone.now();
                shrapnelSynth.triggerAttackRelease("E4", "4n", shrapnelTime + 0.001);
                shrapnelSynth.triggerAttackRelease("C5", "8n", shrapnelTime + 0.101);
                shrapnelSynth.triggerAttackRelease("G3", "8n", shrapnelTime + 0.201);
            } catch (e) {
                console.warn('Shrapnel sound error:', e);
            }
        }, 50);
        
        setTimeout(() => {
            try {
                const thunderSynth = new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: {
                        attack: 0.1,
                        decay: 1.5,
                        sustain: 0,
                        release: 2.5
                    }
                }).toDestination();
                thunderSynth.volume.value = 0;
                thunderSynth.triggerAttackRelease("2n", Tone.now() + 0.001);
            } catch (e) {
                console.warn('Thunder sound error:', e);
            }
        }, 100);
        
        lastSoundTimes.bombExplosion = now;
    } catch (error) {
        console.warn('Explosion sound error:', error.message);
    }
}

// Play chomping sound when ghost is eaten by mouth
function playMouthEatSound() {
    if (!mouthEatSynth || !isAudioInitialized) return;
    
    const now = Date.now();
    if (now - (lastSoundTimes.mouthEat || 0) < SOUND_COOLDOWNS.mouthEat) {
        return;
    }
    
    try {
        const baseTime = Tone.now();
        
        // Main chomp
        mouthEatSynth.triggerAttackRelease("16n", baseTime + 0.001);
        
        // Jaw snap
        const jawSnapSynth = new Tone.MembraneSynth({
            pitchDecay: 0.02,
            octaves: 2,
            oscillator: { type: "sine" },
            envelope: {
                attack: 0.001,
                decay: 0.06,
                sustain: 0,
                release: 0.08
            }
        }).toDestination();
        jawSnapSynth.volume.value = 0;
        jawSnapSynth.triggerAttackRelease("C2", "8n", baseTime + 0.002);
        
        // Delayed effects
        setTimeout(() => {
            try {
                mouthEatSynth.triggerAttackRelease("32n", Tone.now() + 0.001);
                
                const jawCloseSynth = new Tone.MembraneSynth({
                    pitchDecay: 0.015,
                    octaves: 1.5,
                    oscillator: { type: "triangle" },
                    envelope: {
                        attack: 0.001,
                        decay: 0.04,
                        sustain: 0,
                        release: 0.06
                    }
                }).toDestination();
                jawCloseSynth.volume.value = -2;
                jawCloseSynth.triggerAttackRelease("G2", "32n", Tone.now() + 0.002);
            } catch (e) {
                console.warn('Jaw close sound error:', e);
            }
        }, 60);
        
        setTimeout(() => {
            try {
                const gulpSynth = new Tone.Synth({
                    oscillator: { type: "sine" },
                    envelope: {
                        attack: 0.02,
                        decay: 0.15,
                        sustain: 0,
                        release: 0.2
                    }
                }).toDestination();
                gulpSynth.volume.value = 4;
                gulpSynth.triggerAttackRelease("E4", "8n", Tone.now() + 0.001);
            } catch (e) {
                console.warn('Gulp sound error:', e);
            }
        }, 120);
        
        setTimeout(() => {
            try {
                const crunchSynth = new Tone.NoiseSynth({
                    noise: { type: "pink" },
                    envelope: {
                        attack: 0.001,
                        decay: 0.05,
                        sustain: 0.3,
                        release: 0.03
                    }
                }).toDestination();
                crunchSynth.volume.value = 4;
                crunchSynth.triggerAttackRelease("16n", Tone.now() + 0.001);
            } catch (e) {
                console.warn('Crunch sound error:', e);
            }
        }, 30);
        
        lastSoundTimes.mouthEat = now;
    } catch (error) {
        console.warn('Mouth eat sound error:', error.message);
    }
}