'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useImpersonation } from '@/components/providers';
import { hasPermission, hasActionPermission } from '@/lib/permissions';
import { Camera, Plus, Search, Shield, ShieldAlert, Users2, Lock } from 'lucide-react';
import { UsersTable } from '@/components/users/users-table';
import { RoleMatrixEditor } from '@/components/users/role-matrix-editor';
import { UserFormModal } from '@/components/users/user-form-modal';
import { RoleBuilderModal } from '@/components/users/role-builder-modal';
import { DeleteUserModal } from '@/components/users/delete-user-modal';

const DEFAULT_ROLES = [
  { id: 'cmvazs0c80002gl4dv8kvxcx6', name: 'Social Media Manager' },
  { id: 'cmvazs0m40003gl4deum3zr8z', name: 'Content/Shoot Manager' },
  { id: 'cmvazs0w20004gl4d1bs4easv', name: 'Ads Manager' },
  { id: 'cmvazs1620005gl4d9pe546ll', name: 'Client Communication' },
  { id: 'cmvazs1g20006gl4dqvrjkxyv', name: 'Billing/Finance' },
  { id: 'cmvazs02c0001gl4dknelyket', name: 'Manager' },
  { id: 'cmvazrzs00000gl4d7n6hk7t4', name: 'Super Admin' },
  { id: 'cmvazs1q10007gl4d0dwmsz00', name: 'Lead Creator & Videographer' },
];

