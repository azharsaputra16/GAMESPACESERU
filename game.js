// ============================================================
// GALAXIAN - GAME.JS
// ============================================================

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const GAME_WIDTH = canvas.width;
const GAME_HEIGHT = canvas.height;

// ============================================================
// HUD
// ============================================================

const scoreDisplay = document.getElementById("scoreDisplay");
const waveDisplay = document.getElementById("waveDisplay");
const highScoreDisplay = document.getElementById("highScoreDisplay");
const livesDisplay = document.getElementById("livesDisplay");

const startScreen = document.getElementById("startScreen");
const pauseScreen = document.getElementById("pauseScreen");
const gameOverScreen = document.getElementById("gameOverScreen");

const startButton = document.getElementById("startButton");
const restartButton = document.getElementById("restartButton");
const resumeButton = document.getElementById("resumeButton");
const pauseButton = document.getElementById("pauseButton");

const finalScore = document.getElementById("finalScore");
const finalWave = document.getElementById("finalWave");

// ============================================================
// GAME STATE
// ============================================================

let gameRunning = false;
let gamePaused = false;

let score = 0;
let wave = 1;
let lives = 3;

let frameCount = 0;

// Timer untuk menentukan kapan alien menukik
let diveTimer = 120;

// Maksimal alien yang sedang menukik
const MAX_DIVING_ALIENS = 1;

let highScore =
    Number(localStorage.getItem("galaxianHighScore")) || 0;

// ============================================================
// INPUT
// ============================================================

const inputState = {
    left: false,
    right: false,
    shoot: false
};

// ============================================================
// OBJECT ARRAYS
// ============================================================

const aliens = [];
const playerBullets = [];
const alienBullets = [];
const stars = [];

// TAMBAHAN: efek ledakan
const explosions = [];

// ============================================================
// PLAYER
// ============================================================

