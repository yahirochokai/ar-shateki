// throw-ball.js (最簡略化デバッグ版 - タップしたら強制発射)

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

        // ✅ 修正点1: HTML要素へのイベント登録を init 内で直接行う（touchstartを使用）
        this.instructionEl.addEventListener('touchstart', this.handleClick.bind(this));
        
        this.markerEl = this.el.parentNode; 
        
        this.isMarkerVisible = false; 
        this.setIsCharging(true); 
    },
    
    // ... (setIsCharging, updateInstructionText, updateTargetIndicator, resetThrowState は前回修正と同じ) ...

    setIsCharging: function(charging) {
        this.isCharging = charging;
        if (this.powerMeterEl && this.powerMeterEl.components['power-meter']) {
            this.powerMeterEl.components['power-meter'].setIsCharging(charging);
        }
        this.updateInstructionText();
    },
    
    updateInstructionText: function() {
        if (this.isCharging) {
            this.instructionEl.innerText = 'タップでパワー決定！';
        } else {
            this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
        }
    },
    
    updateTargetIndicator: function() {
        document.getElementById('target-indicator').style.display = 'none'; 
        this.updateInstructionText();
    },
    
    resetThrowState: function() {
        this.isThrowing = false;
        this.setIsCharging(true); 
        this.updateInstructionText();
    },

    // ✅ 修正点2: ガードをすべて外し、強制的に投球処理へ
    handleClick: function(event) {
        // イベントが3Dシーンに伝播するのを防ぐ
        if (event) event.preventDefault(); 
        
        this.touchDebugEl.style.display = 'none'; 
        clearTimeout(this.touchTimer);

        // *** 【デバッグ目的】タップされたことを強制的に表示する ***
        this.showDebugMessage('🚀 発射シークエンス開始！', 'yellow', 'green');
        // *******************************************************
        
        // ❌ 投球中、チャージ中のガードを全て削除
        /*
        if (this.isThrowing) {
            this.showDebugMessage('投球ちゅう！', 'white', 'blue');
            return;
        }
        
        if (this.isCharging) { 
            this.setIsCharging(false); 
        */

        // メーターの現在のパワーを取得 (isChargingの状態に関わらず)
        this.selectedPower = this.powerMeterEl.components['power-meter'].getCurrentPower();
        this.throwBall();

        this.instructionEl.style.display = 'none';
    },

    // ... (showDebugMessage, getScoreMessage は前回修正と同じ) ...
    showDebugMessage: function(message, color, bgColor) {
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
        // ✅ 修正点3: throwBallに入ったらisThrowingをセットし、二重発射を防ぐ
        this.isThrowing = true;
        
        const powerValue = Math.round(this.selectedPower);
        const result = this.getScoreMessage(powerValue);
        const displayScore = BASE_POWER - Math.abs(powerValue - BASE_POWER);

        const sceneEl = this.el.sceneEl;
        const cameraEl = sceneEl.camera.el;
        const ball = document.createElement('a-sphere');
        const THREE = AFRAME.THREE;
        
        // ... (投球ロジックはそのまま) ...
        const cameraWorldPosition = cameraEl.object3D.position.clone();
        
        let targetWorldPosition = new THREE.Vector3();
        targetWorldPosition.set(cameraWorldPosition.x, cameraWorldPosition.y, cameraWorldPosition.z - 2);
        
        if (this.markerEl.object3D.visible) {
            targetWorldPosition = this.el.object3D.getWorldPosition(new THREE.Vector3());
        }

        ball.setAttribute('position', { 
            x: cameraWorldPosition.x, 
            y: cameraWorldPosition.y,
            z: cameraWorldPosition.z - 0.5 
        });
        
        ball.setAttribute('radius', 0.1);
        ball.setAttribute('color', '#FF0000');
        ball.setAttribute('shadow', '');
        sceneEl.appendChild(ball);
        
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
                
                // リセット処理も強制実行
                this.resetThrowState(); 
            }
        };
        
        requestAnimationFrame(updateBall);
    }
});