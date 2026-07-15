import { EPriority, ETaskStatus, ITaskResponse } from '@cosider/shared';
import { Expose } from 'class-transformer';

export class TaskResponseDto implements ITaskResponse {
  @Expose()
  id!: string;

  @Expose()
  taskNumber!: number;

  @Expose()
  title!: string;

  @Expose()
  description?: string;

  @Expose()
  sprintId?: string;

  @Expose()
  linkedDocumentIds?: string[];

  @Expose()
  linkedRequirementIds?: string[];

  @Expose()
  status!: ETaskStatus;

  @Expose()
  priority?: EPriority;

  @Expose()
  startDate?: string;

  @Expose()
  dueDate?: string;

  @Expose()
  attachments!: ITaskResponse['attachments'];

  @Expose()
  assignee!: ITaskResponse['assignee'];

  @Expose()
  reporter!: ITaskResponse['reporter'];

  @Expose()
  createdAt!: string;

  @Expose()
  updatedAt!: string;

  constructor(data?: Partial<TaskResponseDto>) {
    Object.assign(this, data);
  }
}
