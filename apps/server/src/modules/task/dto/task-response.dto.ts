import { EPriority, ETaskStatus, ITaskResponse } from '@cosider/shared';

export class TaskResponseDto implements ITaskResponse {
  id!: string;
  taskNumber!: number;
  title!: string;
  description?: string;
  sprintId?: string;
  linkedDocumentIds?: string[];
  linkedRequirementIds?: string[];
  status!: ETaskStatus;
  priority?: EPriority;
  startDate?: string;
  dueDate?: string;
  attachments!: ITaskResponse['attachments'];
  assignee!: ITaskResponse['assignee'];
  reporter!: ITaskResponse['reporter'];
  createdAt!: string;
  updatedAt!: string;
}
