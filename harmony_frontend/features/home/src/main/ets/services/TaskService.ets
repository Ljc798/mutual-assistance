import { HttpClient, TaskDTO, TaskItem, TaskStatus } from 'basic'

function toTaskItem(item: TaskDTO): TaskItem {
  return {
    id: String(item.id),
    title: item.title,
    category: item.category,
    deadline: item.DDL,
    position: item.position,
    address: item.address,
    status: item.status as TaskStatus,
    mode: 'fixed',
    offer: item.offer,
    hasPaid: false,
    formattedDeadline: formatDeadline(item.DDL)
  }
}

function formatDeadline(value: string): string {
  const date = new Date(value)
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const pad = (num: number) => num < 10 ? `0${num}` : `${num}`
  return `${pad(month)}-${pad(day)} ${pad(hours)}:${pad(minutes)}`
}

export async function fetchTasks(token?: string): Promise<TaskItem[]> {
  const headers: Record<string, string> = token ? {
    "Authorization": `Bearer ${token}`
  } : {};

  const list = await HttpClient.get<TaskDTO[]>('/task/tasks', undefined, headers);

  return list.map(toTaskItem);
}