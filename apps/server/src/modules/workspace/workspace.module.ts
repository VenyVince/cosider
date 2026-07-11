import { Module } from '@nestjs/common';

import { UserModule } from '../user/users.module';

import { ParseWorkspaceSlugPipe } from './pipes/parse-workspace-slug.pipe';
import { WorkspaceMembersController } from './workspace-member.controller';
import { WorkspaceMembersService } from './workspace-member.service';
import { WorkspacesController } from './workspace.controller';
import { WorkspacesService } from './workspace.service';

import { FilesModule } from '@/common/file/files.module';

@Module({
  imports: [UserModule, FilesModule],
  controllers: [WorkspacesController, WorkspaceMembersController],
  providers: [WorkspacesService, WorkspaceMembersService, ParseWorkspaceSlugPipe],
  exports: [ParseWorkspaceSlugPipe],
})
export class WorkspacesModule {}
