import { EPriority } from '../../common';

import { ITask } from './task.interface';

export interface ITaskResponse {
  id: string;
  taskNumber: number;
  title: string;
  description?: string;
  assigneeHandle?: string;
  sprintId?: string;
  linkedDocumentId?: string;
  linkedRequirementIds?: string[];
  status: ITask['status'];
  priority?: EPriority;
  startDate?: string;
  dueDate?: string;
  assigneeNickname: string;
  reporterNickname: string;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateNewTaskRequest
  extends
    Pick<ITask, 'title' | 'status'>,
    Partial<
      Pick<
        ITask,
        'description' | 'sprintId' | 'linkedDocumentId' | 'priority' | 'startDate' | 'dueDate'
      >
    > {}

export type IUpdateTaskRequest = Partial<ICreateNewTaskRequest>;
