// components/notify-banner/index.ts
import { on, off } from '../../utils/ws';

Component({
    data: {
        visible: false,
        content: '',
        timeoutId: null,
    },

    lifetimes: {
        attached() {
            on('notify', this.handleNotify);
        },
        detached() {
            off('notify', this.handleNotify);
        },
    },

    methods: {
        handleNotify(msg) {
            console.log("📢 收到通知:", msg);
            if (!msg?.content) return;
            this.setData({
                content: msg.content,
                visible: true,
            });

            if (this.data.timeoutId) clearTimeout(this.data.timeoutId);
            const timeoutId = setTimeout(() => {
                this.setData({ visible: false });
            }, 4000);

            this.setData({ timeoutId });
        },
    },
});