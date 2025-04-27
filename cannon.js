const scoreElements = document.querySelectorAll(".score-num");
const resultScreen = document.querySelector(".result");
const restartButton = document.querySelector(".start-game-btn");
const timeDisplay = document.querySelector(".time-num");
const livesContainer = document.querySelector(".lives-container");
const leaderboardButton = document.querySelector(".leaderBoardBtn");

const gameCanvas = document.querySelector(".canvas");

gameCanvas.width = innerWidth - 40; 
gameCanvas.height = innerHeight - 40;

const ctx = gameCanvas.getContext("2d");
const PLAYER_SPEED = 5;

const SPEED_BOOST_INTERVAL = 5000;
const tableBody = document.getElementById("table_body")

const audioEffects = {
    playerShoot: null, 
    playerHit: null,    
    enemyDestroyed: null 
};

function initSounds() {
    audioEffects.playerShoot = new Audio('cannon_fire.ogg');
    audioEffects.playerHit = new Audio('blocker_hit.ogg');
    audioEffects.enemyDestroyed = new Audio('target_hit.ogg');
    audioEffects.playerShoot.preload = 'auto';
    audioEffects.playerHit.preload = 'auto';
    audioEffects.enemyDestroyed.preload = 'auto';
    audioEffects.playerShoot.volume = 0.4;
    audioEffects.playerHit.volume = 0.5;
    audioEffects.enemyDestroyed.volume = 0.5;
}

function playSound(sound) {
    const soundClone = sound.cloneNode();
    soundClone.play().catch(e => {
        console.log("Failed to play sound:", e);
    });
    soundClone.onended = function() {
        soundClone.remove();
    };
}

let gameMusic = null;
let isMusicEnabled = true;
let isGamePaused = false;
let speedIncreaseCount = 0;
const MAX_SPEED_INCREASES = 4;
const SPEED_INCREASE_INTERVAL = 5000;
let enemySpeedFactor = 1.0;
let projectileSpeedFactor = 1.0;

class Player{
    constructor() {
        this.rotation = 0;
        this.opacity = 1;
        this.image = createImage("img/ship.png");
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
        this.color = "#00ffff";
    }

    draw() {
        ctx.save();
        const gradient = ctx.createLinearGradient(
            this.position.x, 
            this.position.y, 
            this.position.x, 
            this.position.y + this.height
        );
        gradient.addColorStop(0, "rgba(0, 255, 255, 0.1)");
        gradient.addColorStop(0.5, "rgba(0, 255, 255, 1)");
        gradient.addColorStop(1, "rgba(0, 255, 255, 0.1)");
        ctx.fillStyle = gradient;
        ctx.fillRect(this.position.x - this.width/2, this.position.y, this.width, this.height);
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

class EnemyProjectile{
    constructor({position, velocity}) {
        this.position = position;
        this.velocity = {
            x: velocity.x * (1 + 0.1 * speedIncreaseCount),
            y: velocity.y * (1 + 0.1 * speedIncreaseCount)
        };
        this.width = 45; 
        this.height = 45;
        const projectileCanvas = document.createElement('canvas');
        projectileCanvas.width = this.width;
        projectileCanvas.height = this.height;
        const pCtx = projectileCanvas.getContext('2d');
        const centerX = this.width / 2;
        const centerY = this.height / 2;
        const radius = this.width / 2 - 5;
        const gradient = pCtx.createRadialGradient(
            centerX, centerY, radius * 0.2,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.3, '#9c4dff');
        gradient.addColorStop(0.6, '#4d79ff');
        gradient.addColorStop(1, 'rgba(32, 0, 130, 0)');
        pCtx.fillStyle = gradient;
        pCtx.beginPath();
        pCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        pCtx.fill();
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
        this.image = new Image();
        this.image.src = projectileCanvas.toDataURL();
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
        this.rotation += this.rotationSpeed;
        this.scale += this.scaleDirection;
        if (this.scale > 1.2 || this.scale < 0.8) {
            this.scaleDirection = -this.scaleDirection;
        }
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Enemy{
    constructor(position,type) {
        this.speed = PLAYER_SPEED;
        this.image = createImage("img/bad1.png");
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
        const emojiCanvas = document.createElement('canvas');
        emojiCanvas.width = this.width;
        emojiCanvas.height = this.height;
        const emojiCtx = emojiCanvas.getContext('2d');
        emojiCtx.font = '36px Arial';
        emojiCtx.textAlign = 'center';
        emojiCtx.textBaseline = 'middle';
        emojiCtx.fillText('🔋', this.width/2, this.height/2);
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
            y: 1.5,
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
        this.maxY = gameCanvas.height * 0.6 - (rows * 60);
        this.diagonalPattern = 'rightdown';
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        if (this.position.x + this.width >= gameCanvas.width && this.velocity.x > 0) {
            this.velocity.x = -this.velocity.x;
            this.diagonalPattern = this.diagonalPattern === 'rightdown' ? 'leftdown' : 'leftup';
        }
        if (this.position.x <= 0 && this.velocity.x < 0) {
            this.velocity.x = -this.velocity.x;
            this.diagonalPattern = this.diagonalPattern === 'leftdown' ? 'rightdown' : 'rightup';
        }
        if (this.position.y <= 0 && this.velocity.y < 0) {
            this.velocity.y = -this.velocity.y;
            this.diagonalPattern = this.diagonalPattern === 'leftup' ? 'leftdown' : 'rightdown';
        }
        if (this.position.y >= this.maxY && this.velocity.y > 0) {
            this.velocity.y = -this.velocity.y;
            this.diagonalPattern = this.diagonalPattern === 'leftdown' ? 'leftup' : 'rightup';
        }
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
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

