Component({
    properties: {
        star: { type: Number, value: 0 },
        size: { type: Number, value: 40 },
        animated: {
            type: Boolean,
            value: false
        }
    },

    data: {
        fillPx: [0, 0, 0, 0, 0],
        isPerfect: false
    },

    observers: {
        'star, size'() {
            this.updateStars();
        }
    },

    methods: {
        updateStars() {
            const { star, size } = this.data;
            const fillPx = Array(5).fill(0);
            const full = Math.floor(star);
            const decimal = star - full;

            for (let i = 0; i < full; i++) fillPx[i] = size;

            if (decimal > 0 && full < 5) {
                let adjusted = 0;

                // ✅ 分段算法：左边激进，右边柔和
                if (decimal < 0.5) {
                    // 小于0.5时亮度提升更快（指数）
                    adjusted = Math.pow(decimal, 0.85);
                } else {
                    // 大于0.5时趋缓，避免爆亮
                    adjusted = 0.5 + Math.pow(decimal - 0.5, 1.5) * 1.4;
                }

                // 限制在 [0, 1]
                adjusted = Math.min(1, Math.max(0, adjusted));

                fillPx[full] = size * adjusted;

                isPerfect: adjusted >= 4.9
            }

            this.setData({ fillPx });
        }
    }
});
