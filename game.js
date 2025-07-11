class VirusDodgeGame {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.startScreen = document.getElementById('startScreen');
        this.gameOverScreen = document.getElementById('gameOverScreen');
        this.startBtn = document.getElementById('startBtn');
        this.tryAgainBtn = document.getElementById('tryAgainBtn');
        this.gameOverText = document.getElementById('gameOverText');
        this.scoreDisplay = document.getElementById('scoreDisplay');
        this.trollface = document.getElementById('trollface');
        
        this.setupCanvas();
        this.bindEvents();
        this.reset();
    }

    setupCanvas() {
        this.canvas.width = 1200;
        this.canvas.height = 800;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startGame());
        this.tryAgainBtn.addEventListener('click', () => this.reset());
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));
        document.addEventListener('keyup', (e) => this.handleKeyUp(e));
    }

    reset() {
        this.gameState = 'start';
        this.player = { x: this.centerX, y: this.centerY, radius: 30 };
        this.viruses = [];
        this.score = 0;
        this.gameStartTime = 0;
        this.gameOverTime = 0;
        this.trollfaceShown = false;
        this.letterAnimationIndex = 0;
        this.letterAnimationDirection = 1;
        this.letterAnimationTimer = 0;
        
        // Difficulty progression
        this.spawnRate = 0.01; // Start with low spawn rate
        this.maxSpawnRate = 0.15; // Increased maximum spawn rate
        this.difficultyIncreaseInterval = 10000; // Increase difficulty every 10 seconds
        this.lastDifficultyIncrease = 0;
        
        // Initialize key states for smooth movement
        this.keys = {
            w: false,
            s: false,
            a: false,
            d: false,
            arrowup: false,
            arrowdown: false,
            arrowleft: false,
            arrowright: false
        };
        
        this.startScreen.classList.remove('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.trollface.classList.add('hidden');
        
        // Clear any existing trollface timeout
        if (this.trollfaceTimeout) {
            clearTimeout(this.trollfaceTimeout);
            this.trollfaceTimeout = null;
        }
        
        // Stop trollface animation
        if (this.trollfaceAnimationId) {
            cancelAnimationFrame(this.trollfaceAnimationId);
            this.trollfaceAnimationId = null;
        }
        
        // Clear letter animation interval
        if (this.letterAnimationInterval) {
            clearInterval(this.letterAnimationInterval);
            this.letterAnimationInterval = null;
        }
        
        // Reset letter colors
        const letters = this.gameOverText.querySelectorAll('.letter');
        letters.forEach(letter => letter.classList.remove('green'));
    }

    startGame() {
        this.gameState = 'playing';
        this.gameStartTime = Date.now();
        this.startScreen.classList.add('hidden');
        this.gameOverScreen.classList.add('hidden');
        this.gameLoop();
    }

    handleKeyDown(e) {
        const key = e.key.toLowerCase();
        
        // Handle spacebar to start game or restart
        if (key === ' ') {
            e.preventDefault();
            if (this.gameState === 'start') {
                this.startGame();
            } else if (this.gameState === 'gameOver') {
                this.reset();
                this.startGame();
            }
            return;
        }
        
        // Handle movement keys only when playing
        if (this.gameState !== 'playing') return;
        
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = true;
            e.preventDefault();
        }
    }

    handleKeyUp(e) {
        const key = e.key.toLowerCase();
        if (this.keys.hasOwnProperty(key)) {
            this.keys[key] = false;
        }
    }

    updatePlayer() {
        if (this.gameState !== 'playing') return;
        
        const speed = 3;
        let dx = 0;
        let dy = 0;
        
        // Check movement keys
        if (this.keys.w || this.keys.arrowup) dy -= speed;
        if (this.keys.s || this.keys.arrowdown) dy += speed;
        if (this.keys.a || this.keys.arrowleft) dx -= speed;
        if (this.keys.d || this.keys.arrowright) dx += speed;
        
        // Normalize diagonal movement to maintain consistent speed
        if (dx !== 0 && dy !== 0) {
            const magnitude = Math.sqrt(dx * dx + dy * dy);
            dx = (dx / magnitude) * speed;
            dy = (dy / magnitude) * speed;
        }
        
        // Apply movement
        this.player.x += dx;
        this.player.y += dy;
        
        // Keep player within bounds
        this.player.x = Math.max(this.player.radius, Math.min(this.canvas.width - this.player.radius, this.player.x));
        this.player.y = Math.max(this.player.radius, Math.min(this.canvas.height - this.player.radius, this.player.y));
    }

    spawnVirus() {
        const side = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
        let x, y;
        
        switch(side) {
            case 0: // top
                x = Math.random() * this.canvas.width;
                y = -20;
                break;
            case 1: // right
                x = this.canvas.width + 20;
                y = Math.random() * this.canvas.height;
                break;
            case 2: // bottom
                x = Math.random() * this.canvas.width;
                y = this.canvas.height + 20;
                break;
            case 3: // left
                x = -20;
                y = Math.random() * this.canvas.height;
                break;
        }
        
        const virus = {
            x: x,
            y: y,
            radius: 28,
            speed: 1.5 + Math.random() * 1
        };
        
        this.viruses.push(virus);
    }

    updateViruses() {
        for (let i = this.viruses.length - 1; i >= 0; i--) {
            const virus = this.viruses[i];
            
            // Calculate direction to center
            const dx = this.centerX - virus.x;
            const dy = this.centerY - virus.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 0) {
                virus.x += (dx / distance) * virus.speed;
                virus.y += (dy / distance) * virus.speed;
            }
            
            // Start disintegration when virus gets close to center
            if (distance < 50 && !virus.disintegrating) {
                virus.disintegrating = true;
                virus.disintegrationStart = Date.now();
                virus.disintegrationDuration = 1000; // 1 second disintegration
            }
            
            // Remove viruses that have finished disintegrating
            if (virus.disintegrating) {
                const elapsed = Date.now() - virus.disintegrationStart;
                if (elapsed >= virus.disintegrationDuration) {
                    this.viruses.splice(i, 1);
                }
            }
        }
    }

    updateDifficulty() {
        if (this.gameState !== 'playing') return;
        
        const currentTime = Date.now();
        const gameTime = currentTime - this.gameStartTime;
        
        // Increase difficulty every 10 seconds with logarithmic progression
        if (gameTime - this.lastDifficultyIncrease >= this.difficultyIncreaseInterval && this.spawnRate < this.maxSpawnRate) {
            // Logarithmic increase: faster at the beginning, slower as it approaches max
            const progress = this.spawnRate / this.maxSpawnRate;
            const increase = 0.02 * (1 - progress * 0.5); // Decrease increase rate as difficulty rises
            this.spawnRate = Math.min(this.maxSpawnRate, this.spawnRate + increase);
            this.lastDifficultyIncrease = currentTime;
        }
    }

    checkCollisions() {
        for (const virus of this.viruses) {
            const dx = this.player.x - virus.x;
            const dy = this.player.y - virus.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance < this.player.radius + virus.radius) {
                this.gameOver();
                return;
            }
        }
    }

    gameOver() {
        this.gameState = 'dying';
        this.gameOverTime = Date.now();
        this.score = Math.floor((this.gameOverTime - this.gameStartTime) / 1000);
        
        // Start Pac-Man style death animation
        this.startDeathAnimation();
    }

    startDeathAnimation() {
        this.deathAnimationStart = Date.now();
        this.deathAnimationDuration = 3000; // 3 seconds for death animation
        
        // Continue the game loop for death animation
        this.deathAnimationLoop();
    }

    deathAnimationLoop() {
        if (this.gameState !== 'dying') return;
        
        const elapsed = Date.now() - this.deathAnimationStart;
        const progress = elapsed / this.deathAnimationDuration;
        
        if (progress >= 1) {
            // Death animation complete, show game over screen
            this.gameState = 'gameOver';
            this.gameOverScreen.classList.remove('hidden');
            
            // Add congratulations message based on survival time
            let congratulations = '';
            if (this.score >= 90) {
                congratulations = 'You are the Virus Dodging Master!';
            } else if (this.score >= 60) {
                congratulations = 'Unbelievable!';
            } else if (this.score >= 45) {
                congratulations = 'Wow! Amazing!';
            } else if (this.score >= 30) {
                congratulations = 'Good job!';
            }
            
            const timeText = this.score === 1 ? '1 second' : `${this.score} seconds`;
            this.scoreDisplay.innerHTML = `You survived for ${timeText}!<br><span class="congratulations">${congratulations}</span>`;
            this.animateLetters();
            
            // Show trollface after 10 seconds
            this.trollfaceTimeout = setTimeout(() => {
                this.trollface.classList.remove('hidden');
                this.startTrollfaceAnimation();
            }, 10000);
            return;
        }
        
        // Draw everything including the wiping player
        this.draw();
        
        // Create confetti at the end
        if (progress > 0.95) {
            this.createConfetti();
        }
        
        requestAnimationFrame(() => this.deathAnimationLoop());
    }

    createConfetti() {
        // Create a few black confetti particles
        for (let i = 0; i < 4; i++) {
            const confetti = document.createElement('div');
            confetti.style.position = 'absolute';
            confetti.style.left = (this.player.x - 2) + 'px';
            confetti.style.top = (this.player.y - 2) + 'px';
            confetti.style.width = '3px';
            confetti.style.height = '3px';
            confetti.style.backgroundColor = '#000000';
            confetti.style.borderRadius = '50%';
            confetti.style.zIndex = '1000';
            
            // Random direction and slower speed
            const angle = (Math.PI * 2 * i) / 4;
            const speed = 1 + Math.random() * 2;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            let posX = this.player.x;
            let posY = this.player.y;
            
            const animateConfetti = () => {
                posX += vx;
                posY += vy;
                confetti.style.left = posX + 'px';
                confetti.style.top = posY + 'px';
                
                // Limit confetti to stay within a reasonable range from the player
                const maxDistance = 150; // About 5x player radius
                const distanceFromPlayer = Math.sqrt((posX - this.player.x) ** 2 + (posY - this.player.y) ** 2);
                
                if (distanceFromPlayer < maxDistance) {
                    requestAnimationFrame(animateConfetti);
                } else {
                    confetti.remove();
                }
            };
            
            document.getElementById('gameContainer').appendChild(confetti);
            requestAnimationFrame(animateConfetti);
        }
    }

    startTrollfaceAnimation() {
        const trollface = this.trollface;
        const container = document.getElementById('gameContainer');
        const containerRect = container.getBoundingClientRect();
        
        // Animation parameters
        const padding = 10;
        const imageSize = 80;
        const width = containerRect.width - imageSize - padding * 2;
        const height = containerRect.height - imageSize - padding * 2;
        
        let startTime = Date.now();
        const pauseDuration = 3000; // 3 seconds pause
        const cycleDuration = 12000; // 12 seconds per cycle
        
        const animate = () => {
            const elapsed = Date.now() - startTime;
            
            // Pause for first 3 seconds
            if (elapsed < pauseDuration) {
                // Stay at top left
                trollface.style.left = padding + 'px';
                trollface.style.top = padding + 'px';
                trollface.style.transform = 'none';
            } else {
                // Start moving around edges
                const cycleElapsed = elapsed - pauseDuration;
                const progress = (cycleElapsed % cycleDuration) / cycleDuration;
                
                // Calculate position around the rectangle
                let x, y;
                
                if (progress < 0.25) {
                    // Top edge: left to right
                    const edgeProgress = progress / 0.25;
                    x = padding + edgeProgress * width;
                    y = padding;
                } else if (progress < 0.5) {
                    // Right edge: top to bottom
                    const edgeProgress = (progress - 0.25) / 0.25;
                    x = padding + width;
                    y = padding + edgeProgress * height;
                } else if (progress < 0.75) {
                    // Bottom edge: right to left
                    const edgeProgress = (progress - 0.5) / 0.25;
                    x = padding + width - edgeProgress * width;
                    y = padding + height;
                } else {
                    // Left edge: bottom to top
                    const edgeProgress = (progress - 0.75) / 0.25;
                    x = padding;
                    y = padding + height - edgeProgress * height;
                }
                
                trollface.style.left = x + 'px';
                trollface.style.top = y + 'px';
                trollface.style.transform = 'none';
            }
            
            this.trollfaceAnimationId = requestAnimationFrame(animate);
        };
        
        // Set initial position to top-left corner to prevent glitch
        trollface.style.left = padding + 'px';
        trollface.style.top = padding + 'px';
        trollface.style.transform = 'none';
        
        animate();
    }

    animateLetters() {
        const letters = this.gameOverText.querySelectorAll('.letter');
        
        // Clear any existing interval
        if (this.letterAnimationInterval) {
            clearInterval(this.letterAnimationInterval);
        }
        
        this.letterAnimationInterval = setInterval(() => {
            if (this.letterAnimationDirection === 1) {
                // Phase 1: Turn letters green from left to right, one at a time
                if (this.letterAnimationIndex < letters.length) {
                    letters[this.letterAnimationIndex].classList.add('green');
                    this.letterAnimationIndex++;
                } else {
                    // All letters are green, wait a moment then start turning them black
                    this.letterAnimationDirection = -1;
                    this.letterAnimationIndex = 0;
                }
            } else {
                // Phase 2: Turn letters black from left to right, one at a time
                if (this.letterAnimationIndex < letters.length) {
                    letters[this.letterAnimationIndex].classList.remove('green');
                    this.letterAnimationIndex++;
                } else {
                    // All letters are black, start over
                    this.letterAnimationDirection = 1;
                    this.letterAnimationIndex = 0;
                }
            }
        }, 400); // Slower animation (400ms instead of 200ms)
    }

    draw() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw player as a simple black dot
        if (this.gameState === 'dying') {
            // Pac-Man style wipe effect - start as complete circle, slowly disappear from top
            const elapsed = Date.now() - this.deathAnimationStart;
            const progress = elapsed / this.deathAnimationDuration;
            const remainingAngle = (1 - progress) * Math.PI * 2; // Remaining circle portion
            
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius, -Math.PI/2, -Math.PI/2 + remainingAngle);
            this.ctx.lineTo(this.player.x, this.player.y);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
        } else if (this.gameState === 'playing') {
            // Normal player drawing
            this.ctx.beginPath();
            this.ctx.arc(this.player.x, this.player.y, this.player.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#000000';
            this.ctx.fill();
        }
        
        // Draw viruses
        this.viruses.forEach(virus => {
            let alpha = 1;
            let scale = 1;
            
            // Apply disintegration effect (only if game is still playing)
            if (virus.disintegrating && this.gameState === 'playing') {
                const elapsed = Date.now() - virus.disintegrationStart;
                const progress = elapsed / virus.disintegrationDuration;
                
                // Simple fade with subtle shake effect
                const shake = Math.sin(progress * Math.PI * 8) * (1 - progress) * 0.3;
                alpha = (1 - progress) * (0.9 + shake);
            }
            
            // Save context for transformations
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            // Draw virus body
            this.ctx.beginPath();
            this.ctx.arc(virus.x, virus.y, virus.radius, 0, Math.PI * 2);
            this.ctx.fillStyle = '#4CAF50';
            this.ctx.fill();
            this.ctx.strokeStyle = '#388E3C';
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            
            // Draw virus spikes
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI * 2) / 8;
                const spikeX = virus.x + Math.cos(angle) * (virus.radius + 10);
                const spikeY = virus.y + Math.sin(angle) * (virus.radius + 10);
                
                this.ctx.beginPath();
                this.ctx.moveTo(virus.x + Math.cos(angle) * virus.radius, virus.y + Math.sin(angle) * virus.radius);
                this.ctx.lineTo(spikeX, spikeY);
                this.ctx.strokeStyle = '#4CAF50';
                this.ctx.lineWidth = 4;
                this.ctx.stroke();
            }
            
            // Restore context
            this.ctx.restore();
        });
        
        // Draw score
        if (this.gameState === 'playing') {
            this.ctx.fillStyle = '#333';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Time: ${Math.floor((Date.now() - this.gameStartTime) / 1000)}s`, 10, 30);
        }
    }

    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        // Spawn viruses based on current difficulty
        if (Math.random() < this.spawnRate) {
            this.spawnVirus();
        }
        
        this.updatePlayer();
        this.updateViruses();
        this.updateDifficulty();
        this.checkCollisions();
        this.draw();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    new VirusDodgeGame();
}); 