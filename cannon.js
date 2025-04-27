const scoreEl = document.querySelectorAll(".score-num");
const result = document.querySelector(".result");
const startGameBtn = document.querySelector(".start-game-btn");
const timeE1 = document.querySelector(".time-num")
const leaderBoardBtn = document.querySelector(".leaderBoardBtn");

const canvas = document.querySelector(".canvas");

canvas.width = innerWidth - 40; // padding Size : 40
canvas.height = innerHeight - 40; // padding Size : 40

const context = canvas.getContext("2d");
const speed = 5;

const speedupTime = 5;
//
const table = document.getElementById("table_body")
//
class Player{
    constructor() {
        this.rotation = 0;
        this.opacity = 1;

        this.image = createImage("img/Small_Plane.png");
        // Width :  100px  , Height : 60px  
        this.width = 100;
        this.height = 60;

        this.startPosition = {
            x: canvas.width / 2 - this.width / 2,
            y: canvas.height - this.height - 30,
        }
        this.position = {
            x: canvas.width / 2 - this.width / 2,
            y: canvas.height - this.height - 30,
        }
        this.velocity = {
            x: 0,
            y: 0,
        }
    }

    draw() {
        context.beginPath();
        context.save();
        context.globalAlpha = this.opacity;
        context.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
        context.rotate(this.rotation);
        context.translate(-this.position.x - this.width / 2, -this.position.y - this.height / 2);
        
        context.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);

        // context.strokeStyle = 'green';
        // context.strokeRect(this.position.x, this.position.y, this.width, this.height);
        
        context.restore();
        context.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Projectile{
    constructor({position , velocity}) {
        this.position = position;
        this.velocity = velocity;

        this.radius = 5;
    }

    draw() {
        context.beginPath();
        context.fillStyle = "red";
        context.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        context.fill();
        context.closePath();
    }

    update() {
        this.draw();
        // this.position.x += this.velocity.x;
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
        context.save();
        context.beginPath();
        context.globalAlpa = this.opacity;
        context.fillStyle = this.color;
        context.arc(this.position.x, this.position.y, this.radius, 0, 2 * Math.PI);
        context.fill();
        context.restore();
        context.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
        if(this.fades) this.opacity -= 0.01;
    }
}

// need To Convert To Egg Image
class InvaderProjectile{
    constructor({position , velocity}) {
        this.position = position;
        this.velocity = velocity;
        this.image = createImage("img/egg.png");
        // Width :  30      Height :    31
        this.width = 30;
        this.height = 31;
    }

    draw() {
        context.beginPath();
        // context.fillStyle = "white";
        // context.fillRect(this.position.x, this.position.y, this.width, this.height);
        context.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        context.closePath();
    }

