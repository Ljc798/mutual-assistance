interface Task {
    id: string;
    title: string;
    category: string;
    DDL: string;
    position: string;
    address: string;
    takeCode?: string;
    takeName?: string;
    takeTel?: number;
    detail: string;
    offer: number | string;
    pay_amount?: number | string;
    status: number;
    formattedDDL?: string;
    formattedStatus?: string;
    displayPrice?: string;
    mode?: string;
    has_paid?: number;
}

type TodoType = 'task' | 'course' | 'personal';
interface TodoItem {
    id: string;
    type: TodoType;
    title: string;
    timeText: string;
    highlight: boolean;
    link?: string;
    todoId?: number;
    isDone?: boolean;
    priority?: number;
    content?: string;
}

import { BASE_URL } from '../../config/env';

Page({
    data: {
        tasks: [] as Task[], // 存储所有任务
        filteredTasks: [] as Task[], // 当前分类筛选后的任务
        selectedCategory: "全部", // 当前选中的分类
        keyword: "",
        searchResults: [],
        currentPage: 1,
        pageSize: 10,
        hasMore: true,
        selectedSchoolName: '',

        filters: [
            { label: '全部', value: 'all' },
            { label: '待接单', value: 0 },
            { label: '进行中', value: 1 },
            { label: '已完成', value: 2 },
        ],
        activeFilter: 'all',

        todos: [] as TodoItem[],
        showAddTodoModal: false,
        newTodoText: '',
        newTodoTime: '',
        newTodoContent: '',
        newTodoPriority: 0,
        newDueDate: '',
        newDueTime: '',
        editTodoId: -1,
        today: '',
        isSavingTodo: false,
    },

    onLoad() {
        this.loadTasks(); // 加载任务数据
        this.loadTodos();
        const d = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        this.setData({ today: `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}` });
    },

    onShow() {
        const app = getApp();
        const userSchoolName = app.globalData.selectedTaskSchoolName || app.globalData.userInfo?.school_name || '';
        const userSchoolId = app.globalData.selectedTaskSchoolId || app.globalData.userInfo?.school_id || null;

        this.setData({
            selectedSchoolName: userSchoolName
        });

        app.globalData.selectedTaskSchoolName = userSchoolName;
        app.globalData.selectedTaskSchoolId = userSchoolId;

        this.loadTasks(); // 加载任务
        this.loadTodos();
    },

    onPullDownRefresh() {
        this.setData({ currentPage: 1 });
        this.loadTasks();
        wx.stopPullDownRefresh();
    },

    onFilterTap(e: any) {
        const value = e.currentTarget.dataset.value;  // 'all' | 0 | 1 | 2
        // 重置分页并刷新
        this.setData({ activeFilter: value, currentPage: 1, hasMore: true }, () => {
          wx.showLoading({ title: '加载中' });
          this.loadTasks(false);
        });
      },

      loadTasks(isLoadMore = false) {
        const { selectedCategory, currentPage, pageSize, tasks, activeFilter } = this.data;
        const app = getApp();
        let school = app.globalData.selectedTaskSchoolId || app.globalData.userInfo?.school_id || null;
      
        // 触底加载下一页：这里即时计算下一页页码；刷新则用当前 1
        const nextPage = isLoadMore ? currentPage + 1 : 1;
      
        // 将 activeFilter 映射为后端可读的 status：all 传空，0/1/2 传数字
        const statusParam = activeFilter === 'all' ? '' : Number(activeFilter);
      
        wx.request({
          url: `${BASE_URL}/task/tasks`,
          method: "GET",
          data: {
            category: selectedCategory,
            page: nextPage,
            pageSize,
            school_id: school || '',
            status: statusParam,          // ★ 新增：状态筛选
          },
          header: { "Accept": "application/json" },
          success: (res: any) => {
            if (Array.isArray(res.data)) {
              const newTasks = res.data.map((task: Task) => ({
                ...task,
                displayPrice: task.status >= 1
                  ? Number(task.pay_amount || 0).toFixed(2)
                  : Number(task.offer).toFixed(2),
                formattedDDL: this.formatTime(task.DDL),
                formattedStatus: this.formatStatus(task.status),
              }));
      
              this.setData({
                tasks: isLoadMore ? [...tasks, ...newTasks] : newTasks,
                hasMore: newTasks.length === pageSize,
                currentPage: nextPage,     // ★ 成功后再推进页码
              });
            } else {
              wx.showToast({ title: "任务数据异常", icon: "none" });
              console.error("❌ 返回的数据异常：", res.data);
            }
          },
          fail: (err: any) => {
            console.error("❌ 请求失败:", err);
            wx.showToast({ title: "请求失败", icon: "none" });
          },
          complete: () => {
            wx.hideLoading();
            wx.stopPullDownRefresh?.();
          }
        });
      },

    loadTodos() {
        const app = getApp();
        const userId = app.globalData.userInfo?.id;
        const token = wx.getStorageSync('token');
        const now = new Date();
        const pad = (n: number) => n.toString().padStart(2, '0');
        const fmtHM = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

        const personalReq = new Promise<TodoItem[]>((resolve) => {
            if (!token) return resolve([]);
            wx.request({
                url: `${BASE_URL}/todo/list`,
                method: 'GET',
                header: { Authorization: `Bearer ${token}` },
                success: (res: any) => {
                    if (res.data?.success && Array.isArray(res.data.todos)) {
                        const arr = res.data.todos.filter((t: any) => t.type === 'personal').map((t: any) => {
                            const dt = t.due_time ? new Date(t.due_time) : null;
                            return {
                                id: `p_${t.id}`,
                                type: 'personal' as TodoType,
                                title: t.title,
                                timeText: dt ? `${pad(dt.getMonth()+1)}-${pad(dt.getDate())} ${fmtHM(dt)}` : '',
                                highlight: dt ? (dt.getTime() - now.getTime() < 2 * 3600 * 1000 && dt.getTime() > now.getTime()) : false,
                                todoId: t.id,
                                isDone: !!t.is_done,
                                priority: Number(t.priority || 0),
                                content: t.content || ''
                            } as TodoItem;
                        });
                        resolve(arr);
                    } else resolve([]);
                },
                fail: () => resolve([])
            });
        });

        const tasksReq = new Promise<TodoItem[]>((resolve) => {
            if (!userId || !token) return resolve([]);
            wx.request({
                url: `${BASE_URL}/task/my`,
                method: 'GET',
                header: { Authorization: `Bearer ${token}` },
                data: { userId },
                success: (res: any) => {
                    if (res.data.success && Array.isArray(res.data.tasks)) {
                        const items = res.data.tasks
                            .filter((t: any) => t.employee_id === userId && t.status === 1)
                            .slice(0, 5)
                            .map((t: any) => {
                                const ddl = new Date(t.DDL);
                                return {
                                    id: `task_${t.id}`,
                                    type: 'task' as TodoType,
                                    title: t.title,
                                    timeText: `截止 ${pad(ddl.getMonth() + 1)}-${pad(ddl.getDate())} ${fmtHM(ddl)}`,
                                    highlight: ddl.getTime() - now.getTime() < 3 * 3600 * 1000,
                                    link: `/pages/task/task?taskId=${t.id}`
                                };
                            });
                        resolve(items);
                    } else resolve([]);
                },
                fail: () => resolve([])
            });
        });

        const courseReq = new Promise<TodoItem[]>((resolve) => {
            if (!userId) return resolve([]);
            wx.request({
                url: `${BASE_URL}/timetable/get-timetable-config`,
                method: 'GET',
                data: { user_id: userId },
                success: (cfgRes: any) => {
                    if (!cfgRes.data?.success) return resolve([]);
                    const startDateStr = cfgRes.data.data.start_date;
                    const startDate = new Date(startDateStr);
                    const diffDays = Math.floor((now.getTime() - startDate.getTime()) / 86400000);
                    const week = Math.floor(diffDays / 7) + 1;
                    const weekday = ((now.getDay() + 6) % 7) + 1;
                    wx.request({
                        url: `${BASE_URL}/timetable/daily`,
                        method: 'GET',
                        data: { user_id: userId, week, weekday },
                        success: (dayRes: any) => {
                            if (!dayRes.data?.success) return resolve([]);
                            const list = (dayRes.data.data || [])
                                .map((c: any) => {
                                    const st = new Date(c.time_start);
                                    return {
                                        id: `course_${c.id}`,
                                        type: 'course' as TodoType,
                                        title: c.course_name,
                                        timeText: `${fmtHM(st)} 开课 · ${c.location || ''}`,
                                        highlight: st.getTime() - now.getTime() < 3600 * 1000 && st.getTime() > now.getTime(),
                                        link: `/pages/course/course?course_id=${c.id}`
                                    };
                                })
                                .slice(0, 5);
                            resolve(list);
                        },
                        fail: () => resolve([])
                    });
                },
                fail: () => resolve([])
            });
        });

        Promise.all([tasksReq, courseReq, personalReq]).then(([t1, t2, p]) => {
            const merged = [...t1, ...t2, ...p];
            this.setData({ todos: merged });
        });
    },

    openAddTodo() {
        this.setData({ showAddTodoModal: true, newTodoText: '', newTodoTime: '', newTodoContent: '', newTodoPriority: 0, newDueDate: '', newDueTime: '', editTodoId: -1, isSavingTodo: false });
    },

    closeAddTodo() {
        this.setData({ showAddTodoModal: false });
    },

    onNewTodoText(e: any) {
        this.setData({ newTodoText: e.detail.value });
    },

    onNewTodoTime(e: any) { this.setData({ newTodoTime: e.detail.value }); },
    onNewTodoContent(e: any) { this.setData({ newTodoContent: e.detail.value }); },
    onPriorityPicker(e: any) { this.setData({ newTodoPriority: Number(e.detail.value) }); },
    onDueDateChange(e: any) { this.setData({ newDueDate: e.detail.value }); },
    onDueTimeChange(e: any) { this.setData({ newDueTime: e.detail.value }); },

    savePersonalTodo() {
        const { newTodoText, newTodoContent, newTodoPriority, newDueDate, newDueTime, editTodoId } = this.data as any;
        if (!newTodoText) { wx.showToast({ title: '请输入事项', icon: 'none' }); return; }
        const token = wx.getStorageSync('token');
        const app = getApp();
        if (!token || !app.globalData?.userInfo?.id) { wx.showToast({ title: '请先登录', icon: 'none' }); return; }
        if (this.data.isSavingTodo) return;
        this.setData({ isSavingTodo: true });
        const due = newDueDate && newDueTime ? `${newDueDate} ${newDueTime}:00` : (newDueDate ? `${newDueDate} 00:00:00` : null);
        const payload: any = { type: 'personal', title: newTodoText, content: newTodoContent, due_time: due, priority: newTodoPriority };
        if (editTodoId && editTodoId > 0) {
            wx.request({
                url: `${BASE_URL}/todo/${editTodoId}/update`,
                method: 'POST',
                header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: payload,
                success: (res: any) => {
                    if (res.data?.success) {
                        wx.showToast({ title: '已更新', icon: 'success' });
                        this.setData({ showAddTodoModal: false, isSavingTodo: false });
                        this.loadTodos();
                    } else {
                        wx.showToast({ title: res.data?.message || '更新失败', icon: 'none' });
                        this.setData({ isSavingTodo: false });
                    }
                },
                fail: () => { wx.showToast({ title: '网络错误', icon: 'none' }); this.setData({ isSavingTodo: false }); }
            });
        } else {
            wx.request({
                url: `${BASE_URL}/todo/create`,
                method: 'POST',
                header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                data: payload,
                success: (res: any) => {
                    if (res.data?.success) {
                        wx.showToast({ title: '已添加', icon: 'success' });
                        this.setData({ showAddTodoModal: false, isSavingTodo: false });
                        this.loadTodos();
                    } else {
                        wx.showToast({ title: res.data?.message || '添加失败', icon: 'none' });
                        this.setData({ isSavingTodo: false });
                    }
                },
                fail: () => { wx.showToast({ title: '网络错误', icon: 'none' }); this.setData({ isSavingTodo: false }); }
            });
        }
    },

    toggleTodoDone(e: any) {
        const idx = e.currentTarget.dataset.index;
        const item = this.data.todos[idx] as TodoItem;
        if (!item || item.type !== 'personal' || !item.todoId) return;
        const token = wx.getStorageSync('token');
        wx.request({
            url: `${BASE_URL}/todo/${item.todoId}/update`,
            method: 'POST',
            header: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            data: { is_done: !item.isDone },
            success: () => this.loadTodos(),
            fail: () => wx.showToast({ title: '网络错误', icon: 'none' })
        });
    },

    deleteTodo(e: any) {
        const idx = e.currentTarget.dataset.index;
        const item = this.data.todos[idx] as TodoItem;
        if (!item || item.type !== 'personal' || !item.todoId) return;
        const token = wx.getStorageSync('token');
        wx.request({
            url: `${BASE_URL}/todo/${item.todoId}`,
            method: 'DELETE',
            header: { Authorization: `Bearer ${token}` },
            success: () => this.loadTodos(),
            fail: () => wx.showToast({ title: '网络错误', icon: 'none' })
        });
    },

    openEditTodo(e: any) {
        const idx = e.currentTarget.dataset.index;
        const item = this.data.todos[idx] as TodoItem;
        if (!item || item.type !== 'personal' || !item.todoId) return;
        const dt = item.timeText || '';
        const datePart = dt.split(' ')[0] || '';
        const timePart = dt.split(' ')[1] || '';
        const normalizedDate = /^(\d{1,2})-(\d{1,2})$/.test(datePart)
          ? `${new Date().getFullYear()}-${datePart.replace('-', '-')}`
          : datePart;
        this.setData({ showAddTodoModal: true, editTodoId: item.todoId, newTodoText: item.title, newTodoContent: item.content || '', newTodoPriority: item.priority || 0, newDueDate: normalizedDate || '', newDueTime: timePart || '' });
    },

    tapTodo(e: any) {
        const idx = e.currentTarget.dataset.index;
        const item = this.data.todos[idx] as TodoItem;
        if (item?.link) {
            wx.navigateTo({ url: item.link });
        }
    },

    handleCategoryClick(e: any) {
        const category = e.currentTarget.dataset.category;
        wx.navigateTo({
            url: `/pages/task-list/task-list?category=${encodeURIComponent(category)}`,
        });
    },

    handleTimetableClick() {
        wx.navigateTo({ url: "/pages/timetable/timetable" });
    },

    handleTaskClick(event: any) {
        const taskId = event.currentTarget.dataset.id;

        if (!taskId) {
            wx.showToast({ title: "任务 ID 缺失", icon: "none" });
            return;
        }
        wx.navigateTo({ url: `/pages/task/task?taskId=${taskId}` });
    },

    formatTime(DDL: string) {
        const date = new Date(DDL);
        date.setHours(date.getHours());
        const month = date.getMonth() + 1;
        const day = date.getDate();
        const hours = date.getHours();
        const minutes = date.getMinutes();
        return `${month}-${day} ${hours}:${minutes < 10 ? "0" + minutes : minutes}`;
    },

    formatStatus(status: number): string {
        switch (status) {
            case 0:
                return "待接单";
            case 1:
                return "进行中";
            case 2:
                return "已完成";
            default:
                return "未知状态";
        }
    },

    handleOrderClick() {
        wx.navigateTo({ url: "/pages/order/order" });
    },

    handleSchoolClick() {
        wx.navigateTo({
            url: '/pages/schools/schools?mode=task'
        });
    },

    handleSearchInput(e) {
        const value = e.detail.value;
        this.setData({ keyword: value });
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(() => {
            this.searchTasks(value);
        }, 800);
    },

    searchTasks(keyword) {
        const app = getApp();
        const schoolId = app.globalData?.selectedTaskSchoolId;

        if (!keyword.trim()) {
            this.setData({ searchResults: [] });
            return;
        }

        wx.request({
            url: `${BASE_URL}/task/search`,
            method: "GET",
            data: {
                q: keyword,
                school_id: schoolId // 👈 带上学校id
            },
            success: (res) => {
                if (res.data.success) {
                    this.setData({ searchResults: res.data.tasks });
                }
            },
            fail: () => {
                wx.showToast({ title: "搜索失败", icon: "none" });
            }
        });
    },
});