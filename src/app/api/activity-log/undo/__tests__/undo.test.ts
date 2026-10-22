import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

vi.mock('@/lib/deleted-clients', () => ({
  unmarkClientDeleted: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    activityLog: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    client: {
      update: vi.fn(),
      create: vi.fn(),
    },
    task: {
      update: vi.fn(),
    },
    contentItem: {
      update: vi.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { unmarkClientDeleted } from '@/lib/deleted-clients';

describe('POST /api/activity-log/undo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createRequest(body: any): Request {
    return new Request('http://localhost:3000/api/activity-log/undo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  it('returns 401 when user is not authenticated', async () => {
    (getServerSession as any).mockResolvedValueOnce(null);

    const req = createRequest({ logId: 'log-1' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 400 when logId is omitted', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-admin', name: 'Admin' },
    });

    const req = createRequest({});
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('Activity Log ID is required');
  });

  it('returns 404 when activity log record does not exist', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-admin' },
    });
    (prisma.activityLog.findUnique as any).mockResolvedValueOnce(null);

    const req = createRequest({ logId: 'nonexistent-log' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(404);
    expect(data.error).toBe('Activity log record not found');
  });

  it('returns 400 when activity log has no previousState snapshot', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-admin' },
    });
    (prisma.activityLog.findUnique as any).mockResolvedValueOnce({
      id: 'log-1',
      previousState: null,
    });

    const req = createRequest({ logId: 'log-1' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe('No undo snapshot available for this activity');
  });

  it('successfully restores a soft-deleted client and unmarks memory cache', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-admin' },
    });
    (prisma.activityLog.findUnique as any).mockResolvedValueOnce({
      id: 'log-del',
      entityType: 'Client',
      entityId: 'client-101',
      action: 'DELETE',
      details: 'Deleted client Sky Park Resort',
      previousState: JSON.stringify({
        id: 'client-101',
        name: 'Sky Park Resort',
        monthlyRetainer: 180000,
      }),
    });
    (prisma.client.update as any).mockResolvedValueOnce({ id: 'client-101', deletedAt: null });
    (prisma.activityLog.create as any).mockResolvedValueOnce({ id: 'new-log' });

    const req = createRequest({ logId: 'log-del' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-101' },
      data: { deletedAt: null },
    });
    expect(unmarkClientDeleted).toHaveBeenCalledWith('client-101');
    expect(prisma.activityLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: 'UNDO',
          entityType: 'Client',
          entityId: 'client-101',
        }),
      })
    );
  });

  it('successfully undos a client update by restoring field snapshot', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-admin' },
    });
    (prisma.activityLog.findUnique as any).mockResolvedValueOnce({
      id: 'log-upd',
      entityType: 'Client',
      entityId: 'client-202',
      action: 'UPDATE',
      details: 'Updated retainer from 95000 to 120000',
      previousState: JSON.stringify({
        name: 'Himalayan Brews',
        logo: 'logo.png',
        color: '#10B981',
        servicePackage: 'Social & Content',
        packageTier: 'Premium',
        status: 'ACTIVE',
        monthlyRetainer: 95000,
        billingCycleDay: 5,
      }),
    });
    (prisma.client.update as any).mockResolvedValueOnce({ id: 'client-202' });
    (prisma.activityLog.create as any).mockResolvedValueOnce({ id: 'new-log' });

    const req = createRequest({ logId: 'log-upd' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.client.update).toHaveBeenCalledWith({
      where: { id: 'client-202' },
      data: {
        name: 'Himalayan Brews',
        logo: 'logo.png',
        color: '#10B981',
        servicePackage: 'Social & Content',
        packageTier: 'Premium',
        status: 'ACTIVE',
        monthlyRetainer: 95000,
        billingCycleDay: 5,
      },
    });
  });

  it('successfully undos a task status change', async () => {
    (getServerSession as any).mockResolvedValueOnce({
      user: { id: 'user-admin' },
    });
    (prisma.activityLog.findUnique as any).mockResolvedValueOnce({
      id: 'log-task',
      entityType: 'Task',
      entityId: 'task-303',
      action: 'UPDATE',
      details: 'Marked task as DONE',
      previousState: JSON.stringify({
        status: 'IN_PROGRESS',
        title: 'Edit Reel 4',
        urgency: 'HIGH',
      }),
    });
    (prisma.task.update as any).mockResolvedValueOnce({ id: 'task-303' });
    (prisma.activityLog.create as any).mockResolvedValueOnce({ id: 'new-log' });

    const req = createRequest({ logId: 'log-task' });
    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.task.update).toHaveBeenCalledWith({
      where: { id: 'task-303' },
      data: {
        status: 'IN_PROGRESS',
        title: 'Edit Reel 4',
        urgency: 'HIGH',
      },
    });
  });
});
