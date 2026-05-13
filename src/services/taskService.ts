import type { Task, InboxMessage } from '@/types';

// Placeholder: create a task from an inbox message
export async function createTaskFromMessage(
  _message: InboxMessage
): Promise<Task> {
  throw new Error('Not implemented: connect to task backend');
}

// Placeholder: update a task status
export async function updateTaskStatus(
  _taskId: string,
  _status: Task['status']
): Promise<Task> {
  throw new Error('Not implemented: connect to task backend');
}

// Placeholder: assign a task to a staff member
export async function assignTask(
  _taskId: string,
  _staffId: string
): Promise<Task> {
  throw new Error('Not implemented: connect to task backend');
}

// Placeholder: fetch all tasks for the clinic
export async function fetchTasks(): Promise<Task[]> {
  throw new Error('Not implemented: connect to task backend');
}

// Placeholder: resolve/close a task
export async function resolveTask(_taskId: string): Promise<void> {
  throw new Error('Not implemented: connect to task backend');
}
