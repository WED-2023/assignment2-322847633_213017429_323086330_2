const scoreElements = document.querySelectorAll(".score-num");
const resultScreen = document.querySelector(".result");
const restartButton = document.querySelector(".start-game-btn");
const timeDisplay = document.querySelector(".time-num");
const livesContainer = document.querySelector(".lives-container");
const leaderboardButton = document.querySelector(".leaderBoardBtn");

const gameCanvas = document.querySelector(".canvas");

gameCanvas.width = innerWidth - 40; // padding Size : 40
gameCanvas.height = innerHeight - 40; // padding Size : 40

const ctx = gameCanvas.getContext("2d");
const PLAYER_SPEED = 5;

const SPEED_BOOST_INTERVAL = 5000;
//
const tableBody = document.getElementById("table_body")
//

// Improved sound effects with proper management
const audioEffects = {
    playerShoot: null,  // Will be initialized during startup
    playerHit: null,    // Will be initialized during startup
    enemyDestroyed: null // Will be initialized during startup
};

// Initialize audio files properly
function initSounds() {
    // Create new Audio objects for each sound
    audioEffects.playerShoot = new Audio('cannon_fire.ogg');
    audioEffects.playerHit = new Audio('blocker_hit.ogg');
    audioEffects.enemyDestroyed = new Audio('target_hit.ogg');
    
    // Ensure sounds can be played multiple times
    audioEffects.playerShoot.preload = 'auto';
    audioEffects.playerHit.preload = 'auto';
    audioEffects.enemyDestroyed.preload = 'auto';
    
    // Set appropriate volume levels
    audioEffects.playerShoot.volume = 0.4;
    audioEffects.playerHit.volume = 0.5;
    audioEffects.enemyDestroyed.volume = 0.5;
}

// Function to play sounds with proper stopping/restarting
function playSound(sound) {
    // Clone the sound to allow multiple overlapping instances
    const soundClone = sound.cloneNode();
    
    // Play the sound with error handling
    soundClone.play().catch(e => {
        console.log("Failed to play sound:", e);
    });
    
    // Auto cleanup - remove the element after it finishes playing
    soundClone.onended = function() {
        soundClone.remove(); // Clean up the DOM
    };
}

// Background music setup with better implementation
let gameMusic = null;
let isMusicEnabled = true;

// Add game pause functionality
let isGamePaused = false;

// Global variable to track speed increases
let speedIncreaseCount = 0;
const MAX_SPEED_INCREASES = 4;
const SPEED_INCREASE_INTERVAL = 5000; // 5 seconds

// Dedicated speed factors that will be multiplied with each increase
let enemySpeedFactor = 1.0;
let projectileSpeedFactor = 1.0;

class Player{
    constructor() {
        this.rotation = 0;
        this.opacity = 1;

        this.image = createImage("img/ship.png");
        // Width :  100px  , Height : 60px  
        this.width = 140;
        this.height = 84;

        this.startPosition = {
            x: gameCanvas.width / 2 - this.width / 2,
            y: gameCanvas.height - this.height - 30,
        }
        this.position = {
            x: gameCanvas.width / 2 - this.width / 2,
            y: gameCanvas.height - this.height - 30,
        }
        this.velocity = {
            x: 0,
            y: 0,
        }
    }

    draw() {
        ctx.beginPath();
        ctx.save();
        ctx.globalAlpha = this.opacity;
        ctx.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
        ctx.rotate(this.rotation);
        ctx.translate(-this.position.x - this.width / 2, -this.position.y - this.height / 2);
        
        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);

        // context.strokeStyle = 'green';
        // context.strokeRect(this.position.x, this.position.y, this.width, this.height);
        
