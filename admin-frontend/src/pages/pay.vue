<template>
    <div>
        <n-page-header title="转账管理" />
        <n-data-table :columns="columns" :data="withdrawals" :pagination="pagination" :bordered="false" />

        <n-modal v-model:show="showModal" title="发送通知" preset="dialog">
            <div style="margin-bottom: 12px;">
                <n-input v-model:value="notificationTitle" placeholder="请输入通知标题" />
            </div>
            <div>
                <n-input v-model:value="notificationContent" type="textarea" placeholder="请输入通知内容" autosize />
            </div>
            <template #action>
                <n-button @click="showModal = false">取消</n-button>
                <n-button type="primary" @click="handleSendCustomNotification">发送</n-button>
            </template>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, h } from 'vue'
import {
    NPageHeader,
    NDataTable,
    NButton,
    NIcon,
    NModal,
    NInput
} from 'naive-ui'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'
import timezone from 'dayjs/plugin/timezone'
import { CheckmarkCircleOutline, NotificationsOutline } from '@vicons/ionicons5'
import { useMessage } from 'naive-ui'
import request from '@/utils/request'

dayjs.extend(utc)
dayjs.extend(timezone)

interface Withdrawal {
    id: number
    user_id: number
    amount: number
    method: '微信' | '支付宝'
    phone: string
    status: 'pending' | 'approved' | 'rejected'
    created_at: string
    processed_at?: string | null
    note?: string | null
}

const withdrawals = ref<Withdrawal[]>([])
const pagination = { pageSize: 10 }

const showModal = ref(false)
const currentRow = ref<Withdrawal | null>(null)
const notificationTitle = ref('')
const notificationContent = ref('')
const message = useMessage()

function formatTime(time?: string | null): string {
    return time ? dayjs.utc(time).tz('Asia/Shanghai').format('MM月DD日 HH:mm') : '未处理'
}

async function fetchWithdrawals() {
    try {
        const res = await request.get('withdrawals')
        withdrawals.value = res.data
    } catch (err) {
        console.error('获取转账数据失败', err)
    }
}

async function handleTransferDone(id: number) {
    try {
        await request.put(`withdrawals/${id}/status`, null, {
            params: { new_status: 'approved' }
        })

        const index = withdrawals.value.findIndex(item => item.id === id)
        if (index !== -1) {
            withdrawals.value[index].status = 'approved'
            withdrawals.value[index].processed_at = dayjs().toISOString()
        }

        message.success('转账状态已更新')
    } catch (err) {
        console.error('更新失败', err)
        message.error('操作失败')
    }
}

function openNotificationModal(row: Withdrawal) {
    currentRow.value = row
    notificationTitle.value = '转账状态通知'
    notificationContent.value = row.note || ''
    showModal.value = true
}

async function handleSendCustomNotification() {
    if (!currentRow.value) return

    try {
        await request.post('/notifications', {
            user_id: currentRow.value.user_id,
            type: 'system',
            title: notificationTitle.value,
            content: notificationContent.value
        })
        message.success(`通知已发送给用户 ${currentRow.value.user_id}`)
        showModal.value = false
    } catch (err) {
        console.error('发送通知失败', err)
        message.error('通知发送失败')
    }
}

const columns = [
    { title: 'ID', key: 'id' },
    { title: '用户ID', key: 'user_id' },
    { title: '金额', key: 'amount' },
    { title: '方式', key: 'method' },
    { title: '手机号', key: 'phone' },
    { title: '状态', key: 'status' },
    {
        title: '申请时间',
        key: 'created_at',
        render: (row: Withdrawal) => formatTime(row.created_at)
    },
    {
        title: '处理时间',
        key: 'processed_at',
        render: (row: Withdrawal) => formatTime(row.processed_at)
    },
    {
        title: '操作',
        key: 'actions',
        render(row: Withdrawal) {
            return h(
                NButton,
                {
                    type: 'success',
                    size: 'small',
                    strong: true,
                    round: true,
                    iconPlacement: 'left',
                    onClick: () => handleTransferDone(row.id),
                    style: {
                        padding: '0 12px',
                        fontWeight: '500'
                    }
                },
                {
                    icon: () => h(NIcon, null, { default: () => h(CheckmarkCircleOutline) }),
                    default: () => '转账完成'
                }
            )
        }
    },
    {
        title: '备注',
        key: 'note',
        render(row: Withdrawal) {
            return h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, [
                h('span', null, row.note || ''),
                h(
                    NButton,
                    {
                        type: 'info',
                        size: 'tiny',
                        secondary: true,
                        onClick: () => openNotificationModal(row)
                    },
                    {
                        icon: () => h(NIcon, null, { default: () => h(NotificationsOutline) }),
                        default: () => '推送通知'
                    }
                )
            ])
        }
    }
]

onMounted(fetchWithdrawals)
</script>

<style scoped></style>