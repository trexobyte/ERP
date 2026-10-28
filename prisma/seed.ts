import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing existing data...');
  await prisma.activityLog.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.task.deleteMany();
  await prisma.contentItem.deleteMany();
  await prisma.clientAssignment.deleteMany();
  await prisma.client.deleteMany();
  await prisma.user.deleteMany();
  await prisma.role.deleteMany();

  console.log('Seeding Roles...');
  const superAdminRole = await prisma.role.create({
    data: {
      name: 'Super Admin',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'full',
        calendar: 'full',
        clients: 'full',
        tracker: 'full',
        tasks: 'full',
        billing: 'full',
        reports: 'full',
        users: 'full',
      }),
    },
  });

  const managerRole = await prisma.role.create({
    data: {
      name: 'Manager',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'full',
        calendar: 'full',
        clients: 'edit',
        tracker: 'full',
        tasks: 'full',
        billing: 'view',
        reports: 'full',
        users: 'view',
      }),
    },
  });

  const smmRole = await prisma.role.create({
    data: {
      name: 'Social Media Manager',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'view',
        calendar: 'edit',
        clients: 'view',
        tracker: 'edit',
        tasks: 'edit',
        billing: 'none',
        reports: 'view',
        users: 'none',
      }),
    },
  });

  const contentShootRole = await prisma.role.create({
    data: {
      name: 'Content/Shoot Manager',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'view',
        calendar: 'full',
        clients: 'view',
        tracker: 'full',
        tasks: 'full',
        billing: 'none',
        reports: 'view',
        users: 'none',
      }),
    },
  });

  const adsRole = await prisma.role.create({
    data: {
      name: 'Ads Manager',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'view',
        calendar: 'edit',
        clients: 'view',
        tracker: 'edit',
        tasks: 'edit',
        billing: 'none',
        reports: 'view',
        users: 'none',
      }),
    },
  });

  const clientCommRole = await prisma.role.create({
    data: {
      name: 'Client Communication',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'view',
        calendar: 'view',
        clients: 'edit',
        tracker: 'edit',
        tasks: 'edit',
        billing: 'none',
        reports: 'view',
        users: 'none',
      }),
    },
  });

  const billingRole = await prisma.role.create({
    data: {
      name: 'Billing/Finance',
      isCustom: false,
      permissions: JSON.stringify({
        dashboard: 'view',
        calendar: 'view',
        clients: 'view',
        tracker: 'view',
        tasks: 'view',
        billing: 'full',
        reports: 'full',
        users: 'none',
      }),
    },
  });

  const customRole = await prisma.role.create({
    data: {
      name: 'Lead Creator & Videographer',
      isCustom: true,
      permissions: JSON.stringify({
        dashboard: 'view',
        calendar: 'full',
        clients: 'view',
        tracker: 'full',
        tasks: 'full',
        billing: 'none',
        reports: 'none',
        users: 'none',
      }),
    },
  });

  console.log('Seeding Super Admins...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  const ketan = await prisma.user.create({
    data: {
      name: 'Ketan Shrestha',
      email: 'ketan@trexobyte.com',
      password: hashedPassword,
      department: 'Management',
      roleId: superAdminRole.id,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2023-01-15'),
    },
  });

  const roshan = await prisma.user.create({
    data: {
      name: 'Roshan Thapa',
      email: 'thaparoshan2080@gmail.com',
      password: hashedPassword,
      department: 'Management',
      roleId: superAdminRole.id,
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2023-01-15'),
    },
  });

  console.log('Seed completed successfully with Super Admins Ketan & Roshan!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
