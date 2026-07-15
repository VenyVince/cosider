import { IFileMetadata, ITaskParticipantResponse } from '@cosider/shared';
import { NotFoundException } from '@nestjs/common';

import { TaskResponseDto } from './dto';
import type { DBTaskRowFromITask } from './tasks.types';

export function mapTaskRowToDto(
  row: DBTaskRowFromITask,
  linkedRequirementIds: string[] | undefined,
  assignee: ITaskParticipantResponse,
  reporter: ITaskParticipantResponse,
  attachments: IFileMetadata[],
): TaskResponseDto {
  if (!row.createdAt) {
    throw new NotFoundException('Task createdAt not found');
  }

  if (!row.updatedAt) {
    throw new NotFoundException('Task updatedAt not found');
  }

  return {
    id: row.id,
    taskNumber: row.taskNumber,
    title: row.title,
    description: row.description ?? undefined,
    sprintId: row.sprintId ?? undefined,
    linkedDocumentIds: row.linkedDocumentId ? [row.linkedDocumentId] : [],
    linkedRequirementIds: linkedRequirementIds ?? [],
    status: row.status,
    priority: row.priority ?? undefined,
    startDate: row.startDate ? row.startDate.toISOString() : undefined,
    dueDate: row.dueDate ? row.dueDate.toISOString() : undefined,
    attachments,
    assignee,
    reporter,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
