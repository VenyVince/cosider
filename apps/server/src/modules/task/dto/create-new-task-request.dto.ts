import { EPriority, ETaskStatus, ICreateNewTaskRequest } from '@cosider/shared';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateNewTaskRequestDto implements ICreateNewTaskRequest {
  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  assigneeHandle?: string;

  @IsUUID('all')
  @IsOptional()
  sprintId?: string;

  @IsUUID('all')
  @IsOptional()
  linkedDocumentId?: string;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  linkedRequirementIds?: string[];

  @IsEnum(ETaskStatus)
  @IsNotEmpty()
  status!: ETaskStatus;

  @IsEnum(EPriority)
  @IsOptional()
  priority?: EPriority;

  @IsDateString()
  @IsOptional()
  startDate?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;
}
