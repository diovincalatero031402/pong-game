const express = require('express');

const http = require('http');

const { Server } = require('socket.io');

const app = express();

const server = http.createServer(app);

const io = new Server(server);

// STATIC FILES

app.use(express.static('public'));

// SETTINGS

const WIDTH = 800;
const HEIGHT = 400;

const PADDLE_HEIGHT = 100;

const WINNING_SCORE = 15;

// PLAYERS

let players = {};

// SCORES

let scoreLeft = 0;
let scoreRight = 0;

// GAME STATE

let gameStarted = false;
let gamePaused = false;

let waitingForServe = false;
let servingSide = null;

// BALL

let ball = {

    x: WIDTH / 2,
    y: HEIGHT / 2,

    dx: 8,
    dy: 6,

    size: 16
};

// RESET BALL

function resetBall(side = null) {

    // NORMAL CENTER RESET

    if (side === null) {

        ball.x = WIDTH / 2;
        ball.y = HEIGHT / 2;

        ball.dx =
            (Math.random() > 0.5 ? 8 : -8);

        ball.dy =
            (Math.random() * 8) - 6;

        waitingForServe = false;

        return;
    }

    // SERVE FROM PLAYER

    const player =
        Object.values(players)
        .find(p => p.side === side);

    if (!player) return;

    // LEFT PLAYER SERVE

    if (side === 'left') {

        ball.x = 50;

        ball.dx = 12;

    } else {

        // RIGHT PLAYER SERVE

        ball.x = WIDTH - 50;

        ball.dx = -12;
    }

    ball.y =
        player.y + (PADDLE_HEIGHT / 2);

    ball.dy = 0;

    waitingForServe = true;

    servingSide = side;
}

// START COUNTDOWN

function startGameCountdown() {

    gameStarted = false;

    let countdown = 3;

    io.emit('countdown', countdown);

    const timer = setInterval(() => {

        countdown--;

        if (countdown > 0) {

            io.emit('countdown', countdown);

        } else {

            clearInterval(timer);

            gameStarted = true;

            resetBall();

            io.emit('gameStart');
        }

    }, 1000);
}

// RESET GAME

function resetGame() {

    scoreLeft = 0;
    scoreRight = 0;

    gamePaused = false;

    resetBall();

    Object.values(players).forEach((p) => {

        p.y = HEIGHT / 2 - 50;
    });

    if (Object.keys(players).length === 2) {

        io.emit('showStartButton');
    }
}

// CONNECTION

io.on('connection', (socket) => {

    console.log('Connected:', socket.id);

    if (Object.keys(players).length >= 2) {

        socket.emit('full');

        return;
    }

    const side =
        Object.keys(players).length === 0
            ? 'left'
            : 'right';

    players[socket.id] = {

        side,

        y: HEIGHT / 2 - 50
    };

    socket.emit('side', side);

    // SHOW START BUTTON

    if (Object.keys(players).length === 2) {

        io.emit('showStartButton');
    }

    // MOVE

    socket.on('move', (y) => {

        if (!players[socket.id]) return;

        players[socket.id].y = y;

        // THROW BALL WHEN SERVER MOVES

        if (
            waitingForServe &&
            players[socket.id].side === servingSide
        ) {

            waitingForServe = false;

            gameStarted = true;
        }
    });

    // START GAME BUTTON

    socket.on('startGame', () => {

        if (Object.keys(players).length === 2) {

            startGameCountdown();
        }
    });

    // PAUSE GAME

    socket.on('pauseGame', () => {

        gamePaused = !gamePaused;

        io.emit('pauseState', gamePaused);
    });

    // RESET GAME

    socket.on('resetGame', () => {

        resetGame();
    });

    // DISCONNECT

    socket.on('disconnect', () => {

        delete players[socket.id];

        gameStarted = false;

        gamePaused = false;

        waitingForServe = false;

        console.log('Disconnected:', socket.id);
    });
});

// GAME LOOP

setInterval(() => {

    if (Object.keys(players).length < 2) {

        return;
    }

    // MOVE BALL

    if (
        gameStarted &&
        !gamePaused &&
        !waitingForServe
    ) {

        ball.x += ball.dx;
        ball.y += ball.dy;
    }

    // WALL COLLISION

    if (
        ball.y <= ball.size ||
        ball.y >= HEIGHT - ball.size
    ) {

        ball.dy *= -1;
    }

    const leftPlayer =
        Object.values(players)
        .find(p => p.side === 'left');

    const rightPlayer =
        Object.values(players)
        .find(p => p.side === 'right');

    // LEFT COLLISION

    if (
        leftPlayer &&
        ball.x - ball.size <= 35 &&
        ball.y >= leftPlayer.y &&
        ball.y <= leftPlayer.y + PADDLE_HEIGHT
    ) {

        ball.dx = Math.abs(ball.dx);
    }

    // RIGHT COLLISION

    if (
        rightPlayer &&
        ball.x + ball.size >= WIDTH - 35 &&
        ball.y >= rightPlayer.y &&
        ball.y <= rightPlayer.y + PADDLE_HEIGHT
    ) {

        ball.dx = -Math.abs(ball.dx);
    }

    // SCORE RIGHT

    if (ball.x < 0) {

        scoreRight++;

        // CHECK WINNER

        if (scoreRight >= WINNING_SCORE) {

            gameStarted = false;

            io.emit('gameOver', {
                winner: 'right'
            });

            return;
        }

        gameStarted = false;

        // SERVE TO RIGHT PLAYER

        resetBall('right');
    }

    // SCORE LEFT

    if (ball.x > WIDTH) {

        scoreLeft++;

        // CHECK WINNER

        if (scoreLeft >= WINNING_SCORE) {

            gameStarted = false;

            io.emit('gameOver', {
                winner: 'left'
            });

            return;
        }

        gameStarted = false;

        // SERVE TO LEFT PLAYER

        resetBall('left');
    }

    // SEND STATE

    io.emit('state', {

        players,

        ball,

        scoreLeft,

        scoreRight
    });

}, 1000 / 60);

// START SERVER

const PORT =
    process.env.PORT || 3000;

server.listen(PORT, () => {

    console.log(
        `Server running on port ${PORT}`
    );
});