    update() {
        this.draw();
        // this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

// need To Convert To Chicken Image
class Invader{
    constructor(position,type) {
        this.speed = speed;
        this.image = createImage("img/chicken.png");
        // Width :  100px  , Height : 85px  
        this.width = 75;
        this.height = 50;
        this.type = type
        this.position = position;
    }

    draw() {
        context.beginPath();
        context.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        context.closePath();
    }

    update(velocity) {
        this.draw();
        this.position.x += velocity.x;
        this.position.y += velocity.y;
    }

    shoot() {
        invadershot = new InvaderProjectile({
            position: {
                x: this.position.x + this.width / 2,
                y: this.position.y + this.height
            },
            velocity: { x: 0, y: Math.random() * 2 + 1 }
        })
        invaderProjectiles.push(invadershot);
    }
}

class Prize{
    constructor({position , velocity},type) {
        this.position = position;
        this.velocity = velocity;
        this.image = createImage("img/chicken_food.png");
        // Width :  70      Height :    33
        this.width = 70;
        this.height = 33;
        this.type = type;
    }

    draw() {
        context.beginPath();
        // context.fillStyle = "white";
        // context.fillRect(this.position.x, this.position.y, this.width, this.height);
        context.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        context.closePath();
    }

    update() {
        this.draw();
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}

class Grid{
    constructor() {
        this.position = {
            x: 0,
            y: 0,
        }
        this.velocity = {
            x: 2,
            y: 0,
        }
        this.invaders = [];
        // const columns = Math.floor(Math.random() * 5) + 2;
        // const rows = Math.floor(Math.random() * 3) + 2;
        const columns = 5;
        const rows = 4
        this.width = columns * 75;
        
        for (let x = 0; x < columns; x++){
            let i = 4
            for (let y = 0; y < rows; y++){
                this.invaders.push(new Invader({ x: x * 75 , y: y * 50},i));
                i--;
            }
        }
    }

    update() {
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        this.velocity.y = 0;

        if (this.position.x + this.width >= canvas.width || this.position.x <= 0) {
            this.velocity.x = -this.velocity.x;
            this.velocity.y = 5
        }
    }
}

class health{
    constructor({x , y}){
        this.position.x = x;
        this.position.y = y;

        this.Image = createImage("img/heart.png");
        this.width = 50;
        this.height = 50
    }
    draw(){
        context.beginPath();

        context.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        context.closePath();
    }

}
class gift{
    constructor({position , velocity}) {
        this.position = position;
        this.velocity = velocity;
        this.image = createImage("img/gift.png");
        // Width :  30      Height :    31
        this.width = 40;
        this.height = 40;
    }

    draw() {
        context.beginPath();
        context.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
        context.closePath();
    }

    update() {
        this.draw();
        // this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;
    }
}


const keys = {
    left: {pressed : false},
    right: {pressed : false},
    up: {pressed : false},
    down: {pressed : false},
    space: {pressed : false}
}

const game = {
    over: false,
    active: true,
}

const player = new Player();

let projectiles = [];
let grids = [];
let curGrid;
let invaderProjectiles = [];
let gifts = []
let particles = [];
let prizes = [];
let frame;
let randomInterval;
let score;
let lives = 3;
let speedupCounter = 4;
let interval;
let canShoot = true;
let invadershot;
let giftInterval;

let grid;

function initGame() {
    grid = new Grid();
    canShoot = true;
    timeLeft = timeLeft1;
    lives = 3
    giftInterval = setInterval(() => {
        sendGift();
    },5000);
    setTimeout(InvaderSpeedUp,5000)
    player.opacity = 1;
    player.position = {
        x: canvas.width / 2 - player.width / 2,
        y: canvas.height - player.height - 30
    }

    game.over = false;
    game.active = true;

    projectiles = [];
    grids = [];
    invaderProjectiles = [];
    particles = [];
    prizes = [];

    score = 0;
    frame = 0;
    randomInterval = Math.floor(Math.random() * 500) + 2000;
    scoreEl[0].innerHTML = score;

    timeE1.innerHTML = timeLeft;
    interval = setInterval(()=>{
        timeLeft--;
        console.log(timeLeft)
        timeE1.innerHTML = timeLeft;
        if (timeLeft == 0){
            gameOver()
        }
    },1000)

    for (let i = 0; i < 100; i++){
        particles.push(new Particle({
            position: {
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
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

    animate();
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

function gameOver(arr , index) {
    console.log("You Lose");
    //
    const status_title = document.getElementById("status");
    createParticles(player, "white" , true);
    setTimeout(() => {
        arr.splice(index, 1);
        player.opacity = 0;
        game.over = true;
    }, 0);
    setTimeout(() => {
        game.active = false;
        scoreEl[1].innerHTML = score;
        result.style.display = "block";
    }, 2000);
    if (lives == 0){
        status_title.innerHTML = "You Lost"
        scores.push(score);

    }
    else if(score >= 250){
        status_title.innerHTML = "Champion!"
        scores.push(score);

    }
    else if(score >100){
        status_title.innerHTML = "Winner!"
        scores.push(score);
    }
    else{
        status_title.innerHTML = "You can do better"
        scores.push(score);
    }
    clearInterval(interval);
    clearInterval(giftInterval);

}

function animate() {
    if (!game.active) return;
    requestAnimationFrame(animate);
    context.fillStyle = "black";
    context.fillRect(0, 0, canvas.width, canvas.height);

    player.update();
    
    prizes.forEach((prize, index) => {
        
        if (prize.position.y <= player.position.y + player.height
            && prize.position.y + prize.height >= player.position.y
            && prize.position.x + prize.width >= player.position.x
            && prize.position.x <= player.position.x + player.width) {
            setTimeout(() => {
                prizes.splice(index, 1);
            }, 0);
            // Score 
            score += prize.type * 5;
            scoreEl[0].innerHTML = score;
        } else {
            if (prize.position.y >= canvas.height - 50) {
                prize.velocity.y = 0;
            }
            if (prize.position.x + prize.width >= canvas.width) {
                prize.velocity.x = -prize.velocity.x;
            }

            prize.update();
        }
    });

    particles.forEach((particle, index) => {
        if (particle.position.y - particle.radius >= canvas.height) {
            particle.position.x = Math.random() * canvas.width;
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
    gifts.forEach((gift1,index) => {
        if (gift1.position.y + gift1.height >= canvas.height) {
            setTimeout(() => {
                gifts.splice(index, 1);
            } , 0);
        } else {
            gift1.update();
        }
        if (gift1.position.y >= player.position.y
            && gift1.position.y <= player.position.y + player.height
            && gift1.position.x >= player.position.x
            && gift1.position.x <= player.position.x + player.width){
                setTimeout(() => {
                    gifts.splice(index, 1);
                }, 0);
                // Score 
                score += 10;
                scoreEl[0].innerHTML = score;

                
            }
    })
    invaderProjectiles.forEach((invaderProjectile , index) => {
        if (invaderProjectile.position.y + invaderProjectile.height >= canvas.height) {
            setTimeout(() => {
                invaderProjectiles.splice(index, 1);
            } , 0);
        } else {
            invaderProjectile.update();
        }

        
        /// Game Over
        if (invaderProjectile.position.y >= player.position.y
            && invaderProjectile.position.y <= player.position.y + player.height
            && invaderProjectile.position.x >= player.position.x
            && invaderProjectile.position.x <= player.position.x + player.width) {
                lives--;
                if (lives == 0)
                    gameOver(invaderProjectiles , index);
                else{
                    player.position.x = player.startPosition.x
                    player.position.y = player.startPosition.y

                }

        }
    });


    grid.update();
        //
    curGrid = grid;

    // Spawn Projectiles
    if (frame % 100 === 0 && grid.invaders.length > 0 && canShoot) {
        const randomNum = Math.floor(Math.random() * grid.invaders.length);
        grid.invaders[randomNum].shoot();
        canShoot = false;
    }
    else if (!canShoot && invadershot.position.y >= canvas.height * 0.75)
        canShoot = true;

    grid.invaders.forEach((invader, invaderIdx) => {
        // Invader Touch Player
        // make lives - 1
        if (invader.position.y <= player.position.y + player.height
            && invader.position.y + invader.height >= player.position.y
            && invader.position.x + invader.width >= player.position.x
            && invader.position.x <= player.position.x + player.width) {
            const invaderFound = grid.invaders.find(
                (invader2) => invader2 === invader);
            if (invaderFound) {
                gameOver(grid.invaders, invaderIdx);
            }
        }

        if (invader.position.y >= canvas.height) {
            setTimeout(() => {
                grid.invaders.splice(invaderIdx, 1);
            }, 0);
        } else {
            invader.update(grid.velocity);
            projectiles.forEach((projectile, projectileIdx) => {
                // Kill Invader (Chicken)
                if (invader.position.y <= projectile.position.y - projectile.radius
                    && invader.position.y + invader.height >= projectile.position.y + projectile.radius
                    && invader.position.x <= projectile.position.x - projectile.radius
                    && invader.position.x + invader.width >= projectile.position.x + projectile.radius) {
                    const invaderFound = grid.invaders.find(
                        (invader2) => invader2 === invader );
                    const projectileFound = projectiles.find(
                        (projectile2) => projectile2 === projectile);
                    // Remove invader and projectile
                    if (invaderFound && projectileFound) {

                        createParticles(invader, "#BAA0DE", true);
                        
                        prizes.push(new Prize({
                            position: {
                                x: invader.position.x + invader.width / 2,
                                y: invader.position.y + invader.height
                            },
                            velocity: { x: Math.random(), y: Math.random() * 2 + 2 },
                        },invader.type  ))

                        grid.invaders.splice(invaderIdx, 1);
                        projectiles.splice(projectileIdx, 1);
                        if (grid.invaders.length > 0) {
                            const firstInvader = grid.invaders[0];
                            const lastInvader = grid.invaders[grid.invaders.length - 1];
                            grid.width = lastInvader.position.x -
                                firstInvader.position.x + lastInvader.width;
                            grid.position.x = firstInvader.position.x;
                        } 
                        else{
                            gameOver()
                        }
                        // else {
                        //     setTimeout(() => {
                        //         grids.splice(gridIndex, 1);
                        //     }, 0);
                        // }

                    }
                } 

            });
        }
    });
    

    projectiles.forEach((projectile,index) => {
        if (projectile.position.y + projectile.radius < 0) {
            setTimeout(() => {
                projectiles.splice(index, 1);
            }, 0);
        } else {
            projectile.update();
        }
    });

    if (keys.left.pressed && player.position.x > 0) {
        player.velocity.x = -speed;
        player.rotation = -0.2;
    } else if (keys.right.pressed && player.position.x + player.width < canvas.width) {
        player.velocity.x = speed;
        player.rotation = 0.2;
    } else{
        player.velocity.x = 0;
        player.rotation = 0
    }
// change if to move just in 40% if window height
    if (keys.up.pressed && player.position.y > 20 && player.position.y > 0.6 * canvas.height) {
        player.velocity.y = -speed;
    } else if (keys.down.pressed && player.position.y < canvas.height - player.height - 30) {
        player.velocity.y = speed;
    } else {
        player.velocity.y = 0;
    }

    frame++;
}

startGameBtn.addEventListener("click", () => {
    result.style.display = "none";
    initGame();
});
leaderBoardBtn.addEventListener("click", () => {
    createTable();
});
addEventListener("keydown", (event) => {
    if (game.over) return;
    console.log(event.key);
    switch (event.key) {
        case "a":
        case "ArrowLeft":
            keys.left.pressed = true;
            break;
        case "d":
        case "ArrowRight":
            keys.right.pressed = true;
            break;
        case "w":
        case "ArrowUp":
            keys.up.pressed = true;
            break;
        case "s":
        case "ArrowDown":
            keys.down.pressed = true;
            break;
        case shoot_key:
            keys.space.pressed = true;
            projectiles.push(new Projectile({
                position: { x: player.position.x + player.width / 2, y: player.position.y },
                velocity: { x: 0, y: -2 * speed }
            }));
            break;
    }
})

addEventListener("keyup", (event) => {
    switch (event.key) {
        case "a":
        case "ArrowLeft":
            keys.left.pressed = false;
            break;
        case "d":
        case "ArrowRight":
            keys.right.pressed = false;
            break;
        case "w":
        case "ArrowUp":
            keys.up.pressed = false;
            break;
        case "s":
        case "ArrowDown":
            keys.down.pressed = false;
            break;
        case shoot_key:
            keys.space.pressed = false;
            break;
    }
})

function sendGift(){
    gifts.push(new gift({position:{x : Math.random() * canvas.width, y : 0},velocity: { x: 0, y: Math.random() * 2 + 1 }}));
}

function InvaderSpeedUp(){
    if (curGrid.velocity.x < 0)
        curGrid.velocity.x -= 2;
    else
        curGrid.velocity.x += 2;
    speedupCounter--
    if (speedupCounter > 0)
        setTimeout(InvaderSpeedUp,5000)

}

function createTable(){
    showLeaderBoard();
    let data = scores.sort((a, b) => a - b);
    table.innerHTML = "";
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
    table.appendChild(row);
}