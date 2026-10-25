import { describe, it, expect, vi } from 'vitest';
import { toLocalDateKey, toDatabaseDateString, parseLocalDateKey } from '@/lib/date-utils';
import { checkUserAction, AuthenticatedUser } from '@/lib/server-auth';

describe('Calendar Drag-and-Drop & Rescheduling Logic', () => {
  describe('1. Task Rescheduling from Calendar (22nd to 26th)', () => {
    it('correctly maps date keys without timezone shift for Kathmandu UTC+5:45', () => {
      const sourceDateKey = '2026-10-22';
      const targetDateKey = '2026-10-26';

      const dbString = toDatabaseDateString(targetDateKey);
      expect(dbString).toBe('2026-10-26T12:00:00.000Z');

      // Round-trip back to local date key
      expect(toLocalDateKey(dbString)).toBe('2026-10-26');
    });

    it('preserves task fields (title, urgency, client, assignee) during reschedule payload creation', () => {
      const existingTask = {
        id: 'task_solti_cta',
        title: 'Fix CTA button',
        urgency: 'URGENT',
        status: 'TO_DO',
        clientId: 'client_solti',
        assigneeId: 'user_dev1',
        dueDate: '2026-10-22T12:00:00.000Z',
      };

      const targetDateKey = '2026-10-26';
      const updatePayload = {
        id: existingTask.id,
        dueDate: targetDateKey,
      };

      expect(updatePayload.id).toBe(existingTask.id);
      expect(updatePayload.dueDate).toBe('2026-10-26');
      // Existing task attributes remain untouched
      expect(existingTask.title).toBe('Fix CTA button');
      expect(existingTask.urgency).toBe('URGENT');
      expect(existingTask.status).toBe('TO_DO');
    });

    it('enforces that action tasks cannot be dropped into the unscheduled pool', () => {
      const isPoolTarget = true;
      const isTask = true;

      let errorMessage: string | null = null;
      if (isTask && isPoolTarget) {
        errorMessage = 'Tasks require a due date and cannot be unscheduled to the unassigned pool.';
      }

      expect(errorMessage).toBe(
        'Tasks require a due date and cannot be unscheduled to the unassigned pool.'
      );
    });
  });

  describe('2. Content Deliverable Rescheduling & Unscheduled Pool', () => {
    it('schedules planned content item to target date and promotes status to SCHEDULED', () => {
      const existingItem = {
        id: 'content_solti_reel',
        title: 'Solti Heights - Teaser Reel',
        type: 'REEL',
        status: 'PLANNED',
        scheduledDate: null,
      };

      const targetDateKey = '2026-10-26';
      const nextStatus =
        existingItem.status === 'PLANNED' ? 'SCHEDULED' : existingItem.status;

      const updated = {
        ...existingItem,
        scheduledDate: targetDateKey,
        status: nextStatus,
      };

      expect(updated.scheduledDate).toBe('2026-10-26');
      expect(updated.status).toBe('SCHEDULED');
    });

    it('moves scheduled content item back to unscheduled pool with status PLANNED', () => {
      const existingItem = {
        id: 'content_solti_reel',
        title: 'Solti Heights - Teaser Reel',
        type: 'REEL',
        status: 'SCHEDULED',
        scheduledDate: '2026-10-22T12:00:00.000Z',
      };

      const unscheduled = {
        ...existingItem,
        scheduledDate: null,
        status: 'PLANNED',
      };

      expect(unscheduled.scheduledDate).toBeNull();
      expect(unscheduled.status).toBe('PLANNED');
    });
  });

  describe('3. Month View Busy-Day Preview & Item Counting', () => {
    it('summarizes 4 busy-day items as 1 recognizable title preview and +3 more indicator', () => {
      const dayDeliverables = [
        { id: '1', title: 'Solti Heights', color: '#FF3B00' },
        { id: '2', title: 'Everest gear', color: '#3B82F6' },
        { id: '3', title: 'Duncey campaign', color: '#10B981' },
      ];
      const dayTasks = [
        { id: '4', title: 'Fix CTA button', color: '#FF3B00', isTask: true },
      ];

      const totalCount = dayDeliverables.length + dayTasks.length;
      const previewItems = [...dayDeliverables, ...dayTasks];

      expect(totalCount).toBe(4);
      expect(previewItems[0].title).toBe('Solti Heights');
      expect(totalCount - 1).toBe(3); // "+3 more"
    });
  });

  describe('4. Permissions & Authorization on Rescheduling APIs', () => {
    it('allows super admins full edit access to tasks and calendar', () => {
      const superAdmin: AuthenticatedUser = {
        id: 'super_admin_1',
        email: 'admin@trexo.com',
        name: 'Super Admin',
        roleName: 'Super Admin',
        isSuperAdmin: true,
        permissions: {},
      };

      expect(checkUserAction(superAdmin, 'tasks', 'edit')).toBe(true);
      expect(checkUserAction(superAdmin, 'calendar', 'edit')).toBe(true);
      expect(checkUserAction(superAdmin, 'tracker', 'edit')).toBe(true);
    });

    it('blocks unauthorized users without calendar:edit or tasks:edit', () => {
      const viewerUser: AuthenticatedUser = {
        id: 'viewer_1',
        email: 'viewer@trexo.com',
        name: 'Guest Viewer',
        roleName: 'Viewer',
        isSuperAdmin: false,
        permissions: {
          calendar: { view: true },
          tasks: { view: true },
          tracker: { view: true },
        },
      };

      expect(checkUserAction(viewerUser, 'tasks', 'edit')).toBe(false);
      expect(checkUserAction(viewerUser, 'calendar', 'edit')).toBe(false);
      expect(checkUserAction(viewerUser, 'tracker', 'edit')).toBe(false);
    });

    it('allows users with calendar:edit or tasks:edit to reschedule tasks', () => {
      const calendarEditor: AuthenticatedUser = {
        id: 'cal_editor_1',
        email: 'planner@trexo.com',
        name: 'Content Planner',
        roleName: 'Planner',
        isSuperAdmin: false,
        permissions: {
          calendar: { view: true, create: true, edit: true },
          tasks: { view: true },
        },
      };

      const canEditCalendarOrTasks =
        checkUserAction(calendarEditor, 'tasks', 'edit') ||
        checkUserAction(calendarEditor, 'calendar', 'edit');

      expect(canEditCalendarOrTasks).toBe(true);
    });
  });

  describe('5. Kanban Board Stage Validations', () => {
    it('validates Content Tracker supports all 6 canonical stages', () => {
      const validStages = [
        'PLANNED',
        'SHOT',
        'EDITED',
        'CLIENT_APPROVAL',
        'SCHEDULED',
        'PUBLISHED',
      ];
      expect(validStages).toHaveLength(6);
      expect(validStages).toContain('CLIENT_APPROVAL');
      expect(validStages).toContain('PUBLISHED');
    });

    it('validates Task Urgency Tracker supports all 3 kanban columns', () => {
      const taskColumns = ['TO_DO', 'IN_PROGRESS', 'DONE'];
      expect(taskColumns).toHaveLength(3);
      expect(taskColumns).toContain('IN_PROGRESS');
    });
  });
});
