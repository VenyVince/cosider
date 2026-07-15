import { EPriority, IFileMetadata } from '../../common';
import { IUser, IUserProfile } from '../user';

import { ITask } from './task.interface';

export type ITaskParticipantResponse = Pick<IUser, 'id' | 'email'> &
  Pick<IUserProfile, 'handle' | 'nickname' | 'profileImageId'> & {
    updatedAt: string;
    handleUpdatedAt: string;
  };

export interface ITaskResponse {
  id: string;
  taskNumber: number;
  title: string;
  description?: string;
  sprintId?: string;
  linkedDocumentIds?: string[];
  linkedRequirementIds?: string[];
  status: ITask['status'];
  priority?: EPriority;
  startDate?: string;
  dueDate?: string;
  attachments: IFileMetadata[];
  assignee: ITaskParticipantResponse;
  reporter: ITaskParticipantResponse;
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
