// throw-ball.js (修正版)

// 定数定義 
const MAX_POWER = 50; 
const BASE_POWER = 25;
let lastScore = null; 

// ------------------------------------
// 投球ロジック
// ------------------------------------
AFRAME.registerComponent('throw-ball', {
    init: function () {
        this.isThrowing = false;
        this.isCharging = true; // メーターの状態と連動
        this.touchDebugEl = document.getElementById('touch-debug');
        this.scoreContainerEl = document.getElementById('score-display-container');
        this.scoreMessageEl = document.getElementById('score-display-message');
        this.lastScoreEl = document.getElementById('last-score-display');
        this.instructionEl = document.getElementById('throw-instruction');
        this.powerMeterEl = document.querySelector('[power-meter]');
        this.selectedPower = 0;
        
        const THREE = AFRAME.THREE; 

        this.el.addEventListener('click', this.handleClick.bind(this)); 
        this.instructionEl.addEventListener('click', this.handleClick.bind(this));

        // マーカー認識イベントリスナーの設定
        this.markerEl = this.el.parentNode; 
        this.markerEl.addEventListener('markerFound', this.handleMarkerFound.bind(this));
        this.markerEl.addEventListener('markerLost', this.handleMarkerLost.bind(this));
        
        // 初期状態のチェック
        this.isMarkerVisible = this.markerEl.object3D.visible;
        this.updateTargetIndicator();
        
        this.setIsCharging(true); // メーターを動かす
    },

    setIsCharging: function(charging) {
        this.isCharging = charging;
        if (this.powerMeterEl && this.powerMeterEl.components['power-meter']) {
            this.powerMeterEl.components['power-meter'].setIsCharging(charging);
        }
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
            if (this.isCharging) {
                this.instructionEl.innerText = 'タップでパワー決定！';
            }
        } else {
            indicatorEl.style.display = 'none'; 
            if (this.isCharging) {
                this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
            }
        }
    },
    
    resetThrowState: function() {
        this.isThrowing = false;
        this.setIsCharging(true); 

        if (this.isMarkerVisible) {
             this.instructionEl.innerText = 'タップでパワー決定！';
        } else {
             this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
        }
    },

    handleClick: function() {
        // ✅ 修正点1: 投球中は処理しない
        if (this.isThrowing) return; 

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
        
        // ✅ 修正点2: チャージ中（メーター動作中）であれば投球処理へ
        if (this.isCharging) { 
            // チャージを停止し、投球
            this.setIsCharging(false); 
            
            this.selectedPower = this.powerMeterEl.components['power-meter'].getCurrentPower();
            this.throwBall();

            this.instructionEl.style.display = 'none';
        }
        // else の場合は、投球処理の結果表示が出ている状態なので、ボタンが効かないのは正しい挙動です。
    },

    getScoreMessage: function(powerValue) {
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
        // handleClickでガードしているため、基本的にはここには入らないが、念のため
        if (this.isThrowing) return; 
        
        // ✅ 修正点3: 投球開始フラグを立てる (投球アニメーション中に再度クリックされるのを防ぐ)
        this.isThrowing = true;
        
        const powerValue = Math.round(this.selectedPower);
        const result = this.getScoreMessage(powerValue);
        const displayScore = BASE_POWER - Math.abs(powerValue - BASE_POWER);

        const sceneEl = this.el.sceneEl;
        const cameraEl = sceneEl.camera.el;
        const ball = document.createElement('a-sphere');
        const THREE = AFRAME.THREE;
        
        // (省略: ボール生成と初期位置設定)
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
        
        const targetWorldPosition = this.el.object3D.getWorldPosition(new THREE.Vector3());
        
        const throwDuration = 0.5; 
        const steps = 30;
        const stepTime = throwDuration / steps;

        const MAX_OFFSET_Y = 1.0; 
        const powerDiff = powerValue - BASE_POWER;
        const offsetScaleY = powerDiff / MAX_POWER; 
        const verticalOffset = offsetScaleY * MAX_OFFSET_Y * 2; 

        const finalTargetX = targetWorldPosition.x;
        const finalTargetY = targetWorldPosition.y + verticalOffset; 
        const finalTargetZ = targetWorldPosition.z;

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
                sceneEl.removeChild(ball);
                // ✅ 修正点4: アニメーション終了後に isThrowing を false に戻す
                this.isThrowing = false; 
                
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