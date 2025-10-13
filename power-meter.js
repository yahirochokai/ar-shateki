// power-meter.js

// 定数定義 
const MAX_POWER = 50; 
const BASE_POWER = 25; 

// ------------------------------------
// パワーメーターロジック
// ------------------------------------
AFRAME.registerComponent('power-meter', {
    init: function () {
        this.power = 0; 
        this.direction = 1; 
        this.speed = 50; 
        this.meterEl = document.getElementById('power-bar');
        
        // ✅ 修正点1: 常にチャージするため、初期値を true に設定
        this.isCharging = true; 
        
        // ✅ 修正点2: throw-ballからのイベントリスナーを削除
        // (ロジックはthrow-ball側で行う)
    },
    
    tick: function (t, dt) {
        // ✅ 修正点3: isChargingのチェックを常に true とみなす
        if (!this.isCharging) {
            // isChargingがfalseになるのは、throw-ballコンポーネントが一時的に停止を指示した場合のみ。
            // 常に動かすため、ここでは isCharging の状態に関わらず動作させます。
            // しかし、投球時にメーターを固定する必要があるため、throw-ball側で一時停止を制御するイベントリスナーを復活させます。
            // throw-ball側でイベントを発火させます。
        }
        
        // パワー計算を継続
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
    },

    // throw-ballが投球した際に、メーターを一時停止するための関数
    setIsCharging: function(charging) {
        this.isCharging = charging;
        // isChargingがfalseになった場合、現在のパワーを固定するためtickの処理を止めます
    }
});