// throw-ball.js

// 定数定義 (HTMLのscriptタグから移動)
const MAX_POWER = 50; 
const BASE_POWER = 25;
let lastScore = null; 

// ------------------------------------
// 投球ロジック
// ------------------------------------
AFRAME.registerComponent('throw-ball', {
    init: function () {
        this.isThrowing = false;
        // マーカー認識では、isTargetLockedの代わりにマーカーの有無をチェックする
        this.isCharging = true;
        this.touchDebugEl = document.getElementById('touch-debug');
        this.scoreContainerEl = document.getElementById('score-display-container');
        this.scoreMessageEl = document.getElementById('score-display-message');
        this.lastScoreEl = document.getElementById('last-score-display');
        this.instructionEl = document.getElementById('throw-instruction');
        this.powerMeterEl = document.querySelector('[power-meter]');
        this.selectedPower = 0;
        
        // 的（a-circle）と指示テキスト（HTML）の両方でクリックをリッスン
        this.el.addEventListener('click', this.handleClick.bind(this)); 
        this.instructionEl.addEventListener('click', this.handleClick.bind(this));

        // マーカーの認識状態が変更されたときにイベントを受け取るための設定
        this.markerEl = this.el.parentNode; // マーカーエンティティが親
        this.markerEl.addEventListener('markerFound', this.handleMarkerFound.bind(this));
        this.markerEl.addEventListener('markerLost', this.handleMarkerLost.bind(this));
        
        // マーカー認識の初期状態を設定
        this.isMarkerVisible = this.markerEl.object3D.visible;
        this.updateTargetIndicator();
    },

    handleMarkerFound: function() {
        this.isMarkerVisible = true;
        this.updateTargetIndicator();
    },

    handleMarkerLost: function() {
        this.isMarkerVisible = false;
        this.updateTargetIndicator();
    },

    updateTargetIndicator: function() {
        const indicatorEl = document.getElementById('target-indicator');
        if (this.isMarkerVisible) {
            indicatorEl.style.display = 'block';
            this.instructionEl.innerText = 'タップでパワー決定！';
        } else {
            indicatorEl.style.display = 'none';
            this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
        }
    },
    
    resetThrowState: function() {
        this.isCharging = true;
        this.isThrowing = false;
        this.el.sceneEl.emit('throw-state-changed', { isCharging: true });
    },

    handleClick: function() {
        this.touchDebugEl.style.display = 'none'; 
        clearTimeout(this.touchTimer);
        
        // マーカーが見えていなければ投球不可
        if (!this.isMarkerVisible) {
            this.touchDebugEl.style.display = 'block';
            this.touchDebugEl.innerText = 'マーカーがみえないよ！';
            this.touchDebugEl.style.color = 'yellow';
            
            this.touchTimer = setTimeout(() => {
                this.touchDebugEl.style.display = 'none';
            }, 1500); 
            return;
        }

        if (this.isCharging) {
            this.isCharging = false;
            this.el.sceneEl.emit('throw-state-changed', { isCharging: false });
            
            this.selectedPower = this.powerMeterEl.components['power-meter'].getCurrentPower();
            this.throwBall();

            this.instructionEl.style.display = 'none';
        }
    },

    getScoreMessage: function(powerValue) {
        // ... (元のロジックをそのまま使用)
        const power = Math.round(powerValue);

        if (power === BASE_POWER) {
            return { message: 'かみわざ！！', color: '#FFD700' };
        } else if ((power >= BASE_POWER - 5 && power <= BASE_POWER - 1) || (power >= BASE_POWER + 1 && power <= BASE_POWER + 5)) {
            return { message: 'すごい！', color: '#00BFFF' };
        } else if ((power >= BASE_POWER - 10 && power <= BASE_POWER - 6) || (power >= BASE_POWER + 6 && power <= BASE_POWER + 10)) {
            return { message: 'やったね！', color: '#32CD32' };
        } else {
            return { message: 'ざんねん…！', color: '#FF4500' };
        }
    },

    throwBall: function () {
        if (this.isThrowing) return;
        
        this.isThrowing = true;
        
        const powerValue = Math.round(this.selectedPower);
        const result = this.getScoreMessage(powerValue);

        const displayScore = BASE_POWER - Math.abs(powerValue - BASE_POWER);

        const sceneEl = this.el.sceneEl;
        const cameraEl = sceneEl.camera.el;
        const ball = document.createElement('a-sphere');
        
        // -------------------------------------------------------------
        // ボールのアニメーション（物理ベースではないシンプルな実装を維持）
        // -------------------------------------------------------------
        
        const cameraWorldPosition = cameraEl.object3D.position.clone();
        ball.setAttribute('position', { 
            x: cameraWorldPosition.x, 
            y: cameraWorldPosition.y,
            z: cameraWorldPosition.z - 0.5 
        });
        
        ball.setAttribute('radius', 0.1);
        ball.setAttribute('color', '#FF0000');
        ball.setAttribute('shadow', '');
        sceneEl.appendChild(ball);
        
        // 的（a-circle）のワールド座標をターゲットとする
        const targetWorldPosition = this.el.object3D.getWorldPosition(new THREE.Vector3());
        
        const throwDuration = 0.5; // 0.5秒で到達
        const steps = 30;
        const stepTime = throwDuration / steps;

        // パワーメーターのずれを上下のオフセットに変換
        const MAX_OFFSET_Y = 1.0; 
        const powerDiff = powerValue - BASE_POWER;
        const offsetScaleY = powerDiff / MAX_POWER; // 最大±1.0のスケール
        const verticalOffset = offsetScaleY * MAX_OFFSET_Y * 2; // パワーに応じたY軸のずれ

        // 最終目標地点を計算
        const finalTargetX = targetWorldPosition.x;
        const finalTargetY = targetWorldPosition.y + verticalOffset; // パワーのずれを垂直に適用
        const finalTargetZ = targetWorldPosition.z;

        // 速度を計算
        const velocityX = (finalTargetX - cameraWorldPosition.x) / throwDuration;
        const velocityY = (finalTargetY - cameraWorldPosition.y) / throwDuration;
        const velocityZ = (finalTargetZ - cameraWorldPosition.z + 0.5) / throwDuration; 

        let step = 0;
        
        const updateBall = () => {
            if (step < steps) {
                const newX = ball.getAttribute('position').x + velocityX * stepTime;
                const newY = ball.getAttribute('position').y + velocityY * stepTime;
                const newZ = ball.getAttribute('position').z + velocityZ * stepTime;

                ball.setAttribute('position', {x: newX, y: newY, z: newZ});
                
                step++;
                requestAnimationFrame(updateBall);
            } else {
                // アニメーション完了
                sceneEl.removeChild(ball);
                this.isThrowing = false;
                
                // スコア表示
                this.scoreMessageEl.innerHTML = `
                    ${displayScore} てん<br>
                    <br>
                    <small>${result.message}</small>
                `;
                this.scoreMessageEl.style.color = result.color;
                this.scoreMessageEl.style.border = `3px solid ${result.color}`;
                this.scoreContainerEl.style.display = 'block';
                
                lastScore = displayScore;
                this.lastScoreEl.innerText = `前回: ${lastScore} てん`;
            }
        };
        
        requestAnimationFrame(updateBall);
    }
});