// throw-ball.js

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
        // ✅ 修正点: isChargingは投球前か投球後かを示すために使用 (マーカー認識とは切り離す)
        this.isCharging = true; 
        this.touchDebugEl = document.getElementById('touch-debug');
        this.scoreContainerEl = document.getElementById('score-display-container');
        this.scoreMessageEl = document.getElementById('score-display-message');
        this.lastScoreEl = document.getElementById('last-score-display');
        this.instructionEl = document.getElementById('throw-instruction');
        this.powerMeterEl = document.querySelector('[power-meter]');
        this.selectedPower = 0;
        
        const THREE = AFRAME.THREE; // THREE.jsライブラリを取得

        this.el.addEventListener('click', this.handleClick.bind(this)); 
        this.instructionEl.addEventListener('click', this.handleClick.bind(this));

        // マーカー認識イベントリスナーの設定
        this.markerEl = this.el.parentNode; 
        this.markerEl.addEventListener('markerFound', this.handleMarkerFound.bind(this));
        this.markerEl.addEventListener('markerLost', this.handleMarkerLost.bind(this));
        
        // 初期状態のチェック
        this.isMarkerVisible = this.markerEl.object3D.visible;
        this.updateTargetIndicator();
        
        // 初期状態でチャージを許可 (メーターは常に動いているため)
        this.setIsCharging(true);
    },

    // メーターへの状態変更ヘルパー関数
    setIsCharging: function(charging) {
        this.isCharging = charging;
        if (this.powerMeterEl && this.powerMeterEl.components['power-meter']) {
            this.powerMeterEl.components['power-meter'].setIsCharging(charging);
        }
    },

    handleMarkerFound: function() {
        this.isMarkerVisible = true;
        this.updateTargetIndicator();
        // マーカーが見つかってもメーターのチャージ状態は変更しない
    },

    handleMarkerLost: function() {
        this.isMarkerVisible = false;
        this.updateTargetIndicator();
        // マーカーが見えなくなってもメーターのチャージ状態は変更しない
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
        
        // チャージを再開 (メーターを再び動かす)
        this.setIsCharging(true); 

        // UIの指示を更新
        if (this.isMarkerVisible) {
             this.instructionEl.innerText = 'タップでパワー決定！';
        } else {
             this.instructionEl.innerText = 'マーカーにねらいをさだめて\nタップ！';
        }
    },

    handleClick: function() {
        this.touchDebugEl.style.display = 'none'; 
        clearTimeout(this.touchTimer);
        
        // マーカーが見えていない、または既に投球中の場合は処理を中止
        if (!this.isMarkerVisible || this.isThrowing) {
            if (!this.isMarkerVisible) {
                this.touchDebugEl.style.display = 'block';
                this.touchDebugEl.innerText = 'マーカーがみえないよ！';
                this.touchDebugEl.style.color = 'yellow';
                
                this.touchTimer = setTimeout(() => {
                    this.touchDebugEl.style.display = 'none';
                }, 1500); 
            }
            return;
        }

        if (this.isCharging) {
            // チャージを停止し、投球
            this.setIsCharging(false); 
            
            this.selectedPower = this.powerMeterEl.components['power-meter'].getCurrentPower();
            this.throwBall();

            this.instructionEl.style.display = 'none';
        }
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

        const