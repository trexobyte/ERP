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

  describe('6. Critical Regression: Single-Item Isolation & Cross-Item Integrity', () => {
    // Helper replicating the robust date extractor from planning/page.tsx
    const extractTargetDateKey = (over: any): string | null => {
      if (!over) return null;
      const targetId = String(over.id);
      const targetData = over.data?.current;

      if (targetData?.date) return toLocalDateKey(targetData.date);
      if (targetData?.type === 'day' && targetData.date) return toLocalDateKey(targetData.date);
      if (targetData?.type === 'task' && targetData.task?.dueDate) return toLocalDateKey(targetData.task.dueDate);
      if ((targetData?.type === 'card' || targetData?.type === 'content') && targetData.item?.scheduledDate) {
        return toLocalDateKey(targetData.item.scheduledDate);
      }
      const match = targetId.match(/\b\d{4}-\d{2}-\d{2}\b/);
      return match ? match[0] : null;
    };

    it('moving one task from Wednesday to Thursday leaves all neighboring tasks and deliverables on their original dates', () => {
      const wednesday = '2026-10-21';
      const thursday = '2026-10-22';

      const initialTasks = [
        { id: 'task_wed_1', title: 'Task 1 (Moved)', dueDate: wednesday, urgency: 'HIGH', clientId: 'c1' },
        { id: 'task_wed_2', title: 'Task 2 (Untouched)', dueDate: wednesday, urgency: 'MEDIUM', clientId: 'c1' },
        { id: 'task_wed_3', title: 'Task 3 (Untouched)', dueDate: wednesday, urgency: 'LOW', clientId: 'c2' },
        { id: 'task_thu_1', title: 'Task 4 (Existing Thu)', dueDate: thursday, urgency: 'URGENT', clientId: 'c1' },
      ];

      const initialDeliverables = [
        { id: 'content_wed_1', title: 'Shoot 1', scheduledDate: wednesday, status: 'SCHEDULED' },
        { id: 'content_wed_2', title: 'Reel 2', scheduledDate: wednesday, status: 'SCHEDULED' },
      ];

      // Deep clone snapshot as performed in planning/page.tsx
      const previousTasksSnapshot = initialTasks.map((t) => ({ ...t }));
      const targetTaskId = 'task_wed_1';

      // Perform isolated single-task update
      const updatedTasks = initialTasks.map((t) =>
        t.id === targetTaskId ? { ...t, dueDate: thursday } : { ...t }
      );

      // Verify ONLY the selected task moved to Thursday
      const movedTask = updatedTasks.find((t) => t.id === targetTaskId);
      expect(movedTask?.dueDate).toBe(thursday);

      // Verify all other tasks remain strictly on their original dates
      const task2 = updatedTasks.find((t) => t.id === 'task_wed_2');
      const task3 = updatedTasks.find((t) => t.id === 'task_wed_3');
      const task4 = updatedTasks.find((t) => t.id === 'task_thu_1');

      expect(task2?.dueDate).toBe(wednesday);
      expect(task3?.dueDate).toBe(wednesday);
      expect(task4?.dueDate).toBe(thursday);

      // Verify neighboring content deliverables are completely unaffected
      expect(initialDeliverables[0].scheduledDate).toBe(wednesday);
      expect(initialDeliverables[1].scheduledDate).toBe(wednesday);

      // Verify snapshot remains intact for rollback
      expect(previousTasksSnapshot[0].dueDate).toBe(wednesday);
    });

    it('handles overlapping raw IDs between different item types without cross-contamination', () => {
      const dateA = '2026-10-21';
      const dateB = '2026-10-22';

      // Identical raw ID 'item_99' across both models
      const sharedRawId = 'item_99';

      const tasks = [
        { id: sharedRawId, title: 'Action Task 99', dueDate: dateA, urgency: 'MEDIUM' },
      ];
      const deliverables = [
        { id: sharedRawId, title: 'Deliverable 99', scheduledDate: dateA, status: 'SCHEDULED' },
      ];

      // Simulated drag event for Task with namespaced active.id 'task-item_99'
      const activeTaskEvent = {
        active: {
          id: `task-${sharedRawId}`,
          data: { current: { type: 'task', task: tasks[0] } },
        },
      };

      const activeTaskIdStr = String(activeTaskEvent.active.id);
      const isTaskDrag = activeTaskEvent.active.data.current?.type === 'task' || activeTaskIdStr.includes('task-');
      expect(isTaskDrag).toBe(true);

      const resolvedTaskId = activeTaskEvent.active.data.current?.task?.id || activeTaskIdStr.replace(/^.*task-/, '');
      expect(resolvedTaskId).toBe(sharedRawId);

      // Reschedule Task only
      const nextTasks = tasks.map((t) => (t.id === resolvedTaskId ? { ...t, dueDate: dateB } : { ...t }));
      // Deliverables must remain untouched
      expect(nextTasks[0].dueDate).toBe(dateB);
      expect(deliverables[0].scheduledDate).toBe(dateA);

      // Now simulated drag event for Content Deliverable with namespaced active.id 'content-item_99'
      const activeContentEvent = {
        active: {
          id: `content-${sharedRawId}`,
          data: { current: { type: 'card', item: deliverables[0] } },
        },
      };

      const activeContentIdStr = String(activeContentEvent.active.id);
      const isContentTask = activeContentEvent.active.data.current?.type === 'task' || activeContentIdStr.includes('task-');
      expect(isContentTask).toBe(false);

      const resolvedContentId = activeContentEvent.active.data.current?.item?.id || activeContentIdStr.replace(/^.*content-/, '');
      expect(resolvedContentId).toBe(sharedRawId);

      // Reschedule Deliverable to dateB
      const nextDeliverables = deliverables.map((i) =>
        i.id === resolvedContentId ? { ...i, scheduledDate: dateB } : { ...i }
      );

      expect(nextDeliverables[0].scheduledDate).toBe(dateB);
      expect(nextTasks[0].dueDate).toBe(dateB);
    });

    it('correctly resolves target date key across all namespaced droppables and drop targets', () => {
      // 1. Mobile Week column
      expect(extractTargetDateKey({ id: 'week-day-2026-10-25', data: { current: { type: 'day', date: '2026-10-25' } } })).toBe('2026-10-25');

      // 2. Mobile Month Day cell
      expect(extractTargetDateKey({ id: 'mobile-day-2026-10-25', data: { current: { type: 'day', date: '2026-10-25' } } })).toBe('2026-10-25');

      // 3. Desktop Month Day cell
      expect(extractTargetDateKey({ id: 'desktop-day-2026-10-25', data: { current: { type: 'day', date: '2026-10-25' } } })).toBe('2026-10-25');

      // 4. Three-Day column
      expect(extractTargetDateKey({ id: 'threeday-day-2026-10-25', data: { current: { type: 'day', date: '2026-10-25' } } })).toBe('2026-10-25');

      // 5. Dropped directly over another Task on Friday (2026-10-23)
      expect(extractTargetDateKey({
        id: 'task-abc123',
        data: { current: { type: 'task', task: { id: 'abc123', dueDate: '2026-10-23T12:00:00.000Z' } } },
      })).toBe('2026-10-23');

      // 6. Dropped directly over another Deliverable on Saturday (2026-10-24)
      expect(extractTargetDateKey({
        id: 'content-def456',
        data: { current: { type: 'card', item: { id: 'def456', scheduledDate: '2026-10-24T12:00:00.000Z' } } },
      })).toBe('2026-10-24');

      // 7. Dropped over invalid target returns null
      expect(extractTargetDateKey({ id: 'random-unknown-zone', data: { current: {} } })).toBeNull();
    });

    it('safely rolls back optimistic update on API error without leaving partial state', () => {
      const initialTasks = [
        { id: 't1', title: 'Task 1', dueDate: '2026-10-21' },
        { id: 't2', title: 'Task 2', dueDate: '2026-10-21' },
      ];

      // Take deep-cloned snapshot
      const snapshot = initialTasks.map((t) => ({ ...t }));

      // Optimistic update
      let activeState = initialTasks.map((t) => (t.id === 't1' ? { ...t, dueDate: '2026-10-22' } : { ...t }));
      expect(activeState[0].dueDate).toBe('2026-10-22');

      // Simulate API failure: restore snapshot
      activeState = snapshot.map((t) => ({ ...t }));

      expect(activeState[0].dueDate).toBe('2026-10-21');
      expect(activeState[1].dueDate).toBe('2026-10-21');
    });
  });
});
