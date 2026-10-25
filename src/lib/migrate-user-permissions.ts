import { prisma } from '@/lib/prisma';
import { getRoleDefaultGranularPermissions } from '@/lib/permissions';

export async function migrateUserPermissions() {
  const users = await prisma.user.findMany({
    include: { role: true },
  });

  const unmigrated = users.filter((u) => !u.permissions);
  if (unmigrated.length > 0) {
    await prisma.$transaction(
      unmigrated.map((u) => {
        const defaultGranular = getRoleDefaultGranularPermissions(u.role?.permissions || u.role?.name);
        return prisma.user.update({
          where: { id: u.id },
          data: { permissions: JSON.stringify(defaultGranular) },
        });
      })
    );
  }

  return { total: users.length, migrated: unmigrated.length };
}
