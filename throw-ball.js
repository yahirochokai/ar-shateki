// throw-ball.js (最終版 - イベント直結・投球強制)

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
        // bind(this)で、handleClickがこのコンポーネントのthisコンテキストで実行されることを保証
        this.instructionEl.addEventListener('touchstart', this.handleClick.bind(this));
        
        this.markerEl = this.el.parentNode; 
        
        this.isMarkerVisible = false; 
        this.setIsCharging(true); 
    },
    
    // ... (tick は削除されたまま) ...

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
            // 投球後のリセット待ち状態
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

    // ✅ 修正点2: handleClick内のガードを最小限にする
    handleClick: function(event) {
        // タップイベントが3Dシーンに伝播するのを防ぐ
        if (event) event.preventDefault(); 
        
        this.touchDebugEl.style.display = 'none'; 
        clearTimeout(this.touchTimer);
        
        // 投球中の場合は処理を中止
        if (this.isThrowing) {
            this.showDebugMessage('投球ちゅう！', 'white', 'blue');
            return;
        }
        
        // チャージ中の場合のみ、投球を実行
        if (this.isCharging) { 
            // 投球処理開始
            this.setIsCharging(false); 
            
            this.selectedPower = this.powerMeterEl.components['power-meter'].getCurrentPower();
            this.throwBall();

            this.instructionEl.style.display = 'none';
        }
    },

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
        this.isThrowing = true;
        
        const powerValue = Math.round(this.selectedPower);
        const result = this.getScoreMessage(powerValue);
        const displayScore = BASE_POWER - Math.abs(powerValue - BASE_POWER);

        const sceneEl = this.el.sceneEl;
        const cameraEl = sceneEl.camera.el;
        const ball = document.createElement('a-sphere');
        const THREE = AFRAME.THREE;
        
        const cameraWorldPosition = cameraEl.object3D.position.clone();
        
        let targetWorldPosition = new THREE.Vector3();
        targetWorldPosition.set(cameraWorldPosition.x, cameraWorldPosition.y, cameraWorldPosition.z - 2);
        
        // マーカーが見えている場合は、的の位置（水色の丸）の座標を使用
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
            }
        };
        
        requestAnimationFrame(updateBall);
    }
});