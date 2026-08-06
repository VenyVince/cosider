import { EWorkspaceStatus, EWorkspaceUserRole } from '@cosider/shared';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';

import {
  CreateWorkspaceRequest,
  UpdateWorkspaceRequest,
  WorkspaceDeleteAcceptedResponse,
  WorkspaceDetailResponse,
  WorkspaceResponse,
} from './dto';
import { canManage, isOwner } from './utils/role.util';

import { DB_CONNECTION } from '@/common/constants';
import { FileUploadCompletionRequest } from '@/common/file/dto/file-upload-completion-request.dto';
import { FilesService } from '@/common/file/files.service';
import { type DrizzleDB } from '@/database/drizzle.module';
import { userProfiles, workspaceMembers, workspaces } from '@/database/schema';
import { FileContext, PreparedUpload } from '@/types/file';

@Injectable()
export class WorkspacesService {
  constructor(
    @Inject(DB_CONNECTION) private readonly db: DrizzleDB,
    private readonly filesService: FilesService,
  ) {}

  async createWorkspace(dto: CreateWorkspaceRequest, ownerId: string): Promise<WorkspaceResponse> {
    const workspaceId = uuidv7();

    // 로고가 있는 경우 파일 이동 준비 (트랜잭션 보호 불가로 선행 처리)
    let prepared: PreparedUpload | null = null;
    if (dto.uploadToken) {
      prepared = await this.filesService.prepareUpload(
        ownerId,
        dto.uploadToken,
        (ctx) =>
          this.filesService.buildPermanentObjectKey(
            `workspaces/${workspaceId}`,
            ctx.fileId,
            this.filesService.extractExt(ctx.fileName),
          ),
        {
          maxFileSize: 1024 * 1024 * 10, // 10MB
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
        },
      );
    }

    try {
      const workspace = await this.db.transaction(async (tx) => {
        let logoImageId: string | null = null;

        if (prepared) {
          logoImageId = await this.filesService.insertPreparedFile(tx, prepared, {
            id: workspaceId,
            workspaceId,
          });
        }

        const [created] = await tx
          .insert(workspaces)
          .values({
            id: workspaceId,
            ownerId: ownerId,
            slug: dto.slug,
            name: dto.name,
            description: dto.description,
            logoImageId,
          })
          .returning()
          .catch((e: { code: string }) => {
            if (e.code === '23505') throw new ConflictException('이미 사용중인 slug입니다.');
            throw e;
          });

        if (!created) throw new InternalServerErrorException('워크스페이스 생성에 실패했습니다.');

        await tx.insert(workspaceMembers).values({
          userId: ownerId,
          workspaceId: created.id,
          role: EWorkspaceUserRole.OWNER,
        });

        return created;
      });

      if (prepared) await this.filesService.completeUpload(prepared);

      return {
        slug: workspace.slug,
        name: workspace.name,
        status: workspace.status,
        description: workspace.description ?? '',
        logoImageId: workspace.logoImageId,
        createdAt: workspace.createdAt.toISOString(),
        role: EWorkspaceUserRole.OWNER,
      };
    } catch (err) {
      if (prepared) await this.filesService.rollbackUpload(prepared);
      throw err;
    }
  }

  async getWorkspaceList(userId: string): Promise<WorkspaceResponse[]> {
    const workspaceList = await this.db
      .select({
        slug: workspaces.slug,
        name: workspaces.name,
        status: workspaces.status,
        description: workspaces.description,
        logoImageId: workspaces.logoImageId,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaceMembers.workspaceId, workspaces.id))
      .where(eq(workspaceMembers.userId, userId));

    return workspaceList.map((w) => ({
      slug: w.slug,
      name: w.name,
      status: w.status,
      description: w.description ?? '',
      logoImageId: w.logoImageId,
      createdAt: w.createdAt.toISOString(),
      role: w.role,
    }));
  }

  async getWorkspaceDetail(workspaceId: string, userId: string): Promise<WorkspaceDetailResponse> {
    const [workspace] = await this.db
      .select({
        slug: workspaces.slug,
        name: workspaces.name,
        status: workspaces.status,
        description: workspaces.description,
        logoImageId: workspaces.logoImageId,
        createdAt: workspaces.createdAt,
        role: workspaceMembers.role,
        owner: {
          handle: userProfiles.handle,
          nickname: userProfiles.nickname,
          profileImageId: userProfiles.profileImageId,
        },
      })
      .from(workspaces)
      .innerJoin(workspaceMembers, eq(workspaces.id, workspaceMembers.workspaceId))
      .innerJoin(userProfiles, eq(workspaces.ownerId, userProfiles.userId))
      .where(and(eq(workspaces.id, workspaceId), eq(workspaceMembers.userId, userId)));

    if (!workspace) {
      throw new NotFoundException('존재하지 않는 워크스페이스입니다.');
    }

    return {
      slug: workspace.slug,
      name: workspace.name,
      status: workspace.status,
      description: workspace.description ?? '',
      logoImageId: workspace.logoImageId,
      createdAt: workspace.createdAt.toISOString(),
      role: workspace.role,
      owner: {
        handle: workspace.owner.handle,
        nickname: workspace.owner.nickname ?? '',
        profileImageId: workspace.owner.profileImageId,
      },
      projects: [], // TODO: 프로젝트 정보로 교체
    };
  }