export default function UsersPage() {
  const { data: session } = useSession();
  const {
    effectiveRoleName,
    effectivePermissions,
    refreshTrigger,
    triggerRefresh,
    openProfileModal,
    cachedClients,
    cachedUsers,
    setCachedUsers,
    cachedRoles,
    setCachedRoles,
  } = useImpersonation();

  const isSuperAdmin = effectiveRoleName === 'Super Admin';
  const canViewUsers = hasPermission(effectivePermissions, 'users', 'view') || isSuperAdmin;
  const canCreateUsers = hasActionPermission(effectivePermissions, 'users', 'create') || isSuperAdmin;

  const [users, setUsers] = useState<any[]>(cachedUsers || []);
  const [roles, setRoles] = useState<any[]>(() =>
    cachedRoles && cachedRoles.length > 0 ? cachedRoles : DEFAULT_ROLES
  );
  const [clients, setClients] = useState<any[]>(cachedClients || []);
  const [loading, setLoading] = useState(() => !cachedUsers || cachedUsers.length === 0);

  // Tabs
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Filters
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Modals
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [submittingUser, setSubmittingUser] = useState(false);
  const [userFormTab, setUserFormTab] = useState<'profile' | 'permissions'>('profile');

  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [savingUserEdit, setSavingUserEdit] = useState(false);

  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const [showRoleModal, setShowRoleModal] = useState(false);
  const [submittingRole, setSubmittingRole] = useState(false);

  // Global ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowAddUserModal(false);
        setShowRoleModal(false);
        setUserToEdit(null);
        setUserToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (cachedClients && cachedClients.length > 0 && clients.length === 0) {
      setClients(cachedClients);
    }
  }, [cachedClients, clients.length]);

  useEffect(() => {
    if (cachedUsers && cachedUsers.length > 0 && users.length === 0) {
      setUsers(cachedUsers);
    }
  }, [cachedUsers, users.length]);

  useEffect(() => {
    if (cachedRoles && cachedRoles.length > 0) {
      setRoles(cachedRoles);
    }
  }, [cachedRoles]);

  const fetchUsersAndRoles = async () => {
    if (users.length === 0) setLoading(true);
    try {
      const [usersRes, rolesRes, clientsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/clients'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        if (Array.isArray(data)) {
          setUsers(data);
          setCachedUsers(data);
        }
      }

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setRoles(data);
          setCachedRoles(data);
        }
      }

      if (clientsRes.ok) {
        const data = await clientsRes.json();
        if (Array.isArray(data)) setClients(data);
      }
    } catch (err) {
      console.error('Failed to fetch users or roles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsersAndRoles();
  }, [refreshTrigger]);

  const handleCreateUser = async (formData: any) => {
    setSubmittingUser(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setShowAddUserModal(false);
        fetchUsersAndRoles();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create team member account.');
      }
    } catch (e) {
      console.error('Create user error:', e);
      alert('An unexpected error occurred while creating user.');
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleUpdateUser = async (formData: any) => {
    setSavingUserEdit(true);
    try {
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setUserToEdit(null);
        fetchUsersAndRoles();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to update user account.');
      }
    } catch (e) {
      console.error('Update user error:', e);
      alert('An unexpected error occurred while updating the user account.');
    } finally {
      setSavingUserEdit(false);
    }
  };

  const handleCreateCustomRole = async (name: string, perms: any) => {
    setSubmittingRole(true);
    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          permissions: perms,
          isCustom: true,
        }),
      });

      if (res.ok) {
        setShowRoleModal(false);
        fetchUsersAndRoles();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to create custom role.');
      }
    } catch (e: any) {
      console.error('Create role error:', e);
      alert(e?.message || 'An unexpected error occurred while creating role.');
    } finally {
      setSubmittingRole(false);
    }
  };

  const handleConfirmDeleteUser = async () => {
    if (!userToDelete) return;
    const target = userToDelete;
    setDeletingUser(true);

    try {
      const res = await fetch(`/api/users?id=${target.id}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== target.id));
        setUserToDelete(null);
        fetchUsersAndRoles();
        triggerRefresh();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to delete user.');
      }
    } catch (e) {
      console.error('Delete user error:', e);
      alert('An unexpected error occurred while deleting the user account.');
    } finally {
      setDeletingUser(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !departmentFilter || u.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const currentLoggedIn =
    users.find(
      (u) =>
        u.id === (session?.user as any)?.id ||
        u.email === session?.user?.email
    ) || users[0];

  if (!canViewUsers) {
    return (
      <div className="rounded-2xl border border-border bg-card p-12 text-center space-y-4 max-w-md mx-auto my-16 shadow-lg animate-in fade-in">
        <div className="h-14 w-14 rounded-full bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto border border-rose-500/20">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-foreground">Access Restricted</h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Your current account role (<span className="text-[#FF3B00] font-bold">{effectiveRoleName}</span>) does not have permission to view or manage team members.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header & Mode Switch */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
            USER & ROLE MANAGEMENT <ShieldAlert className="h-5 w-5 text-[#FF3B00]" />
          </h1>
          <p className="text-xs text-muted-foreground font-mono">
            Granular Module Permission Matrix & Department Access Control
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border">
            <button
              onClick={() => setActiveTab('users')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'users'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users2 className="h-4 w-4" /> Team Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'roles'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Shield className="h-4 w-4" /> Role Permission Builder
            </button>
          </div>
        </div>
      </div>

      {/* TAB 1: USER MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* PERSONAL PROFILE & DP BANNER */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl border border-[#FF3B00]/30 bg-card shadow-xs">
            <div className="flex items-center gap-3.5 w-full sm:w-auto">
              <div className="relative group shrink-0">
                <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-[#FF3B00] shadow-sm bg-background flex items-center justify-center">
                  {currentLoggedIn?.avatar ? (
                    <img
                      src={currentLoggedIn.avatar}
                      alt={currentLoggedIn.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="h-full w-full bg-gradient-to-tr from-[#FF3B00] to-orange-400 flex items-center justify-center text-white font-bold text-lg">
                      {(currentLoggedIn?.name || 'ME').slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openProfileModal}
                  className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                  title="Change Profile Picture"
                >
                  <Camera className="h-4 w-4 text-white" />
                </button>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-sm text-foreground truncate">
                    {currentLoggedIn?.name || session?.user?.name || 'Your Profile'}
                  </h3>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30">
                    {effectiveRoleName}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  {currentLoggedIn?.email || session?.user?.email || 'Logged in account'} •{' '}
                  {currentLoggedIn?.department || 'Kathmandu HQ'}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-mono">
                  Image must be &lt; 10MB
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={openProfileModal}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-[#FF3B00] text-white font-bold text-xs hover:bg-[#e03400] transition-all shadow-xs clicky-btn shrink-0 w-full sm:w-auto justify-center cursor-pointer"
            >
              <Camera className="h-4 w-4" />
              <span>Change Profile Picture (DP)</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-card p-3 rounded-xl border border-border">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search user name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-9 pr-4 py-1.5 text-xs outline-hidden focus:border-[#FF3B00]"
              />
            </div>

            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-xs font-medium outline-hidden focus:border-[#FF3B00]"
            >
              <option value="">All Departments</option>
              <option value="Management">Management</option>
              <option value="Social Media">Social Media</option>
              <option value="Content Production">Content Production</option>
              <option value="Ads">Ads</option>
              <option value="Client Servicing">Client Servicing</option>
              <option value="Billing">Billing</option>
            </select>

            {canCreateUsers && (
              <button
                onClick={() => {
                  setUserFormTab('profile');
                  setShowAddUserModal(true);
                }}
                className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] clicky-btn cursor-pointer shrink-0"
              >
                <Plus className="h-4 w-4 stroke-[3]" /> Add User
              </button>
            )}
          </div>

          <UsersTable
            users={filteredUsers}
            loading={loading}
            onEditUser={(u) => {
              setUserToEdit(u);
              setUserFormTab('profile');
            }}
            onEditPermissions={(u) => {
              setUserToEdit(u);
              setUserFormTab('permissions');
            }}
            onRequestDeleteUser={(u) => setUserToDelete(u)}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      )}

      {/* TAB 2: ROLE BUILDER MATRIX */}
      {activeTab === 'roles' && (
        <RoleMatrixEditor
          roles={roles}
          onOpenRoleBuilder={() => setShowRoleModal(true)}
        />
      )}

      {/* ADD USER MODAL */}
      <UserFormModal
        isOpen={showAddUserModal}
        onClose={() => setShowAddUserModal(false)}
        roles={roles}
        clients={clients}
        onSubmit={handleCreateUser}
        isSubmitting={submittingUser}
        initialTab={userFormTab}
        isSuperAdmin={isSuperAdmin}
      />

      {/* EDIT USER MODAL */}
      <UserFormModal
        isOpen={Boolean(userToEdit)}
        onClose={() => setUserToEdit(null)}
        user={userToEdit}
        roles={roles}
        clients={clients}
        onSubmit={handleUpdateUser}
        isSubmitting={savingUserEdit}
        initialTab={userFormTab}
        isSuperAdmin={isSuperAdmin}
      />


      {/* ROLE BUILDER MODAL */}
      <RoleBuilderModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        onSubmit={handleCreateCustomRole}
        isSubmitting={submittingRole}
      />

      {/* DELETE USER MODAL */}
      <DeleteUserModal
        user={userToDelete}
        isOpen={Boolean(userToDelete)}
        onClose={() => setUserToDelete(null)}
        onConfirm={handleConfirmDeleteUser}
        isDeleting={deletingUser}
      />
    </div>
  );
}
