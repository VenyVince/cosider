import {
  Injectable,
  Inject,
  NotFoundException,
  GoneException,
  UnauthorizedException,
} from '@nestjs/common';
import { eq } from 'drizzle-orm';

import { DB_CONNECTION } from '@/common/constants';
import { type DrizzleDB } from '@/database/drizzle.module';
import { users, userProfiles, workspaceMembers, workspaceInvitations } from '@/database/schema';
import type { AuthenticatedUser } from '@/types/auth/auth.type';

@Injectable()
export class WorkspaceInvitationsService {
  constructor(@Inject(DB_CONNECTION) private readonly db: DrizzleDB) {}

  async checkInvitation(token: string): Promise<void> {
    const [invitation] = await this.db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token));

    if (!invitation) throw new NotFoundException('존재하지 않는 초대입니다.');

    if (invitation.expiresAt < new Date()) {
      throw new GoneException('만료된 초대 링크입니다.');
    }

    if (invitation.acceptedAt) {
      throw new GoneException('이미 수락된 초대입니다.');
    }
  }

  async acceptInvitation(token: string, user: AuthenticatedUser): Promise<void> {
    const [invitation] = await this.db
      .select()
      .from(workspaceInvitations)
      .where(eq(workspaceInvitations.token, token));

    if (!invitation) throw new NotFoundException('존재하지 않는 초대입니다.');

    if (invitation.expiresAt < new Date()) {
      throw new GoneException('만료된 초대 링크입니다.');
    }

    if (invitation.acceptedAt) {
      throw new GoneException('이미 수락된 초대입니다.');
    }

    // target이 이메일인지 handle인지 확인 후 본인 검증
    const isEmail = invitation.target.includes('@');

    if (isEmail) {
      const [targetUser] = await this.db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, user.userId));

      if (targetUser?.email !== invitation.target) {
        throw new UnauthorizedException('초대받은 대상이 아닙니다.');
      }
    } else {
      const [profile] = await this.db
        .select({ handle: userProfiles.handle })
        .from(userProfiles)
        .where(eq(userProfiles.userId, user.userId));

      if (profile?.handle !== invitation.target) {
        throw new UnauthorizedException('초대받은 대상이 아닙니다.');
      }
    }

    // 트랜잭션으로 멤버 추가 + acceptedAt 업데이트
    await this.db.transaction(async (tx) => {
      await tx.insert(workspaceMembers).values({
        workspaceId: invitation.workspaceId!,
        userId: user.userId,
        role: invitation.role,
      });

      await tx
        .update(workspaceInvitations)
        .set({ acceptedAt: new Date() })
        .where(eq(workspaceInvitations.token, token));
    });
  }
}
