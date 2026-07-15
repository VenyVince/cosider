import { ITask } from '@cosider/shared';

export type DBTaskRowFromITask = Omit<
  ITask,
  'startDate' | 'dueDate' | 'createdAt' | 'updatedAt'
> & {
  startDate: Date | null;
  dueDate: Date | null;
  createdAt?: Date | null;
  updatedAt?: Date | null;
};
