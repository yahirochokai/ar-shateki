// throw-ball.js (最終修正版 - 可視性チェック導入)

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
        this.isCharging = true; 
        this.touchDebugEl = document.getElementById('touch-debug');
        this.scoreContainerEl = document.getElementById('score-display-container');
        this.scoreMessageEl = document.getElementById('score-display-message');
        this.lastScoreEl = document.getElementById('last-score-display');
        this.instructionEl = document.getElementById('throw-instruction');
        this.powerMeterEl = document.querySelector('[power-meter]');
        this.selectedPower = 0;
        
        const THREE = AFRAME.THREE; 

        // ✅ 投球イベントはHTML要素のみに一本化
        this.instructionEl.addEventListener('click', this.handleClick.bind(this));

        this.markerEl = this.el.parentNode; 
        
        // ❌ markerFound/markerLost イベントリスナーを削除
        // this.markerEl.addEventListener('markerFound', this.handleMarkerFound.bind(this));
        // this.markerEl.addEventListener('markerLost', this.handleMarkerLost.bind(this));

        this.isMarkerVisible = false; // 初期値
        this.setIsCharging(true); 
    },
    
    // 【✅ 新規追加】毎フレーム、マーカーの可視性をチェック
    tick: function () {
        if (!this.markerEl.object3D) return;
        
        const currentVisible = this.markerEl.object3D.visible;
        
        // 可視性の状態が変わった場合のみ更新
        if (currentVisible !== this.isMarkerVisible) {
            this.isMarkerVisible = currentVisible;
            this.updateTargetIndicator();
        }
    },

    setIsCharging: function(charging) {
        this.isCharging = charging;
        if (this.powerMeterEl && this.powerMeterEl.components['power-meter']) {
            this.powerMeterEl.components['power-meter'].setIsCharging(charging);
        }
    },

    // ❌ handleMarkerFound/Lost関数は削除（tickで代用）

    updateTargetIndicator: function() {
        const indicatorEl = document.getElementById('target-indicator');
        if (this.isMarkerVisible) {
            // ✅ マーカーが見えている
            indicatorEl.style.display = 'block'; 
            if (this.isCharging) {
                this.instructionEl.innerText = 'タップでパワー決定！';
            }
        } else {
            // ✅ マーカーが見えていない
            indicatorEl.style.display = 'none'; 
            if (this.isCharging) {
                this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
            }
        }
    },
    
    resetThrowState: function() {
        this.isThrowing = false;
        this.setIsCharging(true); 

        // リセット時にも可視性で指示を更新
        if (this.isMarkerVisible) {
             this.instructionEl.innerText = 'タップでパワー決定！';
        } else {
             this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
        }
    },

    handleClick: function() {
        // ... (この部分は前回修正と同じロジックを維持) ...
        if (!this.isMarkerVisible) {
            this.showDebugMessage('マーカーがみえないよ！', 'yellow', 'red');
            return;
        }

        if (this.isThrowing) {
            this.showDebugMessage('投球ちゅう！', 'white', 'blue');
            return;
        }

        if (this.isCharging) { 
            this.setIsCharging(false); 
            
            this.selectedPower = this.powerMeterEl.components['power-meter'].getCurrentPower();
            this.throwBall();

            this.instructionEl.style.display = 'none';
        }
    },

    showDebugMessage: function(message, color, bgColor) {
        // ... (省略) ...
        this.touchDebugEl.style.display = 'block';
        this.touchDebugEl.innerText = message;
        this.touchDebugEl.style.color = color;
        this.touchDebugEl.style.backgroundColor = `rgba(${bgColor === 'red' ? '255, 0, 0' : '0, 0, 255'}, 0.7)`;
        
        clearTimeout(this.touchTimer);
        this.touchTimer = setTimeout(() => {
            this.touchDebugEl.style.display = 'none';
        }, 1500); 
    },

    getScoreMessage: function(powerValue) {
        // ... (省略) ...
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
        // ... (省略: この関数全体にロジック変更なし) ...
        this.isThrowing = true;
        
        const powerValue = Math.round(this.selectedPower);
        const result = this.getScoreMessage(powerValue);
        const displayScore = BASE_POWER - Math.abs(powerValue - BASE_POWER);

        const sceneEl = this.el.sceneEl;
        const cameraEl = sceneEl.camera.el;
        const ball = document.createElement('a-sphere');
        const THREE = AFRAME.THREE;
        
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