  async updateWorkspace(
    workspaceId: string,
    dto: UpdateWorkspaceRequest,
    userId: string,
  ): Promise<WorkspaceResponse> {
    const member = await this.findMemberOrThrow(workspaceId, userId);

    if (!canManage(member.role, EWorkspaceUserRole.ADMIN)) {
      throw new ForbiddenException('워크스페이스를 수정할 권한이 없습니다.');
    }

    const [updatedWorkspace] = await this.db
      .update(workspaces)
      .set({
        name: dto.name,
        description: dto.description,
        slug: dto.slug,
      })
      .where(eq(workspaces.id, member.workspaceId))
      .returning()
      .catch((e: { code?: string }) => {
        if (e.code === '23505') {
          throw new ConflictException('이미 사용중인 slug입니다.');
        }
        throw e;
      });

    if (!updatedWorkspace) {
      throw new NotFoundException('존재하지 않는 워크스페이스입니다.');
    }

    return {
      slug: updatedWorkspace.slug,
      name: updatedWorkspace.name,
      status: updatedWorkspace.status,
      description: updatedWorkspace.description ?? '',
      logoImageId: updatedWorkspace.logoImageId,
      createdAt: updatedWorkspace.createdAt.toISOString(),
      role: member.role,
    };
  }

  async deleteWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceDeleteAcceptedResponse> {
    const member = await this.findMemberOrThrow(workspaceId, userId);

    if (!isOwner(member.role)) {
      throw new ForbiddenException('워크스페이스를 삭제할 권한이 없습니다.');
    }

    const [deletedWorkspace] = await this.db
      .update(workspaces)
      .set({
        status: EWorkspaceStatus.DELETE_PENDING,
        deletedAt: new Date(),
        scheduledDeleteAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30일 후 (FRID-32 기준)
      })
      .where(eq(workspaces.id, member.workspaceId))
      .returning();

    if (!deletedWorkspace) {
      throw new NotFoundException('존재하지 않는 워크스페이스입니다.');
    }

    return {
      slug: deletedWorkspace.slug,
      status: EWorkspaceStatus.DELETE_PENDING,
      deletedAt: deletedWorkspace.deletedAt!.toISOString(),
      scheduledDeleteAt: deletedWorkspace.scheduledDeleteAt!.toISOString(),
    };
  }

  async restoreWorkspace(workspaceId: string, userId: string): Promise<void> {
    const member = await this.findMemberOrThrow(workspaceId, userId);

    if (!isOwner(member.role)) {
      throw new ForbiddenException('워크스페이스를 복구할 권한이 없습니다.');
    }

    const [restoredWorkspace] = await this.db
      .update(workspaces)
      .set({
        status: EWorkspaceStatus.ACTIVE,
        deletedAt: null,
        scheduledDeleteAt: null,
      })
      .where(eq(workspaces.id, member.workspaceId))
      .returning();

    if (!restoredWorkspace) {
      throw new NotFoundException('존재하지 않는 워크스페이스입니다.');
    }
  }

  // 워크스페이스 멤버 조회 및 권한 체크
  private async findMemberOrThrow(workspaceId: string, userId: string) {
    const [member] = await this.db
      .select({ role: workspaceMembers.role, workspaceId: workspaceMembers.workspaceId })
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      );

    if (!member) {
      throw new NotFoundException('존재하지 않는 워크스페이스이거나 접근 권한이 없습니다.');
    }

    return member;
  }

  async updateWorkspaceLogo(
    workspaceId: string,
    dto: FileUploadCompletionRequest,
    userId: string,
  ): Promise<void> {
    const member = await this.findMemberOrThrow(workspaceId, userId);

    if (!isOwner(member.role)) {
      throw new ForbiddenException('로고를 수정할 권한이 없습니다.');
    }

    if (!dto.uploadToken) {
      throw new BadRequestException('uploadToken이 필요합니다');
    }

    const prepared = await this.filesService.prepareUpload(
      userId,
      dto.uploadToken,
      (ctx) =>
        this.filesService.buildPermanentObjectKey(
          `workspaces/${workspaceId}`,
          ctx.fileId,
          this.filesService.extractExt(ctx.fileName),
        ),
      {
        maxFileSize: 1024 * 1024 * 10, // 10MB
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      },
    );

    const context: FileContext = {
      id: workspaceId,
      workspaceId,
    };

    try {
      await this.db.transaction(async (tx) => {
        await this.filesService.insertPreparedFile(tx, prepared, context);

        await tx
          .update(workspaces)
          .set({ logoImageId: prepared.fileId })
          .where(eq(workspaces.id, workspaceId));
      });

      await this.filesService.completeUpload(prepared);
    } catch (err) {
      await this.filesService.rollbackUpload(prepared);
      throw err;
    }
  }
}
