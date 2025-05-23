// 游戏配置
const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1000 },
            debug: false
        }
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

// 游戏变量
let player;
let ground;
let obstacles;
let background;
let decorations;
let score = 0;
let scoreText;
let hearts = 3;
let heartsText;
let isInvincible = false;
let gameOver = false;
let lastObstacleTime = 0;
let backgroundMusic;
let jumpSound;
let hitSound;
let deathSound;

// 创建游戏实例
const game = new Phaser.Game(config);

// 预加载资源
function preload() {
    // 加载图片资源
    this.load.image('player', 'assets/player.png');
    this.load.image('ground', 'assets/ground.png');
    this.load.image('obstacle', 'assets/obstacle.png');
    this.load.image('background', 'assets/background.png');
    this.load.image('cloud', 'assets/cloud.png');
    this.load.image('grass', 'assets/grass.png');
    this.load.image('heart', 'assets/heart.png');
    
    // 加载音效
    this.load.audio('backgroundMusic', 'assets/background-music.mp3');
    this.load.audio('jump', 'assets/jump.mp3');
    this.load.audio('hit', 'assets/hit.mp3');
    this.load.audio('death', 'assets/death.mp3');
}

// 创建游戏场景
function create() {
    // 创建背景
    background = this.add.tileSprite(400, 300, 800, 600, 'background');
    
    // 创建装饰层
    decorations = this.add.group();
    createDecoration(this);
    
    // 创建地面
    ground = this.physics.add.staticGroup();
    ground.create(400, 580, 'ground').setScale(2).refreshBody();
    
    // 创建玩家
    player = this.physics.add.sprite(200, 450, 'player');
    player.setCollideWorldBounds(true);
    player.setBounce(0.2);
    
    // 创建障碍物组
    obstacles = this.physics.add.group();
    
    // 添加碰撞检测
    this.physics.add.collider(player, ground);
    this.physics.add.collider(obstacles, ground);
    this.physics.add.overlap(player, obstacles, hitObstacle, null, this);
    
    // 创建UI
    createUI(this);
    
    // 设置输入控制
    this.input.keyboard.on('keydown-SPACE', jump);
    
    // 播放背景音乐
    backgroundMusic = this.sound.add('backgroundMusic', { loop: true, volume: 0.5 });
    backgroundMusic.play();
    
    // 加载音效
    jumpSound = this.sound.add('jump');
    hitSound = this.sound.add('hit');
    deathSound = this.sound.add('death');

    // 设置物理世界属性
    this.physics.world.gravity.y = 1000;
}

// 更新游戏状态
function update() {
    if (gameOver) return;
    
    // 更新背景
    background.tilePositionX += 2;
    
    // 更新装饰物
    updateDecorations(this);
    
    // 生成障碍物
    const currentTime = this.time.now;
    if (currentTime - lastObstacleTime > 1500) { // 修复数字格式
        createObstacle(this);
        lastObstacleTime = currentTime;
    }
    
    // 更新分数
    score += 10/60; // 每秒加10分
    scoreText.setText('分数: ' + Math.floor(score));
    
    // 处理长按空格
    if (this.input.keyboard.addKey('SPACE').isDown) {
        player.setVelocityY(player.body.velocity.y * 0.25);
    }

    // 检查障碍物是否移出屏幕左侧并销毁
    obstacles.getChildren().forEach(obstacle => {
        if (obstacle.x <= obstacle.width) {  // 当障碍物完全移出屏幕左侧时
            if (obstacle.moveTimer) {
                obstacle.moveTimer.remove();  // 移除该障碍物的定时器
            }
            obstacle.destroy();  // 销毁障碍物
            score += 100;  // 成功通过障碍物，加100分
        }
    });
}

// 创建UI元素
function createUI(scene) {
    // 创建分数文本
    scoreText = scene.add.text(650, 20, '分数: 0', {
        fontSize: '24px',
        fill: '#fff'
    });
    
    // 创建生命值显示
    heartsText = scene.add.text(20, 20, '❤️❤️❤️', {
        fontSize: '24px',
        fill: '#fff'
    });
}

// 创建装饰物
function createDecoration(scene) {
    const decoration = scene.add.sprite(
        Phaser.Math.Between(0, 800),
        Phaser.Math.Between(100, 400),
        Phaser.Math.RND.pick(['cloud', 'grass'])
    );
    decoration.setScale(0.5);
    decorations.add(decoration);
}

