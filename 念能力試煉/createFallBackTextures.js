function createFallbackBombTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Create a simple bomb sprite
    // Main bomb body (black sphere)
    ctx.fillStyle = '#333333';
    ctx.beginPath();
    ctx.arc(32, 40, 20, 0, Math.PI * 2);
    ctx.fill();
    
    // Highlight on bomb
    ctx.fillStyle = '#666666';
    ctx.beginPath();
    ctx.arc(26, 34, 6, 0, Math.PI * 2);
    ctx.fill();
    
    // Fuse
    ctx.strokeStyle = '#8B4513';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(32, 20);
    ctx.lineTo(35, 10);
    ctx.lineTo(40, 8);
    ctx.stroke();
    
    // Spark at end of fuse
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(40, 8, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Spark rays
    ctx.strokeStyle = '#FF4500';
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(40, 8);
        ctx.lineTo(40 + Math.cos(angle) * 8, 8 + Math.sin(angle) * 8);
        ctx.stroke();
    }
    
    this.bombTexture = new THREE.CanvasTexture(canvas);
    this.bombTexture.magFilter = THREE.NearestFilter;
    this.bombTexture.minFilter = THREE.NearestFilter;
}

function createFallbackKittenTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Create a simple kitten sprite
    // Body
    ctx.fillStyle = '#ffaa66';
    ctx.fillRect(16, 32, 32, 24);
    
    // Head
    ctx.beginPath();
    ctx.arc(32, 24, 16, 0, Math.PI * 2);
    ctx.fill();
    
    // Ears
    ctx.beginPath();
    ctx.moveTo(20, 16);
    ctx.lineTo(26, 6);
    ctx.lineTo(32, 16);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(32, 16);
    ctx.lineTo(38, 6);
    ctx.lineTo(44, 16);
    ctx.closePath();
    ctx.fill();
    
    // Inner ears
    ctx.fillStyle = '#ff8844';
    ctx.beginPath();
    ctx.moveTo(22, 14);
    ctx.lineTo(26, 8);
    ctx.lineTo(30, 14);
    ctx.closePath();
    ctx.fill();
    
    ctx.beginPath();
    ctx.moveTo(34, 14);
    ctx.lineTo(38, 8);
    ctx.lineTo(42, 14);
    ctx.closePath();
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(26, 22, 2, 0, Math.PI * 2);
    ctx.arc(38, 22, 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Nose
    ctx.fillStyle = '#ff6699';
    ctx.beginPath();
    ctx.arc(32, 26, 1, 0, Math.PI * 2);
    ctx.fill();
    
    // Stripes
    ctx.fillStyle = '#dd8833';
    ctx.fillRect(20, 18, 24, 2);
    ctx.fillRect(18, 32, 28, 2);
    ctx.fillRect(18, 40, 28, 2);
    ctx.fillRect(18, 48, 28, 2);
    
    this.kittenTexture = new THREE.CanvasTexture(canvas);
    this.kittenTexture.magFilter = THREE.NearestFilter;
    this.kittenTexture.minFilter = THREE.NearestFilter;
}

function createFallbackGhostTexture(){
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    // Create a simple ghost sprite
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(32, 28, 24, 0, Math.PI * 2);
    ctx.fill();
    
    // Ghost body
    ctx.fillRect(8, 28, 48, 28);
    
    // Ghost bottom wavy part
    ctx.beginPath();
    ctx.moveTo(8, 56);
    ctx.lineTo(16, 48);
    ctx.lineTo(24, 56);
    ctx.lineTo(32, 48);
    ctx.lineTo(40, 56);
    ctx.lineTo(48, 48);
    ctx.lineTo(56, 56);
    ctx.lineTo(56, 64);
    ctx.lineTo(8, 64);
    ctx.closePath();
    ctx.fill();
    
    // Eyes
    ctx.fillStyle = '#000000';
    ctx.beginPath();
    ctx.arc(24, 24, 4, 0, Math.PI * 2);
    ctx.arc(40, 24, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Mouth
    ctx.beginPath();
    ctx.arc(32, 36, 3, 0, Math.PI);
    ctx.fill();
    
    this.ghostTexture = new THREE.CanvasTexture(canvas);
    this.ghostTexture.magFilter = THREE.NearestFilter;
    this.ghostTexture.minFilter = THREE.NearestFilter;
}