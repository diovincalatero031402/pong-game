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

// BALL

let ball = {

    x: WIDTH / 2,
    y: HEIGHT / 2,

    dx: 5,
    dy: 4,

    size: 16
};

// RESET BALL

function resetBall() {

    ball.x = WIDTH / 2;
    ball.y = HEIGHT / 2;

    ball.dx =
        (Math.random() > 0.5 ? 5 : -5);

    ball.dy =
        (Math.random() * 6) - 3;
}

// RESET GAME

function resetGame() {

    scoreLeft = 0;
    scoreRight = 0;

    resetBall();

    Object.values(players).forEach((p) => {

        p.y = HEIGHT / 2 - 50;
    });
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

    // MOVE

    socket.on('move', (y) => {

        if (players[socket.id]) {

            players[socket.id].y = y;
        }
    });

    // RESET

    socket.on('resetGame', () => {

        resetGame();
    });

    // DISCONNECT

    socket.on('disconnect', () => {

        delete players[socket.id];
    });
});

// GAME LOOP

setInterval(() => {

    if (Object.keys(players).length < 2) {

        return;
    }

    // MOVE BALL

    ball.x += ball.dx;
    ball.y += ball.dy;

    // WALLS

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

        if (scoreRight >= WINNING_SCORE) {

            io.emit('gameOver', {
                winner: 'right'
            });
        }

        resetBall();
    }

    // SCORE LEFT

    if (ball.x > WIDTH) {

        scoreLeft++;

        if (scoreLeft >= WINNING_SCORE) {

            io.emit('gameOver', {
                winner: 'left'
            });
        }

        resetBall();
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