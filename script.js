// Canvas setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Game objects
const paddleWidth = 15;
const paddleHeight = 100;
const ballSize = 25;

const player = {
    x: 20,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    speed: 6
};

const computer = {
    x: canvas.width - 20 - paddleWidth,
    y: canvas.height / 2 - paddleHeight / 2,
    width: paddleWidth,
    height: paddleHeight,
    dy: 0,
    speed: 4.5
};

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    size: ballSize,
    dx: 5,
    dy: 5,
    speed: 5
};

// Game state
let gameRunning = false;
let playerScore = 0;
let computerScore = 0;

// Input handling
const keys = {};
let mouseY = canvas.height / 2;

document.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

document.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseY = e.clientY - rect.top;
});

// Button controls
document.getElementById('startBtn').addEventListener('click', () => {
    gameRunning = !gameRunning;
    document.getElementById('startBtn').textContent = gameRunning ? 'Pause Game' : 'Start Game';
});

document.getElementById('resetBtn').addEventListener('click', () => {
    resetGame();
});

// Reset game
function resetGame() {
    gameRunning = false;
    playerScore = 0;
    computerScore = 0;
    document.getElementById('playerScore').textContent = '0';
    document.getElementById('computerScore').textContent = '0';
    document.getElementById('startBtn').textContent = 'Start Game';
    resetBall();
}

// Reset ball position
function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.dx = (Math.random() > 5 ? 1 : -1) * ball.speed;
    ball.dy = (Math.random() - 5) * ball.speed;
}

// Update player paddle position
function updatePlayer() {
    // Arrow keys control
    if (keys['ArrowUp'] && player.y > 0) {
        player.y -= player.speed;
    }
    if (keys['ArrowDown'] && player.y < canvas.height - player.height) {
        player.y += player.speed;
    }

    // Mouse control
    const mousePaddleCenter = mouseY - player.height / 2;
    if (mousePaddleCenter > 0 && mousePaddleCenter < canvas.height - player.height) {
        player.y = mousePaddleCenter;
    }
}

// Update computer paddle position (AI)
function updateComputer() {
    const computerCenter = computer.y + computer.height / 2;
    const ballCenter = ball.y;

    // Simple AI: follow the ball
    if (computerCenter < ballCenter - 30) {
        computer.y += computer.speed;
    } else if (computerCenter > ballCenter + 30) {
        computer.y -= computer.speed;
    }

    // Keep computer paddle in bounds
    if (computer.y < 0) {
        computer.y = 0;
    }
    if (computer.y > canvas.height - computer.height) {
        computer.y = canvas.height - computer.height;
    }
}

// Update ball position
function updateBall() {
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Wall collision (top and bottom)
    if (ball.y - ball.size < 0 || ball.y + ball.size > canvas.height) {
        ball.dy *= -1;
        ball.y = Math.max(ball.size, Math.min(canvas.height - ball.size, ball.y));
    }

    // Paddle collision detection
    if (
        ball.x - ball.size < player.x + player.width &&
        ball.y > player.y &&
        ball.y < player.y + player.height
    ) {
        ball.dx *= -1;
        ball.x = player.x + player.width + ball.size;
        // Add spin based on where the ball hits the paddle
        const hitPos = (ball.y - (player.y + player.height / 2)) / (player.height / 2);
        ball.dy += hitPos * 2;
    }

    if (
        ball.x + ball.size > computer.x &&
        ball.y > computer.y &&
        ball.y < computer.y + computer.height
    ) {
        ball.dx *= -1;
        ball.x = computer.x - ball.size;
        // Add spin based on where the ball hits the paddle
        const hitPos = (ball.y - (computer.y + computer.height / 2)) / (computer.height / 2);
        ball.dy += hitPos * 2;
    }

    // Scoring
    if (ball.x < 0) {
        computerScore++;
        document.getElementById('computerScore').textContent = computerScore;
        resetBall();
    }

    if (ball.x > canvas.width) {
        playerScore++;
        document.getElementById('playerScore').textContent = playerScore;
        resetBall();
    }
}

// Draw functions
function drawPaddle(paddle) {
    if (paddle === player) {
        ctx.fillStyle = '#0099ff';
        ctx.strokeStyle = 'FFFFFF';
    } else {
        ctx.fillStyle = '#F70000';
        ctx.strokeStyle = 'FFFFFF';
    }
    ctx.fillRect(paddle.x, paddle.y, paddle.width, paddle.height);
    ctx.lineWidth = 2;
    ctx.strokeRect(paddle.x, paddle.y, paddle.width, paddle.height);
}

function drawBall() {
    ctx.fillStyle = '#ffff00';
    ctx.strokeStyle = '##0099ff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.size, 0, Math.PI * 2);
    ctx.fill();
}

function drawCenter() {
   
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();

    // Draw horizontal line
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    // Draw circle in the center
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 35, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#00ccff';
    ctx.lineWidth = 2;
    ctx.stroke();
}

function draw() {
    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw center line
    drawCenter();

    // Draw paddles and ball
    drawPaddle(player);
    drawPaddle(computer);
    drawBall();
}

// Game loop
function gameLoop() {
    if (gameRunning) {
        updatePlayer();
        updateComputer();
        updateBall();
    }

    draw();
    requestAnimationFrame(gameLoop);
}

// Start the game loop
gameLoop();