// 更新装饰物
function updateDecorations(scene) {
    decorations.getChildren().forEach(decoration => {
        decoration.x -= 1;
        if (decoration.x < -50) {
            decoration.destroy();
            createDecoration(scene);
        }
    });
}

// 创建障碍物
function createObstacle(scene) {
    // 随机生成障碍物高度（30-150像素之间）
    const obstacleHeight = Phaser.Math.Between(30, 150);
    // 根据高度计算y坐标，确保障碍物完全位于地面上方
    const groundY = 580;  // 地面的y坐标
    const obstacleY = groundY - obstacleHeight;  // 直接计算障碍物顶部位置
    
    // 创建障碍物并设置物理属性
    const obstacle = obstacles.create(850, obstacleY + obstacleHeight/2 - 40, 'obstacle');  // 将锚点设回中心
    obstacle.setDisplaySize(30, obstacleHeight);  // 设置障碍物大小
    obstacle.setOrigin(0.5, 0.5);  // 将锚点设回中心
    obstacle.setVelocityX(-200);  // 设置水平速度
    obstacle.setImmovable(true);  // 设置不可移动
    obstacle.setBounce(0);  // 设置弹性为0
    obstacle.setCollideWorldBounds(true);  // 设置与世界边界碰撞
    obstacle.body.allowGravity = false;  // 禁用重力
    
    // 为每个障碍物创建独立的移动定时器
    obstacle.moveTimer = scene.time.addEvent({
        delay: 16, // 约60帧每秒
        callback: () => {
            if (obstacle.active) {
                obstacle.x -= 3; // 每帧移动3像素
            }
        },
        callbackScope: this,
        loop: true
    });
}

// 跳跃函数
function jump() {
    if (!gameOver) {
        player.setVelocityY(-2800);  // 将跳跃速度从-600增加到-800，使跳跃更高
        jumpSound.play();
    }
}

// 碰撞处理
function hitObstacle(player, obstacle) {
    if (isInvincible) return;
    
    if (hearts > 1) {
        hearts--;
        heartsText.setText('❤️'.repeat(hearts));
        hitSound.play();
        
        // 设置无敌状态
        isInvincible = true;
        player.setTint(0xff0000);
        this.time.delayedCall(1000, () => {
            isInvincible = false;
            player.clearTint();
        });
    } else {
        gameOver = true;
        heartsText.setText('');
        deathSound.play();
        backgroundMusic.stop();
        
        // 创建半透明黑色背景
        const overlay = this.add.rectangle(400, 300, 800, 600, 0x000000, 0.5);
        
        // 显示游戏结束界面
        const gameOverText = this.add.text(400, 250, '游戏结束', {
            fontSize: '64px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 6,
            shadow: { offsetX: 2, offsetY: 2, color: '#000', blur: 2, stroke: true, fill: true }
        }).setOrigin(0.5);
        
        const scoreDisplay = this.add.text(400, 350, '最终得分: ' + Math.floor(score), {
            fontSize: '32px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        
        const restartButton = this.add.text(400, 450, '点击重新开始', {
            fontSize: '36px',
            fontFamily: 'Arial',
            fill: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4,
            backgroundColor: '#4a4a4a',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setInteractive();
        
        // 添加按钮悬停效果
        restartButton.on('pointerover', () => {
            restartButton.setStyle({ fill: '#ffff00' });
        });
        
        restartButton.on('pointerout', () => {
            restartButton.setStyle({ fill: '#ffffff' });
        });
        
        restartButton.on('pointerdown', () => {
            // 重置所有游戏状态
            score = 0;
            hearts = 3;
            isInvincible = false;
            gameOver = false;
            lastObstacleTime = 0;
            
            // 清除所有障碍物
            obstacles.getChildren().forEach(obstacle => {
                if (obstacle.moveTimer) {
                    obstacle.moveTimer.remove();
                }
                obstacle.destroy();
            });
            
            // 重置玩家位置
            player.setPosition(200, 450);
            player.clearTint();
            
            // 重置UI
            scoreText.setText('分数: 0');
            heartsText.setText('❤️❤️❤️');
            
            // 移除游戏结束界面
            overlay.destroy();
            gameOverText.destroy();
            scoreDisplay.destroy();
            restartButton.destroy();
            
            // 重新开始背景音乐
            backgroundMusic.play();
            
            // 强制更新场景
            this.scene.restart();
        });
    }
} 