        ctx.restore();
        ctx.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Projectile{
    constructor({position, velocity}) {
        this.position = position;
        this.velocity = velocity;
        this.width = 5;
        this.height = 15;
        this.color = "#00ffff"; // Cyan laser color
    }

    draw() {
        ctx.save();
        
        // Create gradient for laser effect
        const gradient = ctx.createLinearGradient(
            this.position.x, 
            this.position.y, 
            this.position.x, 
            this.position.y + this.height
        );
        gradient.addColorStop(0, "rgba(0, 255, 255, 0.1)");
        gradient.addColorStop(0.5, "rgba(0, 255, 255, 1)");
        gradient.addColorStop(1, "rgba(0, 255, 255, 0.1)");
        
        // Draw laser beam
        ctx.fillStyle = gradient;
        ctx.fillRect(this.position.x - this.width/2, this.position.y, this.width, this.height);
        
        // Add glow effect
        ctx.shadowColor = "#00ffff";
        ctx.shadowBlur = 10;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(this.position.x - this.width/2, this.position.y, this.width, this.height);
        
        ctx.restore();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Particle{
    constructor({position , velocity , radius , color , fades}) {
        this.position = position;
        this.velocity = velocity;

        this.radius = radius;
        this.color = color;
        this.opacity = 1;
        this.fades = fades;
    }

    draw() {
        ctx.save();
        ctx.beginPath();
        ctx.globalAlpha = this.opacity;
        ctx.fillStyle = this.color;
        ctx.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
        ctx.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        if(this.fades) this.opacity -= 0.01;
    }
}

// Improved class name from InvaderProjectile to EnemyProjectile
class EnemyProjectile{
    constructor({position, velocity}) {
        this.position = position;
        
        // Scale the velocity based on current speed level
        this.velocity = {
            x: velocity.x * (1 + 0.1 * speedIncreaseCount), // Increase x velocity
            y: velocity.y * (1 + 0.1 * speedIncreaseCount)  // Increase y velocity
        };
        
        this.width = 45; 
        this.height = 45;
        
        // Create a canvas for the custom projectile
        const projectileCanvas = document.createElement('canvas');
        projectileCanvas.width = this.width;
        projectileCanvas.height = this.height;
        const pCtx = projectileCanvas.getContext('2d');
        
        // Draw a cool plasma/energy ball
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = this.width / 2 - 5;
        
        // Create a radial gradient (cool energy effect)
        const gradient = pCtx.createRadialGradient(
            centerX, centerY, radius * 0.2,
            centerX, centerY, radius
        );
        
        // Plasma/energy ball colors - electric blue/purple
        gradient.addColorStop(0, '#ffffff');   // White center
        gradient.addColorStop(0.3, '#9c4dff'); // Purple
        gradient.addColorStop(0.6, '#4d79ff'); // Blue
        gradient.addColorStop(1, 'rgba(32, 0, 130, 0)'); // Transparent edge
        
        // Fill with gradient
        pCtx.fillStyle = gradient;
        pCtx.beginPath();
        pCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        pCtx.fill();
        
        // Add some energy spikes
        pCtx.strokeStyle = '#ffffff';
        pCtx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const innerX = centerX + Math.cos(angle) * (radius * 0.7);
            const innerY = centerY + Math.sin(angle) * (radius * 0.7);
            const outerX = centerX + Math.cos(angle) * (radius * 1.2);
            const outerY = centerY + Math.sin(angle) * (radius * 1.2);
            
            pCtx.beginPath();
            pCtx.moveTo(innerX, innerY);
            pCtx.lineTo(outerX, outerY);
            pCtx.stroke();
        }
        
        // Convert to image
        this.image = new Image();
        this.image.src = projectileCanvas.toDataURL();
        
        // Add rotation and pulse animation
        this.rotation = 0;
        this.rotationSpeed = (Math.random() - 0.5) * 0.2;
        this.scale = 1;
        this.scaleDirection = 0.02;
    }

    draw() {
        ctx.save();
        ctx.translate(this.position.x + this.width/2, this.position.y + this.height/2);
        ctx.rotate(this.rotation);
        ctx.scale(this.scale, this.scale);
        ctx.drawImage(this.image, -this.width/2, -this.height/2, this.width, this.height);
        ctx.restore();
    }

    update() {
        // Rotation animation
        this.rotation += this.rotationSpeed;
        
        // Pulsing size animation
        this.scale += this.scaleDirection;
        if (this.scale > 1.2 || this.scale < 0.8) {
            this.scaleDirection = -this.scaleDirection;
        }
        
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

// Renamed from Invader to Enemy
class Enemy{
    constructor(position,type) {
        this.speed = PLAYER_SPEED;
        this.image = createImage("img/bad1.png");
        // Width :  100px  , Height : 85px  
        this.width = 90;
        this.height = 60;
        this.type = type
        this.position = position;
    }

    draw() {
        ctx.beginPath();
        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        ctx.closePath();
    }

    update(velocity) {
        this.draw();
        this.position.x += velocity.x;
        this.position.y += velocity.y;
    }

    shoot() {
        // Create a new projectile with speed affected by current speedFactor
        const projectile = new EnemyProjectile({
            position: {
                x: this.position.x + this.width / 2 - 22,
                y: this.position.y + this.height
            },
            velocity: { 
                x: (Math.random() - 0.5) * 3 * projectileSpeedFactor,
                y: (Math.random() * 3 + 2) * projectileSpeedFactor
            }
        });
        
        // Add it to the projectiles array
        enemyProjectiles.push(projectile);
    }
}

class PowerUp{
    constructor({position, velocity}, type) {
        this.position = position;
        this.velocity = velocity;
        this.type = type;
        this.width = 84;
        this.height = 40;
        
        // Create a canvas for the emoji
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = this.width;
        emojiCanvas.height = this.height;
        const emojiCtx = emojiCanvas.getContext('2d');
        
        // Draw the battery emoji
        emojiCtx.font = '36px Arial';
        emojiCtx.textAlign = 'center';
        emojiCtx.textBaseline = 'middle';
        emojiCtx.fillText('🔋', this.width/2, this.height/2);
        
        // Convert to image
        this.image = new Image();
        this.image.src = emojiCanvas.toDataURL();
    }

    draw() {
        ctx.beginPath();
        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        ctx.closePath();
    }

    update() {
        this.draw();
        // Both x and y velocities for diagonal movement
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class EnemyGrid{
    constructor() {
        this.position = {
            x: 0,
            y: 0,
        }
        this.velocity = {
            x: 3, 
            y: 1.5, // Initial diagonal movement
        }
        this.enemies = [];
        const columns = 5;
        const rows = 4
        this.width = columns * 90;
        
        for (let x = 0; x < columns; x++){
            let i = 4
            for (let y = 0; y < rows; y++){
                this.enemies.push(new Enemy({ x: x * 90, y: y * 60},i));
                i--;
            }
        }
        
        // Set maximum allowed Y position (60% of screen height)
        this.maxY = gameCanvas.height * 0.6 - (rows * 60);
        
        // Track movement pattern for diagonal behavior
        this.diagonalPattern = 'rightdown'; // Initial pattern
    }

    update() {
        // Apply diagonal velocity
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        
        // Check boundaries and change direction
        
        // Right boundary
        if (this.position.x + this.width >= gameCanvas.width && this.velocity.x > 0) {
            this.velocity.x = -this.velocity.x;
            // Change diagonal pattern
            this.diagonalPattern = this.diagonalPattern === 'rightdown' ? 'leftdown' : 'leftup';
        }
        
        // Left boundary
        if (this.position.x <= 0 && this.velocity.x < 0) {
            this.velocity.x = -this.velocity.x;
            // Change diagonal pattern
            this.diagonalPattern = this.diagonalPattern === 'leftdown' ? 'rightdown' : 'rightup';
        }
        
        // Top boundary
        if (this.position.y <= 0 && this.velocity.y < 0) {
            this.velocity.y = -this.velocity.y;
            // Change diagonal pattern
            this.diagonalPattern = this.diagonalPattern === 'leftup' ? 'leftdown' : 'rightdown';
        }
        
        // Bottom boundary - 60% of screen
        if (this.position.y >= this.maxY && this.velocity.y > 0) {
            this.velocity.y = -this.velocity.y;
            // Change diagonal pattern
            this.diagonalPattern = this.diagonalPattern === 'leftdown' ? 'leftup' : 'rightup';
        }
        
        // Apply the correct diagonal pattern
        switch(this.diagonalPattern) {
            case 'rightdown':
                this.velocity.x = Math.abs(this.velocity.x);
                this.velocity.y = Math.abs(this.velocity.y);
                break;
            case 'leftdown':
                this.velocity.x = -Math.abs(this.velocity.x);
                this.velocity.y = Math.abs(this.velocity.y);
                break;
            case 'rightup':
                this.velocity.x = Math.abs(this.velocity.x);
                this.velocity.y = -Math.abs(this.velocity.y);
                break;
            case 'leftup':
                this.velocity.x = -Math.abs(this.velocity.x);
                this.velocity.y = -Math.abs(this.velocity.y);
                break;
        }
    }
}

class HealthDisplay{
    constructor({x , y}){
        this.position.x = x;
        this.position.y = y;

        this.Image = createImage("img/heart.png");
        this.width = 50;
        this.height = 50
    }
    draw(){
        ctx.beginPath();

        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        ctx.closePath();
    }

}
class Bonus{
    constructor({position, velocity}) {
        this.position = position;
        this.velocity = velocity;
        this.image = createImage("img/coin.png");
        this.width = 40;
        this.height = 40;
    }

    draw() {
        ctx.beginPath();
        ctx.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        ctx.closePath();
    }

    update() {
        this.draw();
        // Update both x and y positions
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}


const keyState = {
    left: {pressed : false},
    right: {pressed : false},
    up: {pressed : false},
    down: {pressed : false},
    shoot: {pressed : false}
}

const gameState = {
    over: false,
    active: true,
}

const player = new Player();

let projectiles = [];
let enemyGrids = [];
let currentGrid;
let enemyProjectiles = [];
let bonusItems = []
let particles = [];
let powerUps = [];
let frameCount;
let spawnInterval;
let playerScore;
let playerLives = 3;
let speedBoostCounter = 4;
let gameTimer;
let canEnemiesShoot = true;
let currentEnemyShot;
let bonusSpawnTimer;

let enemyGrid;

function updateLivesDisplay() {
    // Clear existing hearts
    livesContainer.innerHTML = '';
    
    // Add heart emojis based on current lives
    for (let i = 0; i < playerLives; i++) {
        const heartSpan = document.createElement('span');
        heartSpan.textContent = '❤️';
        heartSpan.style.fontSize = '28px';
        heartSpan.style.marginRight = '5px';
        livesContainer.appendChild(heartSpan);
    }
}

function startGame() {
    // Reset speed increase counter and factors
    speedIncreaseCount = 0;
    enemySpeedFactor = 1.0;
    projectileSpeedFactor = 1.0;
    
    // Initialize sounds first
    initSounds();
    
    // Initialize game entities and state
    enemyGrid = new EnemyGrid();
    canEnemiesShoot = true;
    timeLeft = timeLeft1;
    playerLives = 3;
    updateLivesDisplay();
    
    // Setup background music
    setupBackgroundMusic();
    
    // Start background music if enabled
    if (isMusicEnabled && gameMusic) {
        gameMusic.currentTime = 0;
        gameMusic.play().catch(e => {
            console.log("Music play failed. Trying alternative approach:", e);
            // Alternative approach - create user interaction first
            document.addEventListener('click', function musicStarter() {
                gameMusic.play().catch(e => console.log("Music still failed:", e));
                document.removeEventListener('click', musicStarter);
            }, { once: true });
        });
    }
    
    // Create starry background
    createStarBackground();
    
    bonusSpawnTimer = setInterval(() => {
        spawnBonus();
    }, 5000);
    
    // Schedule the first speed increase after 5 seconds
    setTimeout(increaseEnemySpeed, SPEED_INCREASE_INTERVAL);
    
    player.opacity = 1;
    player.position = {
        x: gameCanvas.width / 2 - player.width / 2,
        y: gameCanvas.height - player.height - 30
    };

    gameState.over = false;
    gameState.active = true;

    projectiles = [];
    enemyGrids = [];
    enemyProjectiles = [];
    particles = [];
    powerUps = [];

    // Initialize background stars
    for (let i = 0; i < 100; i++) {
        particles.push(new Particle({
            position: {
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
            },
            velocity: {
                x: 0,
                y: 0.3,
            },
            radius: Math.random() * 3,
            color: "white",
            fades: false
        }));
    }

    playerScore = 0;
    frameCount = 0;
    spawnInterval = Math.floor(Math.random() * 500) + 2000;
    scoreElements[0].innerHTML = playerScore;

    timeDisplay.innerHTML = timeLeft;
    gameTimer = setInterval(() => {
        timeLeft--;
        console.log(timeLeft);
        timeDisplay.innerHTML = timeLeft;
        if (timeLeft === 0) {
            endGame();
        }
    }, 1000);

    animateGame();
}

function createImage(path) {
    let img = new Image();
    img.src = path;
    return img
}

function createParticles(object , color , fades) {
    for (let i = 0; i < 15; i++){
        particles.push(new Particle({
            position: {
                x: object.position.x + object.width / 2,
                y: object.position.y + object.height / 2,
            },
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
            },
            radius: Math.random() * 3,
            color: color || "#BAA0DE",
            fades: fades
        }));
    }
}

function endGame(arr, index) {
    console.log("Game Over");
    const statusTitle = document.getElementById("status");
    createExplosion(player, "white", true);
    
    // Pause background music when game ends
    if (gameMusic) {
        gameMusic.pause();
    }
    
    // If arr and index are defined, splice the array
    if (arr && index !== undefined) {
        setTimeout(() => {
            arr.splice(index, 1);
        }, 0);
    }
    
    // Set player opacity to 0 and game over to true
    setTimeout(() => {
        player.opacity = 0;
        gameState.over = true;
    }, 0);
    
    // Display game over screen with animation
    setTimeout(() => {
        gameState.active = false;
        scoreElements[1].innerHTML = playerScore;
        
        // Set proper display style for flexbox centering
        const resultEl = document.querySelector(".result");
        resultEl.style.display = "flex";
        
        // Make sure leaderboard button is visible and clickable
        const leaderboardBtn = document.querySelector(".leaderBoardBtn");
        if (leaderboardBtn) {
            leaderboardBtn.style.display = "inline-block";
            leaderboardBtn.disabled = false;
        }
        
        // Set status message based on performance
        if (playerLives === 0) {
            statusTitle.innerHTML = "You Lost";
            statusTitle.classList.add('lost-message');
            // Do not add score to leaderboard when player loses
        }
        else if (playerScore >= 250) {
            statusTitle.innerHTML = "Champion!";
            statusTitle.classList.remove('lost-message');
            scores.push(playerScore);
        }
        else if (playerScore > 100) {
            statusTitle.innerHTML = "Winner!";
            statusTitle.classList.remove('lost-message');
            scores.push(playerScore);
        }
        else {
            statusTitle.innerHTML = "You can do better";
            statusTitle.classList.remove('lost-message');
            scores.push(playerScore);
        }
    }, 1500);
    
    clearInterval(gameTimer);
    clearInterval(bonusSpawnTimer);
}

function animateGame() {
    if (!gameState.active) return;
    requestAnimationFrame(animateGame);
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, gameCanvas.width, gameCanvas.height);

    player.update();
    
    powerUps.forEach((powerUp, index) => {
        if (powerUp.position.y + powerUp.height >= gameCanvas.height) {
            // Remove power-ups that reach the bottom
            setTimeout(() => {
                powerUps.splice(index, 1);
            }, 0);
        } else if (powerUp.position.y <= player.position.y + player.height
            && powerUp.position.y + powerUp.height >= player.position.y
            && powerUp.position.x + powerUp.width >= player.position.x
            && powerUp.position.x <= player.position.x + player.width) {
            
            setTimeout(() => {
                powerUps.splice(index, 1);
            }, 0);
            // Score 
            playerScore += powerUp.type * 5;
            scoreElements[0].innerHTML = playerScore;
        } else {
            // Only check for canvas width bounce if still active
            if (powerUp.position.x + powerUp.width >= gameCanvas.width || powerUp.position.x <= 0) {
                powerUp.velocity.x = -powerUp.velocity.x;
            }
            powerUp.update();
        }
    });

    particles.forEach((particle, index) => {
        if (particle.position.y - particle.radius >= gameCanvas.height) {
            particle.position.x = Math.random() * gameCanvas.width;
            particle.position.y = -particle.radius;
        }

        if (particle.opacity <= 0) {
            setTimeout(() => {
                particles.splice(index, 1);
            }, 0);
        } else {
            particle.update();
        }
    });
    bonusItems.forEach((bonus1, index) => {
        if (bonus1.position.y + bonus1.height >= gameCanvas.height) {
            // Remove bonuses that reach the bottom
            setTimeout(() => {
                bonusItems.splice(index, 1);
            }, 0);
        } else if (bonus1.position.y >= player.position.y
            && bonus1.position.y <= player.position.y + player.height
            && bonus1.position.x >= player.position.x
            && bonus1.position.x <= player.position.x + player.width) {
            
            setTimeout(() => {
                bonusItems.splice(index, 1);
            }, 0);
            // Score 
            playerScore += 10;
            scoreElements[0].innerHTML = playerScore;
        } else {
            bonus1.update();
        }
    })
    enemyProjectiles.forEach((projectile, index) => {
        if (projectile.position.y + projectile.height >= gameCanvas.height ||
            projectile.position.x + projectile.width < 0 ||
            projectile.position.x > gameCanvas.width) {
            // Create a small particle effect when projectile hits bottom
            if (projectile.position.y + projectile.height >= gameCanvas.height) {
                createExplosion({
                    position: {
                        x: projectile.position.x + projectile.width / 2,
                        y: gameCanvas.height - 5
                    },
                    width: 1,
                    height: 1
                }, 'rgba(130, 87, 237, 0.7)', true);
            }
            
            setTimeout(() => {
                enemyProjectiles.splice(index, 1);
            }, 0);
        } else {
            projectile.update();
        }
        
        // Player collision check
        if (projectile.position.y >= player.position.y
            && projectile.position.y <= player.position.y + player.height
            && projectile.position.x >= player.position.x
            && projectile.position.x <= player.position.x + player.width) {
            playerLives--;
            updateLivesDisplay();
            
            // Play hit sound using the new method
            playSound(audioEffects.playerHit);
            
            // Add explosion effect
            createExplosion(player, "orange", true);
            
            // Remove the projectile
            setTimeout(() => {
                enemyProjectiles.splice(index, 1);
            }, 0);
            
            if (playerLives === 0) {
                endGame(enemyProjectiles, index);
            } else {
                // Flash player instead of repositioning
                player.opacity = 0.5;
                setTimeout(() => {
                    player.opacity = 1;
                }, 300);
            }
        }
    });


    enemyGrid.update();
        //
    currentGrid = enemyGrid;

    // Fix the projectile shooting logic - this is what was broken
    if (frameCount % 60 === 0 && enemyGrid.enemies.length > 0 && canEnemiesShoot) {
        const randomIndex = Math.floor(Math.random() * enemyGrid.enemies.length);
        enemyGrid.enemies[randomIndex].shoot();
        canEnemiesShoot = false;
        
        // Set a timeout to allow shooting again after a delay
        setTimeout(() => {
            canEnemiesShoot = true;
        }, 1000); // Allow shooting again after 1 second
    }

    enemyGrid.enemies.forEach((enemy, enemyIdx) => {
        // Invader Touch Player
        // make lives - 1
        if (enemy.position.y <= player.position.y + player.height
            && enemy.position.y + enemy.height >= player.position.y
            && enemy.position.x + enemy.width >= player.position.x
            && enemy.position.x <= player.position.x + player.width) {
            const enemyFound = enemyGrid.enemies.find(
                (enemy2) => enemy2 === enemy);
            if (enemyFound) {
                endGame(enemyGrid.enemies, enemyIdx);
            }
        }

        if (enemy.position.y >= gameCanvas.height) {
            setTimeout(() => {
                enemyGrid.enemies.splice(enemyIdx, 1);
            }, 0);
        } else {
            enemy.update(enemyGrid.velocity);
            projectiles.forEach((projectile, projectileIdx) => {
                // New collision detection for rectangular projectiles
                const projectileRight = projectile.position.x + projectile.width/2;
                const projectileLeft = projectile.position.x - projectile.width/2;
                const projectileTop = projectile.position.y;
                const projectileBottom = projectile.position.y + projectile.height;
                
                const enemyRight = enemy.position.x + enemy.width;
                const enemyLeft = enemy.position.x;
                const enemyTop = enemy.position.y;
                const enemyBottom = enemy.position.y + enemy.height;
                
                // Check for rectangular collision (AABB)
                if (projectileRight >= enemyLeft && 
                    projectileLeft <= enemyRight && 
                    projectileBottom >= enemyTop && 
                    projectileTop <= enemyBottom) {
                    
                    const enemyFound = enemyGrid.enemies.find(
                        (enemy2) => enemy2 === enemy);
                    const projectileFound = projectiles.find(
                        (projectile2) => projectile2 === projectile);
                    
                    // Remove enemy and projectile
                    if (enemyFound && projectileFound) {
                        // Play enemy destroyed sound with the new method
                        playSound(audioEffects.enemyDestroyed);

                        createExplosion(enemy, "#BAA0DE", true);
                        
                        powerUps.push(new PowerUp({
                            position: {
                                x: enemy.position.x + enemy.width / 2,
                                y: enemy.position.y + enemy.height
                            },
                            velocity: { x: Math.random(), y: Math.random() * 2 + 2 },
                        }, enemy.type));

                        enemyGrid.enemies.splice(enemyIdx, 1);
                        projectiles.splice(projectileIdx, 1);
                        if (enemyGrid.enemies.length > 0) {
                            const firstEnemy = enemyGrid.enemies[0];
                            const lastEnemy = enemyGrid.enemies[enemyGrid.enemies.length - 1];
                            enemyGrid.width = lastEnemy.position.x -
                                firstEnemy.position.x + lastEnemy.width;
                            enemyGrid.position.x = firstEnemy.position.x;
                        } 
                        else {
                            endGame();
                        }
                    }
                }
            });
        }
    });
    

    projectiles.forEach((projectile, index) => {
        // Update boundary checks for rectangular projectiles
        if (projectile.position.y + projectile.height < 0 || 
            projectile.position.x + projectile.width/2 < 0 || 
            projectile.position.x - projectile.width/2 > gameCanvas.width) {
            setTimeout(() => {
                projectiles.splice(index, 1);
            }, 0);
        } else {
            projectile.update();
        }
    });

    if (keyState.left.pressed && player.position.x > 0) {
        player.velocity.x = -PLAYER_SPEED;
        player.rotation = -0.2;
    } else if (keyState.right.pressed && player.position.x + player.width < gameCanvas.width) {
        player.velocity.x = PLAYER_SPEED;
        player.rotation = 0.2;
    } else{
        player.velocity.x = 0;
        player.rotation = 0
    }
// change if to move just in 40% if window height
    if (keyState.up.pressed && player.position.y > 20 && player.position.y > 0.6 * gameCanvas.height) {
        player.velocity.y = -PLAYER_SPEED;
    } else if (keyState.down.pressed && player.position.y < gameCanvas.height - player.height - 30) {
        player.velocity.y = PLAYER_SPEED;
    } else {
        player.velocity.y = 0;
    }

    frameCount++;
}

restartButton.addEventListener("click", () => {
    resultScreen.style.display = "none";
    startGame();
});
leaderboardButton.addEventListener("click", () => {
    createLeaderboard();
});
addEventListener("keydown", (event) => {
    if (gameState.over) return;
    
    switch (event.key) {
        case "a":
        case "ArrowLeft":
            keyState.left.pressed = true;
            break;
        case "d":
        case "ArrowRight":
            keyState.right.pressed = true;
            break;
        case "w":
        case "ArrowUp":
            keyState.up.pressed = true;
            break;
        case "s":
        case "ArrowDown":
            keyState.down.pressed = true;
            break;
        case shoot_key:
            // Only shoot if not already pressed (prevents sound spam)
            if (!keyState.shoot.pressed) {
                keyState.shoot.pressed = true;
                
                // Play shooting sound using the new method
                playSound(audioEffects.playerShoot);
                
                // Determine the shooting direction based on current movement
                let xVelocity = 0;
                if (keyState.left.pressed) xVelocity = -PLAYER_SPEED; 
                else if (keyState.right.pressed) xVelocity = PLAYER_SPEED;
                
                projectiles.push(new Projectile({
                    position: { x: player.position.x + player.width / 2, y: player.position.y },
                    velocity: { x: xVelocity, y: -2 * PLAYER_SPEED }
                }));
            }
            break;
    }
});

addEventListener("keyup", (event) => {
    switch (event.key) {
        case "a":
        case "ArrowLeft":
            keyState.left.pressed = false;
            break;
        case "d":
        case "ArrowRight":
            keyState.right.pressed = false;
            break;
        case "w":
        case "ArrowUp":
            keyState.up.pressed = false;
            break;
        case "s":
        case "ArrowDown":
            keyState.down.pressed = false;
            break;
        case shoot_key:
            keyState.shoot.pressed = false;
            break;
    }
})

function spawnBonus() {
    bonusItems.push(new Bonus({
        position: {x: Math.random() * gameCanvas.width, y: 0},
        velocity: { 
            x: (Math.random() - 0.5) * 5,
            y: Math.random() * 2 + 1
        }
    }));
}

function increaseEnemySpeed() {
    console.log("increaseEnemySpeed called. Current count:", speedIncreaseCount);
    
    // Check if we've already reached the maximum number of speed increases
    if (speedIncreaseCount >= MAX_SPEED_INCREASES) {
        console.log("Maximum speed increase reached");
        return; // Exit if we've already had 4 speed increases
    }
    
    // Increase factors - use more dramatic increases for visibility
    enemySpeedFactor += 0.5; // 50% faster each time
    projectileSpeedFactor += 0.5; // 50% faster each time
    
    // Apply to current grid's velocity immediately
    const originalVelocityX = currentGrid.velocity.x;
    const originalVelocityY = currentGrid.velocity.y;
    
    currentGrid.velocity.x = (originalVelocityX / Math.abs(originalVelocityX)) * 
                             Math.abs(originalVelocityX) * 1.5; // 50% faster
    
    if (currentGrid.velocity.y !== 0) {
        currentGrid.velocity.y = (originalVelocityY / Math.abs(originalVelocityY)) * 
                                Math.abs(originalVelocityY) * 1.5; // 50% faster
    }
    
    // Show visual feedback about speed increase
    showSpeedIncreaseMessage();
    
    // Increment the speed increase counter
    speedIncreaseCount++;
    
    // Log the speed increase with detailed information
    console.log(`Speed Increase #${speedIncreaseCount}/${MAX_SPEED_INCREASES}`);
    console.log(`New enemy speed factor: ${enemySpeedFactor}`);
    console.log(`New projectile speed factor: ${projectileSpeedFactor}`);
    console.log(`Grid velocity: x=${currentGrid.velocity.x}, y=${currentGrid.velocity.y}`);
    
    // Schedule the next speed increase if we haven't reached the maximum
    if (speedIncreaseCount < MAX_SPEED_INCREASES) {
        console.log(`Scheduling next speed increase in ${SPEED_INCREASE_INTERVAL/1000} seconds`);
        setTimeout(increaseEnemySpeed, SPEED_INCREASE_INTERVAL);
    }
}

function showSpeedIncreaseMessage() {
    // Create a message element
    const messageEl = document.createElement('div');
    messageEl.textContent = `Speed Increase! (${speedIncreaseCount + 1}/${MAX_SPEED_INCREASES})`;
    messageEl.style.position = 'absolute';
    messageEl.style.top = '50%';
    messageEl.style.left = '50%';
    messageEl.style.transform = 'translate(-50%, -50%)';
    messageEl.style.color = '#ff0000';
    messageEl.style.fontSize = '48px';
    messageEl.style.fontWeight = 'bold';
    messageEl.style.textShadow = '0 0 10px #ff0000';
    messageEl.style.zIndex = '2000';
    messageEl.style.pointerEvents = 'none'; // Don't block clicks
    
    // Add to game container
    document.querySelector('.Game_Screen').appendChild(messageEl);
    
    // Remove after 1.5 seconds
    setTimeout(() => {
        messageEl.remove();
    }, 1500);
}

function createTable(){
    showLeaderboard();
    let data = scores.sort((a, b) => a - b);
    tableBody.innerHTML = "";
    for (let i = 0; i < data.length; i++){
        addToTable(scores[i]);
    }
}

function addToTable(playerScore){
    let row = document.createElement('tr')
    let cellP = document.createElement('td')
    let cellS = document.createElement('td')
    cellP.textContent = currentPlayer
    row.appendChild(cellP);
    cellS.textContent = playerScore;
    row.appendChild(cellS); 
    tableBody.appendChild(row);
}

// Function to create a starry background
function createStarBackground() {
    // Clear old stars
    particles = [];
    
    // Create stars with different sizes and brightness
    for (let i = 0; i < 150; i++) {
        const size = Math.random() * 3;
        const brightness = Math.floor(Math.random() * 100) + 155; // 155-255 for medium to bright stars
        const color = `rgb(${brightness},${brightness},${brightness})`;
        
        particles.push(new Particle({
            position: {
                x: Math.random() * gameCanvas.width,
                y: Math.random() * gameCanvas.height,
            },
            velocity: {
                x: 0,
                y: (Math.random() * 0.2) + 0.1, // Slower falling stars
            },
            radius: size,
            color: color,
            fades: false
        }));
    }
}

// Function to create and manage background music
function setupBackgroundMusic() {
    if (!gameMusic) {
        // Use the new epic game music file
        gameMusic = new Audio('epic-game-music-by-kris-klavenes-3-mins-49771.mp3');
        gameMusic.loop = true;
        gameMusic.volume = 0.2; // Lower volume for background music
        
        // Handle looping properly in all browsers
        gameMusic.addEventListener('ended', function() {
            this.currentTime = 0;
            this.play().catch(e => console.log("Music restart failed:", e));
        }, false);
    }
}

// Function to toggle music on/off
function toggleMusic() {
    if (isMusicEnabled && gameMusic) {
        gameMusic.pause();
        isMusicEnabled = false;
    } else {
        isMusicEnabled = true;
        if (gameMusic && gameState.active) {
            gameMusic.play().catch(e => console.log("Music play failed:", e));
        }
    }
    
    // Update music control UI
    updateMusicControls();
}

// Create music control UI
function createMusicControls() {
    const musicControlDiv = document.createElement('div');
    musicControlDiv.className = 'music-control';
    musicControlDiv.innerHTML = '<button id="musicToggle">🔊 Music On</button>';
    document.body.appendChild(musicControlDiv);
    
    // Add event listener to the music toggle button
    document.getElementById('musicToggle').addEventListener('click', toggleMusic);
    
    // Initial state
    updateMusicControls();
}

// Update music control button text based on state
function updateMusicControls() {
    const musicToggleBtn = document.getElementById('musicToggle');
    if (musicToggleBtn) {
        musicToggleBtn.textContent = isMusicEnabled ? '🔊 Music On' : '🔇 Music Off';
    }
}

// Initialize music controls when the page loads
document.addEventListener('DOMContentLoaded', function() {
    createMusicControls();
    
    // Set up leaderboard button click handler
    const leaderboardBtn = document.querySelector(".leaderBoardBtn");
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener("click", function() {
            console.log("Leaderboard button clicked");
            createLeaderboard();
        });
    }
    
    // Set up pause button handlers
    setupPauseHandlers();
});

function showLeaderboard() {
    // Hide game screen (but keep it in the DOM)
    document.querySelector(".Game_Screen").style.display = "none";
    
    // Show leaderboard container with flex display
    const leaderboardEl = document.querySelector(".leaderboard-container");
    leaderboardEl.style.display = "flex";
}

function createExplosion(object, color, fades) {
    for (let i = 0; i < 15; i++) {
        particles.push(new Particle({
            position: {
                x: object.position.x + object.width / 2,
                y: object.position.y + object.height / 2,
            },
            velocity: {
                x: (Math.random() - 0.5) * 2,
                y: (Math.random() - 0.5) * 2,
            },
            radius: Math.random() * 3,
            color: color || "#BAA0DE",
            fades: fades
        }));
    }
}

// Fix the createLeaderboard function
function createLeaderboard() {
    // First make the leaderboard visible
    showLeaderboard();
    
    // Clear the existing leaderboard table
    const tableBody = document.getElementById("table_body");
    tableBody.innerHTML = "";
    
    // Sort scores in descending order (highest first)
    const sortedScores = [...scores].sort((a, b) => b - a);
    
    // Add each score to the leaderboard
    for (let i = 0; i < sortedScores.length; i++) {
        addToLeaderboard(sortedScores[i]);
    }
}

// Fix the addToLeaderboard function
function addToLeaderboard(playerScore) {
    const tableBody = document.getElementById("table_body");
    const row = document.createElement('tr');
    const playerCell = document.createElement('td');
    const scoreCell = document.createElement('td');
    
    playerCell.textContent = currentPlayer || "Player"; // Fallback if no player name
    scoreCell.textContent = playerScore;
    
    row.appendChild(playerCell);
    row.appendChild(scoreCell); 
    tableBody.appendChild(row);
}

// Function to set up pause button and menu
function setupPauseHandlers() {
    const pauseButton = document.getElementById('pauseButton');
    const continueButton = document.getElementById('continueButton');
    const restartButton = document.getElementById('restartButton');
    const homeButton = document.getElementById('homeButton');
    const pauseMenu = document.querySelector('.pause-menu');
    
    // Pause button click handler
    pauseButton.addEventListener('click', function() {
        pauseGame();
    });
    
    // Continue button click handler
    continueButton.addEventListener('click', function() {
        resumeGame();
    });
    
    // Restart button click handler
    restartButton.addEventListener('click', function() {
        resumeGame(); // First resume the game
        startGame();  // Then restart
    });
    
    // Home button click handler
    homeButton.addEventListener('click', function() {
        returnToHomepage();
    });
    
    // Also pause when ESC key is pressed
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape' && gameState.active) {
            if (isGamePaused) {
                resumeGame();
            } else {
                pauseGame();
            }
        }
    });
}

// Function to pause the game
function pauseGame() {
    if (!gameState.active || gameState.over) return; // Don't pause if game is over or inactive
    
    isGamePaused = true;
    gameState.active = false; // Stop the game loop
    
    // Pause music and game timer
    if (gameMusic) {
        gameMusic.pause();
    }
    clearInterval(gameTimer);
    
    // Show pause menu
    const pauseMenu = document.querySelector('.pause-menu');
    pauseMenu.style.display = 'flex';
}

// Function to resume the game
function resumeGame() {
    if (!isGamePaused) return;
    
    isGamePaused = false;
    gameState.active = true;
    
    // Resume music if it was enabled
    if (isMusicEnabled && gameMusic) {
        gameMusic.play().catch(e => console.log("Music resume failed:", e));
    }
    
    // Hide pause menu
    const pauseMenu = document.querySelector('.pause-menu');
    pauseMenu.style.display = 'none';
    
    // Restart game timer
    gameTimer = setInterval(() => {
        timeLeft--;
        timeDisplay.innerHTML = timeLeft;
        if (timeLeft === 0) {
            endGame();
        }
    }, 1000);
    
    // Resume animation
    animateGame();
}

// Function to return to the homepage
function returnToHomepage() {
    // Stop all game processes
    clearAllGameIntervals();
    
    // Stop music
    if (gameMusic) {
        gameMusic.pause();
    }
    
    // Hide game screen and pause menu
    document.querySelector('.Game_Screen').style.display = 'none';
    document.querySelector('.pause-menu').style.display = 'none';
    
    // Show the welcome section
    document.getElementById('welcomeSection').style.display = 'block';
    
    // Show the menu
    document.querySelector('.menu').style.display = 'block';
    
    // Reset game state
    gameState.over = true;
    gameState.active = false;
    isGamePaused = false;
    
    // Restore background image
    document.getElementById('body').style.backgroundImage = '';
}

// Function to clean up all intervals and timers
function clearAllGameIntervals() {
    // Clear known interval timers
    clearInterval(gameTimer);
    clearInterval(bonusSpawnTimer);
    
    // Just in case there are other timers, clear them all
    const highestTimeoutId = setTimeout(";");
    for (let i = 0; i < highestTimeoutId; i++) {
        clearTimeout(i);
    }
}