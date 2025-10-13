// power-meter.js

// 定数定義 (HTMLのscriptタグから移動)
const MAX_POWER = 50; 
const BASE_POWER = 25; 

// ------------------------------------
// パワーメーターロジック
// ------------------------------------
AFRAME.registerComponent('power-meter', {
    init: function () {
        this.power = 0; 
        this.direction = 1; 
        // 速度を50に調整
        this.speed = 50; 
        this.meterEl = document.getElementById('power-bar');
        this.isCharging = true; // 初期状態はチャージ中

        this.el.sceneEl.addEventListener('throw-state-changed', (evt) => {
            this.isCharging = evt.detail.isCharging;
            if(this.isCharging) {
                 this.power = 0; 
                 this.direction = 1; 
            }
        });
    },
    
    tick: function (t, dt) {
        if (!this.isCharging) return; 
        
        // 往復運動を計算
        const delta = this.direction * (dt / 1000) * this.speed;
        this.power += delta;

        if (this.power >= MAX_POWER) {
            this.power = MAX_POWER;
            this.direction = -1;
        } else if (this.power <= 0) {
            this.power = 0;
            this.direction = 1;
        }

        // UIを更新
        const height = (this.power / MAX_POWER) * 100;
        this.meterEl.style.height = `${height}%`;
    },
    
    getCurrentPower: function() {
        return this.power;
    }
});