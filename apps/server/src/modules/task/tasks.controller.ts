import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { CurrentUser } from '../auth/decorator';

import { CreateNewTaskRequestDto, TaskResponseDto, UpdateTaskRequestDto } from './dto';
import { TasksService } from './tasks.service';

import type { AuthenticatedUser } from '@/types/auth/auth.type';

@Controller('api/v1/workspaces/:workspace_slug/projects/:project_key/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  // Task 생성
  @Post()
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspace_slug') workspaceSlug: string,
    @Param('project_key') projectKey: string,
    @Body() createTaskDto: CreateNewTaskRequestDto,
  ): Promise<TaskResponseDto> {
    return await this.tasksService.create(user.userId, workspaceSlug, projectKey, createTaskDto);
  }

  // Task 목록 조회
  @Get()
  async findAll(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspace_slug') workspaceSlug: string,
    @Param('project_key') projectKey: string,
  ): Promise<TaskResponseDto[]> {
    return await this.tasksService.findAll(user.userId, workspaceSlug, projectKey);
  }

  // Task 상세 조회
  @Get(':task_number')
  async findOne(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspace_slug') workspaceSlug: string,
    @Param('project_key') projectKey: string,
    @Param('task_number', ParseIntPipe) taskNumber: number,
  ): Promise<TaskResponseDto> {
    return await this.tasksService.findOne(user.userId, workspaceSlug, projectKey, taskNumber);
  }

  // Task 수정
  @Patch(':task_number')
  async update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspace_slug') workspaceSlug: string,
    @Param('project_key') projectKey: string,
    @Param('task_number', ParseIntPipe) taskNumber: number,
    @Body() updateTaskDto: UpdateTaskRequestDto,
  ): Promise<TaskResponseDto> {
    return await this.tasksService.update(
      user.userId,
      workspaceSlug,
      projectKey,
      taskNumber,
      updateTaskDto,
    );
  }

  // Task 삭제
  @Delete(':task_number')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('workspace_slug') workspaceSlug: string,
    @Param('project_key') projectKey: string,
    @Param('task_number', ParseIntPipe) taskNumber: number,
  ): Promise<void> {
    await this.tasksService.remove(user.userId, workspaceSlug, projectKey, taskNumber);
  }
}
