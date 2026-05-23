const canvas = document.getElementById('gameCanvas');

const ctx = canvas.getContext('2d');

const socket = io();

// SETTINGS

const paddleWidth = 15;
const paddleHeight = 100;
const ballSize = 16;

// CHANGE BALL SPEED HERE

const ballSpeedMultiplier = 3;

let mySide = null;
let connected = false;
let gameEnded = false;

// PLAYER

const player = {

    x: 20,
    y: canvas.height / 2 - 50,
    width: paddleWidth,
    height: paddleHeight
};

// ENEMY

const enemy = {

    x: canvas.width - 35,
    y: canvas.height / 2 - 50,
    targetY: canvas.height / 2 - 50,
    width: paddleWidth,
    height: paddleHeight
};

// BALL

const ball = {

    x: canvas.width / 2,
    y: canvas.height / 2,
    size: ballSize
};

// BALL SPEED

let lastBallX = ball.x;
let lastBallY = ball.y;

let ballSpeed = 0;

// SCORES

let playerScore = 0;
let enemyScore = 0;

// CONNECTION

socket.on('connect', () => {

    connected = true;

    console.log('Connected');
});

socket.on('disconnect', () => {

    connected = false;

    alert('Disconnected from server');
});

// SIDE

socket.on('side', (side) => {

    mySide = side;

    if (side === 'right') {

        player.x = canvas.width - 35;

        enemy.x = 20;
    }
});

// SERVER FULL

socket.on('full', () => {

    alert('Server full');
});

// GAME STATE

socket.on('state', (state) => {

    Object.values(state.players).forEach((p) => {

        if (p.side !== mySide) {

            enemy.targetY = p.y;
        }
    });

    // CALCULATE BALL SPEED

    const dx = state.ball.x - lastBallX;
    const dy = state.ball.y - lastBallY;

    ballSpeed =
        Math.sqrt(dx * dx + dy * dy)
        * ballSpeedMultiplier;

    lastBallX = state.ball.x;
    lastBallY = state.ball.y;

    // UPDATE BALL

    ball.x = state.ball.x;
    ball.y = state.ball.y;

    // SCORES

    if (mySide === 'left') {

        playerScore = state.scoreLeft;
        enemyScore = state.scoreRight;

    } else {

        playerScore = state.scoreRight;
        enemyScore = state.scoreLeft;
    }

    document.getElementById('playerScore').textContent =
        playerScore;

    document.getElementById('computerScore').textContent =
        enemyScore;
});

// GAME OVER

socket.on('gameOver', (data) => {

    if (gameEnded) return;

    gameEnded = true;

    const iWon =
        (mySide === data.winner);

    Swal.fire({

        title: iWon
            ? 'You Win!'
            : 'You Lost!',

        text: iWon
            ? 'Congratulations!'
            : 'Better luck next time!',

        icon: iWon
            ? 'success'
            : 'error',

        confirmButtonText: 'OK'

    }).then(() => {

        socket.emit('resetGame');

        gameEnded = false;
    });
});

// RESET BUTTON

document
.getElementById('resetBtn')
.addEventListener('click', () => {

    socket.emit('resetGame');
});

// POINTER LOCK

canvas.addEventListener('click', async () => {

    try {

        await canvas.requestPointerLock();

    } catch (err) {

        console.error(err);
    }
});

// MOUSE MOVEMENT

document.addEventListener('mousemove', (e) => {

    if (
        document.pointerLockElement === canvas &&
        connected
    ) {

        player.y += e.movementY * 0.9;

        // CLAMP

        if (player.y < 0) {

            player.y = 0;
        }

        if (
            player.y >
            canvas.height - player.height
        ) {

            player.y =
                canvas.height - player.height;
        }

        // SEND

        socket.emit('move', player.y);
    }
});

// DRAW CENTER

function drawCenter() {

    ctx.strokeStyle = '#00ccff';

    ctx.lineWidth = 2;

    ctx.beginPath();

    ctx.moveTo(canvas.width / 2, 0);

    ctx.lineTo(
        canvas.width / 2,
        canvas.height
    );

    ctx.stroke();
}

// DRAW PADDLE

function drawPaddle(paddle, color) {

    ctx.fillStyle = color;

    ctx.fillRect(
        paddle.x,
        paddle.y,
        paddle.width,
        paddle.height
    );
}

// DRAW BALL

function drawBall() {

    ctx.fillStyle = '#ffff00';

    ctx.beginPath();

    ctx.arc(
        ball.x,
        ball.y,
        ball.size,
        0,
        Math.PI * 2
    );

    ctx.fill();
}

// DRAW

function draw() {

    ctx.fillStyle = '#000000';

    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    // SMOOTH ENEMY

    enemy.y +=
        (enemy.targetY - enemy.y) * 0.35;

    drawCenter();

    drawPaddle(player, '#0099ff');

    drawPaddle(enemy, '#ff0000');

    drawBall();

    // STATUS

    ctx.fillStyle = '#ffffff';

    ctx.font = '20px Arial';

    ctx.textAlign = 'center';

    // BALL SPEED TEXT

    ctx.fillText(
        'Ball Speed: ' + ballSpeed.toFixed(2),
        canvas.width / 2,
        30
    );

    if (!connected) {

        ctx.fillText(
            'Connecting...',
            canvas.width / 2,
            60
        );
    }
}

// LOOP

function gameLoop() {

    draw();

    requestAnimationFrame(gameLoop);
}

gameLoop();