const player = {

    x: GAME_WIDTH / 2 - 20,
    y: GAME_HEIGHT - 65,

    width: 40,
    height: 34,

    speed: 5.5,

    cooldown: 0,

    invincibleTimer: 0,

    update() {

        if (inputState.left) {
            this.x -= this.speed;
        }

        if (inputState.right) {
            this.x += this.speed;
        }

        // Batas kiri
        if (this.x < 10) {
            this.x = 10;
        }

        // Batas kanan
        if (this.x + this.width > GAME_WIDTH - 10) {

            this.x =
                GAME_WIDTH -
                this.width -
                10;
        }

        // Cooldown
        if (this.cooldown > 0) {
            this.cooldown--;
        }

        // Tembak
        if (
            inputState.shoot &&
            this.cooldown <= 0
        ) {

            shootPlayer();

            this.cooldown = 12;
        }

        if (this.invincibleTimer > 0) {
            this.invincibleTimer--;
        }
    },

    draw() {

        // Efek kedip ketika terkena
        if (
            this.invincibleTimer > 0 &&
            Math.floor(
                this.invincibleTimer / 5
            ) % 2 === 0
        ) {
            return;
        }

        ctx.save();

        ctx.translate(
            this.x + this.width / 2,
            this.y + this.height / 2
        );

        // Api
        ctx.fillStyle = "#ff9d00";

        ctx.beginPath();

        ctx.moveTo(-7, 13);
        ctx.lineTo(
            0,
            25 + Math.random() * 5
        );
        ctx.lineTo(7, 13);

        ctx.closePath();

        ctx.fill();

        // Badan
        ctx.fillStyle = "#dcecff";

        ctx.beginPath();

        ctx.moveTo(0, -19);
        ctx.lineTo(-17, 13);
        ctx.lineTo(-7, 10);
        ctx.lineTo(0, 16);
        ctx.lineTo(7, 10);
        ctx.lineTo(17, 13);

        ctx.closePath();

        ctx.fill();

        // Sayap kiri
        ctx.fillStyle = "#4b7cff";

        ctx.beginPath();

        ctx.moveTo(-5, -4);
        ctx.lineTo(-23, 14);
        ctx.lineTo(-6, 10);

        ctx.closePath();

        ctx.fill();

        // Sayap kanan
        ctx.beginPath();

        ctx.moveTo(5, -4);
        ctx.lineTo(23, 14);
        ctx.lineTo(6, 10);

        ctx.closePath();

        ctx.fill();

        // Kokpit
        ctx.fillStyle = "#43eaff";

        ctx.beginPath();

        ctx.arc(
            0,
            -7,
            5,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
};

// ============================================================
// ALIEN
// ============================================================

class Alien {

    constructor(
        homeX,
        homeY,
        type,
        row,
        col
    ) {

        this.homeX = homeX;
        this.homeY = homeY;

        this.x = homeX;
        this.y = homeY;

        this.width = 30;
        this.height = 24;

        this.type = type;

        this.row = row;
        this.col = col;

        this.alive = true;

        // FORMATION / DIVE / RETURN
        this.state = "formation";

        // ====================================================
        // DIVE
        // ====================================================

        this.diveProgress = 0;

        this.startX = homeX;
        this.startY = homeY;

        // Animasi salto 160 derajat
        this.saltoProgress = 0;

        // Rotasi alien
        this.rotation = 0;

        // Progress ketika muncul kembali dari atas
        this.returnProgress = 0;

        // Delay random untuk menembak
        this.shootCooldown =
            Math.floor(
                Math.random() * 250
            ) + 180;
    }

    update() {

        if (!this.alive) {
            return;
        }

        // ====================================================
        // FORMATION
        // ====================================================

        if (
            this.state === "formation"
        ) {

            const formationWave =
                Math.sin(
                    frameCount * 0.025
                ) * 28;

            this.x =
                this.homeX +
                formationWave;

            this.y =
                this.homeY +
                Math.sin(
                    frameCount * 0.04 +
                    this.col
                ) * 3;

            // -----------------------------
            // TEMBAKAN ALIEN
            // -----------------------------

            this.shootCooldown--;

            if (
                this.shootCooldown <= 0
            ) {

                if (
                    Math.random() < 0.18
                ) {

                    shootAlien(this);
                }

                this.shootCooldown =
                    Math.max(
                        100,
                        320 -
                        wave * 15
                    );
            }

            return;
        }

        // ====================================================
        // DIVE
        // ====================================================

        if (
            this.state === "dive"
        ) {

            this.updateDive();

            return;
        }

        // ====================================================
        // RETURN
        // ====================================================

        if (
            this.state === "return"
        ) {

            this.updateReturn();

            return;
        }
    }

    // ========================================================
    // ALIEN MENUKIK
    // SALTO 160 DERAJAT -> JATUH BERAT
    // ========================================================

    updateDive() {

        // Tetap mengikuti scaling wave yang lama.
        // Wave 1 = 1x, jadi tidak dipercepat.
        const speedMultiplier =
            getSpeedMultiplier();

        // ====================================================
        // FASE 1
        // SALTO 160 DERAJAT
        // ====================================================

        if (
            this.saltoProgress < 1
        ) {

            this.saltoProgress +=
                0.055 *
                speedMultiplier;

            const saltoT =
                Math.min(
                    this.saltoProgress,
                    1
                );

            // Sedikit naik saat salto
            this.x =
                this.startX +
                Math.sin(
                    saltoT * Math.PI
                ) * 20;

            this.y =
                this.startY -
                Math.sin(
                    saltoT * Math.PI
                ) * 18;

            // Rotasi 0 -> 160 derajat
            this.rotation =
                (160 * Math.PI / 180) *
                saltoT;

            // Salto selesai
            if (
                this.saltoProgress >= 1
            ) {

                this.saltoProgress = 1;

                this.rotation =
                    160 * Math.PI / 180;

                this.diveProgress = 0;
            }

            return;
        }

        // ====================================================
        // FASE 2
        // JATUH BERAT MENGEJAR PLAYER
        // ====================================================

        this.diveProgress +=
            0.012 *
            speedMultiplier;

        const t =
            Math.min(
                this.diveProgress,
                1
            );

        // Posisi tengah player
        const playerCenter =
            player.x +
            player.width / 2;

        // Target X alien
        const targetX =
            playerCenter -
            this.width / 2;

        // ====================================================
        // AKSELERASI JATUH
        // ====================================================

        const gravityT =
            Math.pow(
                t,
                2.4
            );

        // ====================================================
        // GERAKAN SAMPING
        // ====================================================

        const sideWave =
            Math.sin(
                t *
                Math.PI *
                2.2
            ) *
            (
                45 +
                this.row * 6
            ) *
            (1 - t);

        this.x =
            this.startX +
            (
                targetX -
                this.startX
            ) *
            Math.pow(
                t,
                1.3
            ) +
            sideWave;

        // ====================================================
        // JATUH KE BAWAH
        // ====================================================

        const fallDistance =
            GAME_HEIGHT -
            this.startY +
            120;

        this.y =
            this.startY +
            fallDistance *
            gravityT;

        // Tetap dalam posisi hasil salto
        this.rotation =
            160 * Math.PI / 180;

        // ====================================================
        // KELUAR DARI BAWAH LAYAR
        // ====================================================

        if (
            this.y >
            GAME_HEIGHT + 50
        ) {

            // Jangan balik dari bawah.
            // Langsung pindah ke mode return
            // dan muncul dari ATAS.

            this.state =
                "return";

            this.x =
                Math.max(
                    -20,
                    Math.min(
                        GAME_WIDTH -
                        this.width +
                        20,
                        targetX
                    )
                );

            this.y =
                -this.height -
                25;

            this.rotation = 0;

            this.returnProgress = 0;

            return;
        }
    }

    // ========================================================
    // MUNCUL DARI ATAS
    // LALU TURUN KE FORMASI
    // ========================================================

    updateReturn() {

        if (
            this.returnProgress === undefined
        ) {

            this.returnProgress = 0;
        }

        // Kecepatan turun dari atas
        this.returnProgress +=
            0.025 +
            wave * 0.001;

        const t =
            Math.min(
                this.returnProgress,
                1
            );

        // ====================================================
        // GERAK DARI ATAS KE POSISI FORMASI
        // ====================================================

        this.y =
            -this.height -
            25 +
            (
                this.homeY +
                this.height +
                25
            ) *
            t;

        // Bergerak perlahan ke posisi X formasi
        this.x +=
            (
                this.homeX -
                this.x
            ) *
            0.055;

        this.rotation = 0;

        // ====================================================
        // SUDAH SAMPAI FORMASI
        // ====================================================

        if (
            t >= 1
        ) {

            this.x =
                this.homeX;

            this.y =
                this.homeY;

            this.state =
                "formation";

            this.diveProgress = 0;

            this.saltoProgress = 0;

            this.returnProgress = 0;

            this.rotation = 0;

            // Reset waktu tembak
            this.shootCooldown =
                Math.floor(
                    Math.random() * 250
                ) + 180;
        }
    }

    // ========================================================
    // DRAW
    // ========================================================

    draw() {

        if (!this.alive) {
            return;
        }

        ctx.save();

        ctx.translate(
            this.x + this.width / 2,
            this.y + this.height / 2
        );

        // Rotasi alien ketika salto / dive
        ctx.rotate(
            this.rotation
        );

        let bodyColor;

        if (
            this.type === 0
        ) {

            bodyColor = "#ffdf45";

        } else if (
            this.type === 1
        ) {

            bodyColor = "#ff5c7a";

        } else {

            bodyColor = "#62eaff";
        }

        // Glow
        ctx.shadowBlur = 10;

        ctx.shadowColor =
            bodyColor;

        // Badan alien
        ctx.fillStyle =
            bodyColor;

        ctx.beginPath();

        ctx.moveTo(
            0,
            -12
        );

        ctx.lineTo(
            -14,
            -5
        );

        ctx.lineTo(
            -17,
            8
        );

        ctx.lineTo(
            -7,
            5
        );

        ctx.lineTo(
            0,
            12
        );

        ctx.lineTo(
            7,
            5
        );

        ctx.lineTo(
            17,
            8
        );

        ctx.lineTo(
            14,
            -5
        );

        ctx.closePath();

        ctx.fill();

        // Sayap kiri
        ctx.beginPath();

        ctx.moveTo(
            -9,
            1
        );

        ctx.lineTo(
            -21,
            12
        );

        ctx.lineTo(
            -8,
            9
        );

        ctx.closePath();

        ctx.fill();

        // Sayap kanan
        ctx.beginPath();

        ctx.moveTo(
            9,
            1
        );

        ctx.lineTo(
            21,
            12
        );

        ctx.lineTo(
            8,
            9
        );

        ctx.closePath();

        ctx.fill();

        // Mata
        ctx.shadowBlur = 0;

        ctx.fillStyle =
            "#ffffff";

        ctx.beginPath();

        ctx.arc(
            -6,
            -1,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.beginPath();

        ctx.arc(
            6,
            -1,
            3,
            0,
            Math.PI * 2
        );

        ctx.fill();

        ctx.restore();
    }
}

// ============================================================
// STAR
// ============================================================

function createStars() {

    stars.length = 0;

    for (
        let i = 0;
        i < 160;
        i++
    ) {

        stars.push({

            x:
                Math.random() *
                GAME_WIDTH,

            y:
                Math.random() *
                GAME_HEIGHT,

            size:
                Math.random() * 2 +
                0.5,

            speed:
                Math.random() * 1.5 +
                0.5
        });
    }
}

function updateStars() {

    for (
        const star of stars
    ) {

        star.y +=
            star.speed;

        if (
            star.y >
            GAME_HEIGHT
        ) {

            star.y = 0;

            star.x =
                Math.random() *
                GAME_WIDTH;
        }
    }
}

function drawStars() {

    ctx.fillStyle =
        "#02050f";

    ctx.fillRect(
        0,
        0,
        GAME_WIDTH,
        GAME_HEIGHT
    );

    for (
        const star of stars
    ) {

        ctx.fillStyle =
            "rgba(255,255,255,0.7)";

        ctx.fillRect(
            star.x,
            star.y,
            star.size,
            star.size
        );
    }
}

// ============================================================
// CREATE WAVE
// ============================================================

function createWave() {

    aliens.length = 0;

    const rows = 5;
    const cols = 8;

    const spacingX = 52;
    const spacingY = 38;

    const startX =
        GAME_WIDTH / 2 -
        ((cols - 1) *
            spacingX) / 2 -
        15;

    const startY = 70;

    for (
        let row = 0;
        row < rows;
        row++
    ) {

        for (
            let col = 0;
            col < cols;
            col++
        ) {

            const x =
                startX +
                col * spacingX;

            const y =
                startY +
                row * spacingY;

            let type;

            if (
                row === 0
            ) {

                type = 0;

            } else if (
                row <= 2
            ) {

                type = 1;

            } else {

                type = 2;
            }

            aliens.push(
                new Alien(
                    x,
                    y,
                    type,
                    row,
                    col
                )
            );
        }
    }

    // Reset timer dive setiap wave
    diveTimer =
        getDiveTimer();

    console.log(
        "WAVE:",
        wave,
        "Dive Timer:",
        diveTimer,
        "Speed:",
        getSpeedMultiplier()
    );
}

// ============================================================
// SPEED SCALING
// ============================================================

function getSpeedMultiplier() {

    return 1 +
        (
            (wave - 1) *
            0.08
        );
}

// ============================================================
// DIVE TIMER
// ============================================================

function getDiveTimer() {

    // Wave 1 = 120
    // Wave 2 = 110
    // Wave 3 = 100
    // dan seterusnya.

    return Math.max(
        30,
        120 -
        ((wave - 1) * 10)
    );
}

// ============================================================
// UPDATE DIVE TIMER
// ============================================================

function updateDiveTimer() {

    diveTimer--;

    if (
        diveTimer <= 0
    ) {

        startDive();

        diveTimer =
            getDiveTimer();
    }
}

// ============================================================
// MULAI ALIEN MENUKIK
// ============================================================

function startDive() {

    const divingCount =
        aliens.filter(
            alien =>
                alien.alive &&
                (
                    alien.state === "dive" ||
                    alien.state === "return"
                )
        ).length;

    if (
        divingCount >=
        MAX_DIVING_ALIENS
    ) {

        return;
    }

    const candidates =
        aliens.filter(
            alien =>
                alien.alive &&
                alien.state === "formation"
        );

    if (
        candidates.length === 0
    ) {

        return;
    }

    // Prioritaskan alien bagian depan
    candidates.sort(
        (a, b) =>
            a.row - b.row
    );

    let selected;

    // 75% memilih baris atas
    if (
        Math.random() < 0.75
    ) {

        const top =
            candidates.filter(
                alien =>
                    alien.row <= 2
            );

        if (
            top.length > 0
        ) {

            selected =
                top[
                    Math.floor(
                        Math.random() *
                        top.length
                    )
                ];
        }
    }

    // Kalau belum dapat
    if (!selected) {

        selected =
            candidates[
                Math.floor(
                    Math.random() *
                    candidates.length
                )
            ];
    }

    // Simpan posisi awal
    selected.startX =
        selected.x;

    selected.startY =
        selected.y;

    // Reset animasi dive
    selected.diveProgress = 0;

    // Mulai dari fase salto
    selected.saltoProgress = 0;

    selected.rotation = 0;

    selected.returnProgress = 0;

    selected.state = "dive";

    console.log(
        "ALIEN MENUKIK!",
        "Wave:",
        wave
    );
}

// ============================================================
// SHOOT PLAYER
// ============================================================

function shootPlayer() {

    playerBullets.push({

        x:
            player.x +
            player.width / 2 -
            2,

        y:
            player.y,

        width: 4,

        height: 14,

        speed: 9
    });

    playTone(
        700,
        0.06,
        "square",
        0.03
    );
}

// ============================================================
// SHOOT ALIEN
// ============================================================

function shootAlien(alien) {

    alienBullets.push({

        x:
            alien.x +
            alien.width / 2 -
            2,

        y:
            alien.y +
            alien.height,

        width: 4,

        height: 10,

        speed:
            2.5 +
            wave * 0.08
    });
}

// ============================================================
// UPDATE PLAYER BULLETS
// ============================================================

function updatePlayerBullets() {

    for (
        let i =
            playerBullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            playerBullets[i];

        bullet.y -=
            bullet.speed;

        if (
            bullet.y <
            -20
        ) {

            playerBullets.splice(
                i,
                1
            );
        }
    }
}

// ============================================================
// DRAW PLAYER BULLETS
// ============================================================

function drawPlayerBullets() {

    for (
        const bullet of playerBullets
    ) {

        ctx.shadowBlur = 10;

        ctx.shadowColor =
            "#00eaff";

        ctx.fillStyle =
            "#66eaff";

        ctx.fillRect(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );
    }

    ctx.shadowBlur = 0;
}

// ============================================================
// UPDATE ALIEN BULLETS
// ============================================================

function updateAlienBullets() {

    for (
        let i =
            alienBullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            alienBullets[i];

        bullet.y +=
            bullet.speed;

        if (
            bullet.y >
            GAME_HEIGHT + 20
        ) {

            alienBullets.splice(
                i,
                1
            );
        }
    }
}

// ============================================================
// DRAW ALIEN BULLETS
// ============================================================

function drawAlienBullets() {

    for (
        const bullet of alienBullets
    ) {

        ctx.shadowBlur = 10;

        ctx.shadowColor =
            "#ff2045";

        ctx.fillStyle =
            "#ff526b";

        ctx.fillRect(
            bullet.x,
            bullet.y,
            bullet.width,
            bullet.height
        );
    }

    ctx.shadowBlur = 0;
}

// ============================================================
// COLLISION
// ============================================================

function collision(a, b) {

    return (
        a.x <
        b.x + b.width &&

        a.x + a.width >
        b.x &&

        a.y <
        b.y + b.height &&

        a.y + a.height >
        b.y
    );
}

// ============================================================
// EXPLOSION EFFECT
// ============================================================

function createExplosion(alien) {

    explosions.push({

        x:
            alien.x +
            alien.width / 2,

        y:
            alien.y +
            alien.height / 2,

        radius: 3,

        alpha: 1,

        particles:
            Array.from(
                { length: 10 },
                () => ({

                    angle:
                        Math.random() *
                        Math.PI *
                        2,

                    speed:
                        Math.random() *
                        2.5 +
                        1,

                    distance: 0
                })
            )
    });
}

function updateExplosions() {

    for (
        let i =
            explosions.length - 1;
        i >= 0;
        i--
    ) {

        const explosion =
            explosions[i];

        explosion.radius += 2.2;

        explosion.alpha -=
            0.045;

        for (
            const particle of
            explosion.particles
        ) {

            particle.distance +=
                particle.speed;
        }

        if (
            explosion.alpha <= 0
        ) {

            explosions.splice(
                i,
                1
            );
        }
    }
}

function drawExplosions() {

    for (
        const explosion of
        explosions
    ) {

        ctx.save();

        ctx.globalAlpha =
            Math.max(
                0,
                explosion.alpha
            );

        // Lingkaran ledakan
        ctx.beginPath();

        ctx.arc(
            explosion.x,
            explosion.y,
            explosion.radius,
            0,
            Math.PI * 2
        );

        ctx.fillStyle =
            "#fff200";

        ctx.shadowBlur = 15;

        ctx.shadowColor =
            "#ff6a00";

        ctx.fill();

        // Partikel ledakan
        for (
            const particle of
            explosion.particles
        ) {

            const px =
                explosion.x +
                Math.cos(
                    particle.angle
                ) *
                particle.distance;

            const py =
                explosion.y +
                Math.sin(
                    particle.angle
                ) *
                particle.distance;

            ctx.beginPath();

            ctx.arc(
                px,
                py,
                2.5,
                0,
                Math.PI * 2
            );

            ctx.fillStyle =
                "#ff8c00";

            ctx.fill();
        }

        ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
}

// ============================================================
// CHECK COLLISION
// ============================================================

function checkCollisions() {

    // ========================================================
    // PLAYER BULLET VS ALIEN
    // ========================================================

    for (
        let i =
            playerBullets.length - 1;
        i >= 0;
        i--
    ) {

        const bullet =
            playerBullets[i];

        let bulletHit = false;

        for (
            const alien of aliens
        ) {

            if (
                !alien.alive
            ) {
                continue;
            }

            if (
                collision(
                    bullet,
                    alien
                )
            ) {

                alien.alive = false;

                // TAMBAHAN: buat efek ledakan
                createExplosion(alien);

                bulletHit = true;

                if (
                    alien.type === 0
                ) {

                    score += 100;

                } else if (
                    alien.type === 1
                ) {

                    score += 75;

                } else {

                    score += 50;
                }

                playTone(
                    120,
                    0.12,
                    "sawtooth",
                    0.04
                );

                break;
            }
        }

        if (
            bulletHit
        ) {

            playerBullets.splice(
                i,
                1
            );
        }
    }

    // ========================================================
    // ALIEN BULLET VS PLAYER
    // ========================================================

    if (
        player.invincibleTimer <= 0
    ) {

        for (
            let i =
                alienBullets.length - 1;
            i >= 0;
            i--
        ) {

            const bullet =
                alienBullets[i];

            if (
                collision(
                    bullet,
                    player
                )
            ) {

                alienBullets.splice(
                    i,
                    1
                );

                damagePlayer();

                break;
            }
        }
    }

    // ========================================================
    // ALIEN DIVE VS PLAYER
    // ========================================================

    if (
        player.invincibleTimer <= 0
    ) {

        for (
            const alien of aliens
        ) {

            if (
                !alien.alive
            ) {
                continue;
            }

            if (
                alien.state === "dive"
            ) {

                if (
                    collision(
                        alien,
                        player
                    )
                ) {

                    alien.alive = false;

                    damagePlayer();

                    break;
                }
            }
        }
    }
}

// ============================================================
// DAMAGE PLAYER
// ============================================================

function damagePlayer() {

    lives--;

    player.invincibleTimer =
        120;

    player.x =
        GAME_WIDTH / 2 -
        player.width / 2;

    updateHUD();

    playTone(
        100,
        0.25,
        "sawtooth",
        0.06
    );

    if (
        lives <= 0
    ) {

        endGame();
    }
}

// ============================================================
// CHECK WAVE
// ============================================================

function checkWave() {

    const aliveAliens =
        aliens.filter(
            alien =>
                alien.alive
        );

    if (
        aliveAliens.length === 0
    ) {

        wave++;

        score += 500;

        playerBullets.length = 0;

        alienBullets.length = 0;

        createWave();

        player.x =
            GAME_WIDTH / 2 -
            player.width / 2;

        playWaveSound();

        updateHUD();

        console.log(
            "===================="
        );

        console.log(
            "WAVE BARU:",
            wave
        );

        console.log(
            "Dive Timer:",
            getDiveTimer()
        );

        console.log(
            "Speed:",
            getSpeedMultiplier()
        );

        console.log(
            "===================="
        );
    }
}

// ============================================================
// HUD
// ============================================================

function updateHUD() {

    scoreDisplay.textContent =
        score.toLocaleString(
            "id-ID"
        );

    waveDisplay.textContent =
        wave;

    highScoreDisplay.textContent =
        highScore.toLocaleString(
            "id-ID"
        );

    livesDisplay.textContent =
        "❤️".repeat(
            Math.max(
                0,
                lives
            )
        );
}

// ============================================================
// DRAW
// ============================================================

function draw() {

    drawStars();

    drawPlayerBullets();

    drawAlienBullets();

    for (
        const alien of aliens
    ) {

        alien.draw();
    }

    // TAMBAHAN: tampilkan efek ledakan
    drawExplosions();

    player.draw();
}

// ============================================================
// GAME LOOP
// ============================================================

function gameLoop() {

    if (
        !gameRunning
    ) {
        return;
    }

    if (
        !gamePaused
    ) {

        frameCount++;

        updateStars();

        player.update();

        for (
            const alien of aliens
        ) {

            alien.update();
        }

        updatePlayerBullets();

        updateAlienBullets();

        // TAMBAHAN: update efek ledakan
        updateExplosions();

        updateDiveTimer();

        checkCollisions();

        checkWave();

        updateHUD();

        draw();
    }

    requestAnimationFrame(
        gameLoop
    );
}

// ============================================================
// START GAME
// ============================================================

function startGame() {

    score = 0;

    wave = 1;

    lives = 3;

    frameCount = 0;

    player.x =
        GAME_WIDTH / 2 -
        player.width / 2;

    player.y =
        GAME_HEIGHT - 65;

    player.cooldown = 0;

    player.invincibleTimer = 0;

    playerBullets.length = 0;

    alienBullets.length = 0;

    // TAMBAHAN: bersihkan ledakan saat mulai game
    explosions.length = 0;

    createStars();

    createWave();

    gameRunning = true;

    gamePaused = false;

    startScreen.classList.add(
        "hidden"
    );

    gameOverScreen.classList.add(
        "hidden"
    );

    pauseScreen.classList.add(
        "hidden"
    );

    pauseButton.textContent =
        "⏸";

    updateHUD();

    initAudio();

    gameLoop();
}

// ============================================================
// GAME OVER
// ============================================================

function endGame() {

    gameRunning = false;

    gamePaused = false;

    if (
        score > highScore
    ) {

        highScore = score;

        localStorage.setItem(
            "galaxianHighScore",
            highScore
        );
    }

    finalScore.textContent =
        score.toLocaleString(
            "id-ID"
        );

    finalWave.textContent =
        wave;

    gameOverScreen.classList.remove(
        "hidden"
    );

    updateHUD();

    playGameOverSound();
}

// ============================================================
// PAUSE
// ============================================================

function togglePause() {

    if (
        !gameRunning
    ) {
        return;
    }

    gamePaused =
        !gamePaused;

    if (
        gamePaused
    ) {

        pauseScreen.classList.remove(
            "hidden"
        );

        pauseButton.textContent =
            "▶";

    } else {

        pauseScreen.classList.add(
            "hidden"
        );

        pauseButton.textContent =
            "⏸";
    }
}

// ============================================================
// KEYBOARD
// ============================================================

document.addEventListener(
    "keydown",
    function(event) {

        if (
            event.key === "ArrowLeft"
        ) {

            inputState.left = true;

            event.preventDefault();
        }

        if (
            event.key === "ArrowRight"
        ) {

            inputState.right = true;

            event.preventDefault();
        }

        if (
            event.code === "Space"
        ) {

            inputState.shoot = true;

            event.preventDefault();
        }

        if (
            event.key.toLowerCase() === "p"
        ) {

            togglePause();
        }
    }
);

document.addEventListener(
    "keyup",
    function(event) {

        if (
            event.key === "ArrowLeft"
        ) {

            inputState.left = false;
        }

        if (
            event.key === "ArrowRight"
        ) {

            inputState.right = false;
        }

        if (
            event.code === "Space"
        ) {

            inputState.shoot = false;
        }
    }
);

// ============================================================
// TOUCH CONTROL
// ============================================================

function setupTouchButton(
    element,
    property
) {

    element.addEventListener(
        "pointerdown",
        function(event) {

            event.preventDefault();

            inputState[property] =
                true;
        }
    );

    element.addEventListener(
        "pointerup",
        function(event) {

            event.preventDefault();

            inputState[property] =
                false;
        }
    );

    element.addEventListener(
        "pointercancel",
        function() {

            inputState[property] =
                false;
        }
    );

    element.addEventListener(
        "pointerleave",
        function() {

            inputState[property] =
                false;
        }
    );
}

setupTouchButton(
    document.getElementById(
        "leftButton"
    ),
    "left"
);

setupTouchButton(
    document.getElementById(
        "rightButton"
    ),
    "right"
);

setupTouchButton(
    document.getElementById(
        "shootButton"
    ),
    "shoot"
);

// ============================================================
// BUTTON
// ============================================================

startButton.addEventListener(
    "click",
    startGame
);

restartButton.addEventListener(
    "click",
    startGame
);

resumeButton.addEventListener(
    "click",
    togglePause
);

pauseButton.addEventListener(
    "click",
    togglePause
);

// ============================================================
// AUDIO
// ============================================================

let audioContext = null;

function initAudio() {

    if (
        !audioContext
    ) {

        audioContext =
            new (
                window.AudioContext ||
                window.webkitAudioContext
            )();
    }

    if (
        audioContext.state ===
        "suspended"
    ) {

        audioContext.resume();
    }
}

function playTone(
    frequency,
    duration,
    type = "square",
    volume = 0.04
) {

    if (
        !audioContext
    ) {
        return;
    }

    const oscillator =
        audioContext.createOscillator();

    const gain =
        audioContext.createGain();

    oscillator.type =
        type;

    oscillator.frequency.value =
        frequency;

    gain.gain.setValueAtTime(
        volume,
        audioContext.currentTime
    );

    gain.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime +
        duration
    );

    oscillator.connect(gain);

    gain.connect(
        audioContext.destination
    );

    oscillator.start();

    oscillator.stop(
        audioContext.currentTime +
        duration
    );
}

// ============================================================
// WAVE SOUND
// ============================================================

function playWaveSound() {

    playTone(
        450,
        0.1,
        "square",
        0.04
    );

    setTimeout(
        function() {

            playTone(
                650,
                0.1,
                "square",
                0.04
            );

        },
        100
    );

    setTimeout(
        function() {

            playTone(
                850,
                0.15,
                "square",
                0.04
            );

        },
        200
    );
}

// ============================================================
// GAME OVER SOUND
// ============================================================

function playGameOverSound() {

    playTone(
        300,
        0.15,
        "sawtooth",
        0.05
    );

    setTimeout(
        function() {

            playTone(
                200,
                0.2,
                "sawtooth",
                0.05
            );

        },
        180
    );

    setTimeout(
        function() {

            playTone(
                100,
                0.35,
                "sawtooth",
                0.05
            );

        },
        400
    );
}

// ============================================================
// INITIAL
// ============================================================

createStars();

createWave();

updateHUD();

draw();