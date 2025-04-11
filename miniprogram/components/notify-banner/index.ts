import { on, off } from '../../utils/ws';

Component({
  data: {
    visible: false,
    content: '',
    timeoutId: null,
  },

  lifetimes: {
    attached() {
      console.log('✅ notify-banner 组件挂载');

      // 👇 绑定 this，避免回调中 this 丢失
      this._boundNotifyHandler = this.handleNotify.bind(this);
      on('notify', this._boundNotifyHandler);
    },

    detached() {
      off('notify', this._boundNotifyHandler);
    },
  },

  methods: {
    handleNotify(msg) {
        console.log('📥 收到 notify 消息:', msg); // ✅ 加这一句
      if (!msg?.content) return;

      this.setData({
        content: msg.content,
        visible: true
      });

      if (this.data.timeoutId) clearTimeout(this.data.timeoutId);
      const timeoutId = setTimeout(() => {
        this.setData({ visible: false });
      }, 4000);

      this.setData({ timeoutId });
    },

    closeNotify() {
      this.setData({ visible: false });
      if (this.data.timeoutId) clearTimeout(this.data.timeoutId);
    }
  }
});