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

  console.log('Seeding Users...');
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

  const aashish = await prisma.user.create({
    data: {
      name: 'Aashish Sharma',
      email: 'aashish@trexobyte.com',
      password: hashedPassword,
      department: 'Content Production',
      roleId: contentShootRole.id,
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2023-06-01'),
    },
  });

  const sneha = await prisma.user.create({
    data: {
      name: 'Sneha Adhikari',
      email: 'sneha@trexobyte.com',
      password: hashedPassword,
      department: 'Social Media',
      roleId: smmRole.id,
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2023-08-10'),
    },
  });

  const rohan = await prisma.user.create({
    data: {
      name: 'Rohan Karki',
      email: 'rohan@trexobyte.com',
      password: hashedPassword,
      department: 'Ads',
      roleId: adsRole.id,
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2024-02-01'),
    },
  });

  const maya = await prisma.user.create({
    data: {
      name: 'Maya Thapa',
      email: 'maya@trexobyte.com',
      password: hashedPassword,
      department: 'Client Servicing',
      roleId: clientCommRole.id,
      avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2023-11-20'),
    },
  });

  const bikash = await prisma.user.create({
    data: {
      name: 'Bikash Gurung',
      email: 'bikash@trexobyte.com',
      password: hashedPassword,
      department: 'Billing',
      roleId: billingRole.id,
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2024-01-05'),
    },
  });

  const prashant = await prisma.user.create({
    data: {
      name: 'Prashant Tamang',
      email: 'prashant@trexobyte.com',
      password: hashedPassword,
      department: 'Content Production',
      roleId: customRole.id,
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2024-03-15'),
    },
  });

  const anjali = await prisma.user.create({
    data: {
      name: 'Anjali Maharjan',
      email: 'anjali@trexobyte.com',
      password: hashedPassword,
      department: 'Social Media',
      roleId: smmRole.id,
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=250&q=80',
      active: true,
      dateJoined: new Date('2024-04-01'),
    },
  });

  console.log('Seeding Clients...');
  const skyPark = await prisma.client.create({
    data: {
      name: 'Sky Park Resort Kathmandu',
      logo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=150&q=80',
      color: '#FF3B00', // Vermillion accent
      servicePackage: 'Full-Stack Growth',
      packageTier: 'Enterprise',
      status: 'ACTIVE',
      monthlyRetainer: 180000,
      startDate: new Date('2024-01-01'),
      billingCycleDay: 1,
    },
  });

  const himalayanBrews = await prisma.client.create({
    data: {
      name: 'Himalayan Brews Coffee',
      logo: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=150&q=80',
      color: '#10B981', // Emerald green
      servicePackage: 'Social & Content',
      packageTier: 'Premium',
      status: 'ACTIVE',
      monthlyRetainer: 95000,
      startDate: new Date('2024-02-15'),
      billingCycleDay: 5,
    },
  });

  const apexTech = await prisma.client.create({
    data: {
      name: 'Apex Tech Academy',
      logo: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=150&q=80',
      color: '#3B82F6', // Blue
      servicePackage: 'Performance Ads & Leads',
      packageTier: 'Standard',
      status: 'ACTIVE',
      monthlyRetainer: 120000,
      startDate: new Date('2024-03-01'),
      billingCycleDay: 10,
    },
  });

  const solteeLiving = await prisma.client.create({
    data: {
      name: 'Soltee Heights Living',
      logo: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=150&q=80',
      color: '#8B5CF6', // Purple
      servicePackage: 'Brand & Social Management',
      packageTier: 'Premium',
      status: 'ACTIVE',
      monthlyRetainer: 150000,
      startDate: new Date('2024-04-10'),
      billingCycleDay: 15,
    },
  });

  const mandapDining = await prisma.client.create({
    data: {
      name: 'Mandap Fine Dining',
      logo: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=150&q=80',
      color: '#F59E0B', // Amber
      servicePackage: 'Social Media Essentials',
      packageTier: 'Basic',
      status: 'PROSPECT',
      monthlyRetainer: 60000,
      startDate: new Date('2024-05-01'),
      billingCycleDay: 20,
    },
  });

  const everestGear = await prisma.client.create({
    data: {
      name: 'Everest Gear Outfitters',
      logo: 'https://images.unsplash.com/photo-1522163182402-834f871fd851?auto=format&fit=crop&w=150&q=80',
      color: '#EC4899', // Pink
      servicePackage: 'Content & Reel Production',
      packageTier: 'Standard',
      status: 'ACTIVE',
      monthlyRetainer: 110000,
      startDate: new Date('2024-06-01'),
      billingCycleDay: 25,
    },
  });

  console.log('Seeding Client Assignments...');
  const assignments = [
    { client: skyPark, user: ketan },
    { client: skyPark, user: aashish },
    { client: skyPark, user: sneha },
    { client: skyPark, user: prashant },
    { client: himalayanBrews, user: sneha },
    { client: himalayanBrews, user: anjali },
    { client: himalayanBrews, user: prashant },
    { client: apexTech, user: rohan },
    { client: apexTech, user: maya },
    { client: solteeLiving, user: aashish },
    { client: solteeLiving, user: sneha },
    { client: solteeLiving, user: maya },
    { client: mandapDining, user: anjali },
    { client: everestGear, user: aashish },
    { client: everestGear, user: rohan },
  ];

  for (const assign of assignments) {
    await prisma.clientAssignment.create({
      data: {
        clientId: assign.client.id,
        userId: assign.user.id,
      },
    });
  }

  console.log('Seeding ContentItems...');
  const now = new Date('2026-10-15T12:00:00Z');
  const year = now.getFullYear();
  const month = now.getMonth();

  const contentSeed = [
    {
      clientId: skyPark.id,
      title: 'Luxury Villa Tour & Sunset Drinks Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 2),
      status: 'PUBLISHED',
      assigneeId: prashant.id,
      clientFeedbackNotes: 'Loved the smooth drone transitions. Approved without changes!',
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: skyPark.id,
      title: 'Weekend Brunch Menu Carousel',
      type: 'CAROUSEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 5),
      status: 'PUBLISHED',
      assigneeId: sneha.id,
      clientFeedbackNotes: 'Great food styling photos.',
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: skyPark.id,
      title: 'Infinity Pool Sunset Shoot Day',
      type: 'SHOOT',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 12),
      status: 'PUBLISHED',
      assigneeId: aashish.id,
      clientFeedbackNotes: 'Raw footage delivered on time.',
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: skyPark.id,
      title: 'Festive Staycation Campaign Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 18),
      status: 'SCHEDULED',
      assigneeId: prashant.id,
      clientFeedbackNotes: 'Voiceover is solid. Ready for auto-post.',
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: skyPark.id,
      title: 'Corporate Event Hall Promo Video',
      type: 'AD_CREATIVE',
      platform: 'FACEBOOK',
      scheduledDate: new Date(year, month, 24),
      status: 'CLIENT_APPROVAL',
      assigneeId: rohan.id,
      clientFeedbackNotes: 'Please tweak the call to action at the end to specify contact number.',
      approvalOutcome: 'REVISION_REQUESTED',
    },
    {
      clientId: skyPark.id,
      title: 'Spa & Wellness Autumn Special',
      type: 'STATIC_POST',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 28),
      status: 'EDITED',
      assigneeId: sneha.id,
    },
    {
      clientId: himalayanBrews.id,
      title: 'Barista Secrets: Cold Brew Prep Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 3),
      status: 'PUBLISHED',
      assigneeId: anjali.id,
      clientFeedbackNotes: 'Hits high engagement! 45k views already.',
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: himalayanBrews.id,
      title: 'New Artisan Pastry Launch Photo Shoot',
      type: 'SHOOT',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 8),
      status: 'PUBLISHED',
      assigneeId: prashant.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: himalayanBrews.id,
      title: 'Morning Vibe Story Series (5 Slides)',
      type: 'STORY',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 15),
      status: 'PUBLISHED',
      assigneeId: sneha.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: himalayanBrews.id,
      title: 'Coffee Beans Origin Story Carousel',
      type: 'CAROUSEL',
      platform: 'LINKEDIN',
      scheduledDate: new Date(year, month, 21),
      status: 'CLIENT_APPROVAL',
      assigneeId: anjali.id,
      clientFeedbackNotes: 'Sent over WhatsApp on Sept 25. Awaiting feedback from CEO.',
    },
    {
      clientId: himalayanBrews.id,
      title: 'Monsoon Latte Art Challenge Reel',
      type: 'REEL',
      platform: 'TIKTOK',
      scheduledDate: new Date(year, month, 27),
      status: 'EDITED',
      assigneeId: prashant.id,
    },
    {
      clientId: himalayanBrews.id,
      title: 'Customer Loyalty Card Announcement',
      type: 'STATIC_POST',
      platform: 'FACEBOOK',
      scheduledDate: new Date(year, month, 30),
      status: 'PLANNED',
      assigneeId: sneha.id,
    },
    {
      clientId: apexTech.id,
      title: 'Full Stack Bootcamp Admissions Ad',
      type: 'AD_CREATIVE',
      platform: 'FACEBOOK',
      scheduledDate: new Date(year, month, 4),
      status: 'PUBLISHED',
      assigneeId: rohan.id,
      clientFeedbackNotes: 'ROAS is sitting at 4.2x. Excellent!',
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: apexTech.id,
      title: 'Alumni Success Story Interview Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 10),
      status: 'PUBLISHED',
      assigneeId: aashish.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: apexTech.id,
      title: 'Tech Career Webinar Lead Gen Ad',
      type: 'AD_CREATIVE',
      platform: 'LINKEDIN',
      scheduledDate: new Date(year, month, 19),
      status: 'CLIENT_APPROVAL',
      assigneeId: rohan.id,
      clientFeedbackNotes: 'Heading looks sharp. Double check targeting budget.',
    },
    {
      clientId: apexTech.id,
      title: 'Campus Life & Lab Tour Shoot',
      type: 'SHOOT',
      platform: 'YOUTUBE',
      scheduledDate: new Date(year, month, 25),
      status: 'SHOT',
      assigneeId: prashant.id,
    },
    {
      clientId: apexTech.id,
      title: 'Python for AI Workshop Banner',
      type: 'STATIC_POST',
      platform: 'LINKEDIN',
      scheduledDate: new Date(year, month, 29),
      status: 'PLANNED',
      assigneeId: sneha.id,
    },
    {
      clientId: solteeLiving.id,
      title: 'Penthouse Apartment Walkthrough Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 7),
      status: 'PUBLISHED',
      assigneeId: aashish.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: solteeLiving.id,
      title: 'Architecture & Interior Photography Shoot',
      type: 'SHOOT',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 14),
      status: 'PUBLISHED',
      assigneeId: prashant.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: solteeLiving.id,
      title: 'Investment Opportunity Carousel Post',
      type: 'CAROUSEL',
      platform: 'FACEBOOK',
      scheduledDate: new Date(year, month, 22),
      status: 'CLIENT_APPROVAL',
      assigneeId: sneha.id,
      clientFeedbackNotes: 'Client wants higher resolution renders included in slide 3.',
      approvalOutcome: 'REVISION_REQUESTED',
    },
    {
      clientId: solteeLiving.id,
      title: 'Resident Testimonial Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 26),
      status: 'EDITED',
      assigneeId: aashish.id,
    },
    {
      clientId: everestGear.id,
      title: 'Trekking Season Equipment Breakdown Reel',
      type: 'REEL',
      platform: 'INSTAGRAM',
      scheduledDate: new Date(year, month, 9),
      status: 'PUBLISHED',
      assigneeId: anjali.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: everestGear.id,
      title: 'Mountain Basecamp Outdoor Shoot',
      type: 'SHOOT',
      platform: 'YOUTUBE',
      scheduledDate: new Date(year, month, 16),
      status: 'PUBLISHED',
      assigneeId: aashish.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: everestGear.id,
      title: 'Dashain Festival Gear Discount Ad',
      type: 'AD_CREATIVE',
      platform: 'FACEBOOK',
      scheduledDate: new Date(year, month, 23),
      status: 'SCHEDULED',
      assigneeId: rohan.id,
      approvalOutcome: 'APPROVED',
    },
    {
      clientId: everestGear.id,
      title: 'Waterproof Jacket Waterproof Test Video',
      type: 'REEL',
      platform: 'TIKTOK',
      scheduledDate: new Date(year, month, 30),
      status: 'PLANNED',
      assigneeId: prashant.id,
    },
  ];

  const createdContentItems = [];
  for (const item of contentSeed) {
    const created = await prisma.contentItem.create({
      data: item,
    });
    createdContentItems.push(created);
  }

  console.log('Seeding Tasks...');
  // Overdue dates (e.g. Sept 20-25 when current date is Sept 27)
  const overdue1 = new Date(year, month, 22);
  const overdue2 = new Date(year, month, 24);
  const today = new Date(year, month, 27);
  const dueSoon = new Date(year, month, 29);
  const dueLater = new Date(year, month, 30);

  const taskSeed = [
    {
      title: 'Fix CTA button text on Sky Park promo video',
      description: 'Client requested WhatsApp number +977-9801234567 in the closing frame.',
      clientId: skyPark.id,
      contentItemId: createdContentItems[4]?.id,
      assigneeId: rohan.id,
      createdById: maya.id,
      dueDate: overdue1, // OVERDUE!
      urgency: 'URGENT',
      status: 'TO_DO',
    },
    {
      title: 'Export raw 4K drone footage for Soltee Living',
      description: 'Upload to Shared Google Drive folder for client review.',
      clientId: solteeLiving.id,
      contentItemId: createdContentItems[18]?.id,
      assigneeId: prashant.id,
      createdById: aashish.id,
      dueDate: overdue2, // OVERDUE!
      urgency: 'HIGH',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Finalize Meta Ads campaign targeting for Apex Tech',
      description: 'Set age bracket 18-32, Kathmandu Valley + Pokhara radius.',
      clientId: apexTech.id,
      contentItemId: createdContentItems[14]?.id,
      assigneeId: rohan.id,
      createdById: ketan.id,
      dueDate: today,
      urgency: 'URGENT',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Review coffee origin carousel text draft',
      description: 'Check spelling of highland coffee region names.',
      clientId: himalayanBrews.id,
      contentItemId: createdContentItems[9]?.id,
      assigneeId: anjali.id,
      createdById: maya.id,
      dueDate: today,
      urgency: 'HIGH',
      status: 'TO_DO',
    },
    {
      title: 'Schedule Monsoon Latte Art reel on TikTok',
      description: 'Add trending music tag #KathmanduCoffee.',
      clientId: himalayanBrews.id,
      contentItemId: createdContentItems[10]?.id,
      assigneeId: sneha.id,
      createdById: aashish.id,
      dueDate: dueSoon,
      urgency: 'MEDIUM',
      status: 'TO_DO',
    },
    {
      title: 'Prepare monthly analytics report for Sky Park',
      description: 'Include total reach, reel views, and ad leads generated.',
      clientId: skyPark.id,
      assigneeId: maya.id,
      createdById: ketan.id,
      dueDate: dueSoon,
      urgency: 'MEDIUM',
      status: 'TO_DO',
    },
    {
      title: 'Send invoice #TB-2026-004 to Apex Tech Academy',
      description: 'Send via PDF email and WhatsApp copy to Finance Head.',
      clientId: apexTech.id,
      assigneeId: bikash.id,
      createdById: ketan.id,
      dueDate: today,
      urgency: 'URGENT',
      status: 'TO_DO',
    },
    {
      title: 'Color grade resident interview clip for Soltee',
      description: 'Apply high-contrast architectural LUT.',
      clientId: solteeLiving.id,
      contentItemId: createdContentItems[20]?.id,
      assigneeId: prashant.id,
      createdById: aashish.id,
      dueDate: dueLater,
      urgency: 'MEDIUM',
      status: 'TO_DO',
    },
    {
      title: 'Backup quarterly shoot assets to NAS drive',
      description: 'Organize by Client Name / Year / Month.',
      assigneeId: aashish.id,
      createdById: ketan.id,
      dueDate: dueLater,
      urgency: 'LOW',
      status: 'TO_DO',
    },
    {
      title: 'Submit pitch deck for Mandap Fine Dining',
      description: 'Complete menu concept proposal.',
      clientId: mandapDining.id,
      assigneeId: maya.id,
      createdById: ketan.id,
      dueDate: dueLater,
      urgency: 'MEDIUM',
      status: 'IN_PROGRESS',
    },
    {
      title: 'Approve Everest Gear Dashain Campaign Creatives',
      description: 'Review banner sizes for FB Feed and Story formats.',
      clientId: everestGear.id,
      contentItemId: createdContentItems[23]?.id,
      assigneeId: ketan.id,
      createdById: rohan.id,
      dueDate: overdue1,
      urgency: 'HIGH',
      status: 'DONE',
      completedDate: new Date(year, month, 23),
    },
    {
      title: 'Order new camera battery pack & lens filter',
      description: 'Reimbursement requested for shoot gear.',
      assigneeId: prashant.id,
      createdById: prashant.id,
      dueDate: new Date(year, month, 15),
      urgency: 'LOW',
      status: 'DONE',
      completedDate: new Date(year, month, 15),
    },
  ];

  for (const task of taskSeed) {
    await prisma.task.create({ data: task });
  }

  console.log('Seeding Invoices & Payments...');
  const inv1 = await prisma.invoice.create({
    data: {
      clientId: skyPark.id,
      invoiceNumber: 'TB-2026-001',
      amount: 180000,
      issueDate: new Date(year, month - 1, 1),
      dueDate: new Date(year, month - 1, 15),
      status: 'PAID',
      billingPeriod: 'August 2026',
      paymentNotes: 'Paid via eSewa Corporate Bank Transfer',
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv1.id,
      amountReceived: 180000,
      paymentDate: new Date(year, month - 1, 10),
      recordedById: bikash.id,
      notes: 'Full payment cleared in Nabil Bank account.',
    },
  });

  const inv2 = await prisma.invoice.create({
    data: {
      clientId: himalayanBrews.id,
      invoiceNumber: 'TB-2026-002',
      amount: 95000,
      issueDate: new Date(year, month - 1, 5),
      dueDate: new Date(year, month - 1, 20),
      status: 'PAID',
      billingPeriod: 'August 2026',
      paymentNotes: 'Paid via Fonepay QR scan',
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv2.id,
      amountReceived: 95000,
      paymentDate: new Date(year, month - 1, 18),
      recordedById: bikash.id,
    },
  });

  const inv3 = await prisma.invoice.create({
    data: {
      clientId: skyPark.id,
      invoiceNumber: 'TB-2026-003',
      amount: 180000,
      issueDate: new Date(year, month, 1),
      dueDate: new Date(year, month, 15),
      status: 'OVERDUE', // OVERDUE for September!
      billingPeriod: 'September 2026',
      paymentNotes: 'Reminder sent to accounts officer on Sept 20',
    },
  });

  await prisma.payment.create({
    data: {
      invoiceId: inv3.id,
      amountReceived: 50000,
      paymentDate: new Date(year, month, 18),
      recordedById: bikash.id,
      notes: 'Partial advance payment received.',
    },
  });

  const inv4 = await prisma.invoice.create({
    data: {
      clientId: apexTech.id,
      invoiceNumber: 'TB-2026-004',
      amount: 120000,
      issueDate: new Date(year, month, 10),
      dueDate: new Date(year, month, 25),
      status: 'SENT',
      billingPeriod: 'September 2026',
    },
  });

  const inv5 = await prisma.invoice.create({
    data: {
      clientId: solteeLiving.id,
      invoiceNumber: 'TB-2026-005',
      amount: 150000,
      issueDate: new Date(year, month, 15),
      dueDate: new Date(year, month, 30),
      status: 'SENT',
      billingPeriod: 'September 2026',
    },
  });

  const inv6 = await prisma.invoice.create({
    data: {
      clientId: everestGear.id,
      invoiceNumber: 'TB-2026-006',
      amount: 110000,
      issueDate: new Date(year, month, 25),
      dueDate: new Date(year, month + 1, 10),
      status: 'DRAFT',
      billingPeriod: 'October 2026',
    },
  });

  console.log('Seeding Activity Logs...');
  const logs = [
    {
      userId: ketan.id,
      action: 'CREATE',
      entityType: 'Client',
      entityId: skyPark.id,
      details: 'Created new enterprise client account Sky Park Resort Kathmandu',
    },
    {
      userId: maya.id,
      action: 'APPROVAL',
      entityType: 'ContentItem',
      entityId: createdContentItems[0]?.id,
      details: 'Logged verbal approval from Sky Park Resort GM for Luxury Villa Tour Reel',
    },
    {
      userId: rohan.id,
      action: 'STATUS_CHANGE',
      entityType: 'ContentItem',
      entityId: createdContentItems[4]?.id,
      details: 'Changed Corporate Event Hall Promo Video status to CLIENT_APPROVAL',
    },
    {
      userId: bikash.id,
      action: 'CREATE',
      entityType: 'Invoice',
      entityId: inv3.id,
      details: 'Generated monthly invoice TB-2026-003 for Sky Park (NPR 180,000)',
    },
  ];

  for (const log of logs) {
    await prisma.activityLog.create({ data: log });
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
