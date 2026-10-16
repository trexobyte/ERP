'use client';

import React, { useState, useEffect } from 'react';
import { useImpersonation } from '@/components/providers';
import {
  ShieldAlert,
  Users2,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Key,
  Shield,
  Sparkles,
  Lock,
  X,
  Trash2,
  Edit2,
  Camera,
  Upload,
} from 'lucide-react';
import { useSession } from 'next-auth/react';

export default function UsersPage() {
  const { data: session } = useSession();
  const { effectivePermissions, effectiveRoleName, refreshTrigger, triggerRefresh, openProfileModal } = useImpersonation();
  const [users, setUsers] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Tabs: Users List vs Role Builder Matrix
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');

  // Search/Filter
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

  // Add User Modal
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('password123');
  const [userDepartment, setUserDepartment] = useState('Social Media');
  const [userRoleId, setUserRoleId] = useState('');
  const [userAssignedClients, setUserAssignedClients] = useState<string[]>([]);
  const [submittingUser, setSubmittingUser] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<any | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // Edit User Modal State
  const [userToEdit, setUserToEdit] = useState<any | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserAvatar, setEditUserAvatar] = useState('');
  const [editUserDepartment, setEditUserDepartment] = useState('Social Media');
  const [editUserRoleId, setEditUserRoleId] = useState('');
  const [editUserActive, setEditUserActive] = useState(true);
  const [editUserPassword, setEditUserPassword] = useState('');
  const [savingUserEdit, setSavingUserEdit] = useState(false);
  const editFileInputRef = React.useRef<HTMLInputElement>(null);

  // Role Builder State
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleName, setRoleName] = useState('');
  const [submittingRole, setSubmittingRole] = useState(false);
  const [permissionsMatrix, setPermissionsMatrix] = useState<any>({
    dashboard: 'view',
    calendar: 'edit',
    clients: 'view',
    tracker: 'edit',
    tasks: 'edit',
    billing: 'none',
    reports: 'view',
    users: 'none',
  });

  // ESC key listener for modals
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAddUserModal) setShowAddUserModal(false);
        if (showRoleModal) setShowRoleModal(false);
        if (userToEdit) setUserToEdit(null);
        if (userToDelete) setUserToDelete(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAddUserModal, showRoleModal, userToEdit, userToDelete]);

  const isSuperAdmin = true; // Route protection check

  const fetchUsersAndRoles = async () => {
    setLoading(true);
    try {
      const [usersRes, rolesRes, clientsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/roles'),
        fetch('/api/clients'),
      ]);

      if (usersRes.ok) {
        const data = await usersRes.json();
        if (Array.isArray(data)) setUsers(data);
      } else {
        console.error('Failed to fetch users HTTP', usersRes.status);
      }

      if (rolesRes.ok) {
        const data = await rolesRes.json();
        if (Array.isArray(data)) {
          setRoles(data);
          if (data.length > 0 && !userRoleId) {
            setUserRoleId(data[0].id);
          }
        }
      } else {
        console.error('Failed to fetch roles HTTP', rolesRes.status);
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

  const processMetaInstagramPhoto = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const maxSizeBytes = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSizeBytes) {
        reject(
          new Error(
            `Image size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit. Image must be < 10MB.`
          )
        );
        return;
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (event) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Invalid image file format.'));
        img.onload = () => {
          try {
            const squareSize = Math.min(img.width, img.height);
            const cropX = (img.width - squareSize) / 2;
            const cropY = (img.height - squareSize) / 2;

            const targetDim = Math.min(squareSize, 800);
            const canvas = document.createElement('canvas');
            canvas.width = targetDim;
            canvas.height = targetDim;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(event.target?.result as string);
              return;
            }

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';

            ctx.drawImage(
              img,
              cropX,
              cropY,
              squareSize,
              squareSize,
              0,
              0,
              targetDim,
              targetDim
            );

            const isTransparent = file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
            const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
            const processedUrl = canvas.toDataURL(mimeType, 0.92);
            resolve(processedUrl);
          } catch (e) {
            resolve(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processMetaInstagramPhoto(file);
      setEditUserAvatar(processed);
    } catch (err: any) {
      alert(err.message || 'Failed to process image');
    } finally {
      e.target.value = '';
    }
  };

  const handleOpenEditUser = (target: any) => {
    setUserToEdit(target);
    setEditUserName(target.name || '');
    setEditUserEmail(target.email || '');
    setEditUserAvatar(target.avatar || '');
    setEditUserDepartment(target.department || 'Social Media');
    setEditUserRoleId(target.roleId || (roles.length > 0 ? roles[0].id : ''));
    setEditUserActive(target.active !== undefined ? target.active : true);
    setEditUserPassword('');
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToEdit || !editUserName || !editUserEmail) return;
    setSavingUserEdit(true);

    try {
      const payload: any = {
        id: userToEdit.id,
        name: editUserName.trim(),
        email: editUserEmail.trim().toLowerCase(),
        department: editUserDepartment,
        roleId: editUserRoleId,
        active: editUserActive,
        avatar: editUserAvatar || null,
      };
      if (editUserPassword.trim()) {
        payload.password = editUserPassword.trim();
      }

      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) return;
    setSubmittingUser(true);

    try {
      const selectedRoleId = userRoleId || (roles.length > 0 ? roles[0].id : '');
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName.trim(),
          email: userEmail.trim().toLowerCase(),
          password: userPassword || 'password123',
          department: userDepartment,
          roleId: selectedRoleId,
          assignedClientIds: userAssignedClients,
        }),
      });

      if (res.ok) {
        setShowAddUserModal(false);
        setUserName('');
        setUserEmail('');
        setUserPassword('password123');
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

  const handleCreateCustomRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName || !roleName.trim()) {
      alert('Please enter a custom role title.');
      return;
    }
    setSubmittingRole(true);

    try {
      const res = await fetch('/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: roleName.trim(),
          permissions: permissionsMatrix,
          isCustom: true,
        }),
      });

      if (res.ok) {
        setShowRoleModal(false);
        setRoleName('');
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
    const matchesSearch = u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchesDept = !departmentFilter || u.department === departmentFilter;
    return matchesSearch && matchesDept;
  });

  const modulesList = [
    { key: 'dashboard', label: 'Main Dashboard' },
    { key: 'calendar', label: 'Planning & Calendar' },
    { key: 'clients', label: 'Clients & Accounts' },
    { key: 'tracker', label: 'Content Tracker' },
    { key: 'tasks', label: 'Tasks Stream' },
    { key: 'billing', label: 'Billing & Invoices' },
    { key: 'reports', label: 'Reports & Analytics' },
    { key: 'users', label: 'User & Role Access' },
  ];

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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-[#FF3B00] text-white shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users2 className="h-4 w-4" /> Team Users ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
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
          {/* YOUR PERSONAL PROFILE & DP BANNER */}
          {(() => {
            const currentLoggedIn =
              users.find(
                (u) =>
                  u.id === (session?.user as any)?.id ||
                  u.email === session?.user?.email
              ) || users[0];

            return (
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
                      {currentLoggedIn?.email || session?.user?.email || 'Logged in account'} • {currentLoggedIn?.department || 'Kathmandu HQ'}
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
            );
          })()}

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

            <button
              onClick={() => setShowAddUserModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] clicky-btn"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Add User
            </button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                <tr>
                  <th className="p-3">User</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Assigned Role</th>
                  <th className="p-3">Assigned Clients</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Date Joined</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground font-mono">
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 border-2 border-[#FF3B00] border-t-transparent rounded-full animate-spin" />
                          <span>Loading team member accounts...</span>
                        </div>
                      ) : (
                        <span>No team member accounts found. Click "+ Add User" above to create one.</span>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-muted/30">
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              u.avatar ||
                              'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                            }
                            alt={u.name}
                            className="h-8 w-8 rounded-full object-cover border border-border"
                          />
                          <div>
                            <span className="font-bold text-foreground block">{u.name}</span>
                            <span className="text-[10px] font-mono text-muted-foreground">{u.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="font-mono px-2 py-0.5 rounded bg-muted font-semibold text-foreground">
                          {u.department}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-[#FF3B00]">{u.role?.name || 'Viewer'}</td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {u.assignedClients?.length > 0 ? (
                          <span className="flex flex-wrap gap-1">
                            {u.assignedClients.map((a: any) => (
                              <span
                                key={a.client?.id}
                                className="px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                                style={{ backgroundColor: a.client?.color || '#FF3B00' }}
                              >
                                {a.client?.name.slice(0, 10)}
                              </span>
                            ))}
                          </span>
                        ) : (
                          <span>All / Global</span>
                        )}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.active
                              ? 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/30'
                              : 'bg-rose-500/15 text-rose-500'
                          }`}
                        >
                          {u.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="p-3 font-mono text-muted-foreground">
                        {new Date(u.dateJoined).toLocaleDateString()}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenEditUser(u)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-[#FF3B00] transition-colors"
                            title="Edit User Role & Settings"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setUserToDelete(u)}
                            className="p-1.5 rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                            title="Delete User Account"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ROLE BUILDER MATRIX */}
      {activeTab === 'roles' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-card p-4 rounded-xl border border-border">
            <div>
              <h2 className="font-extrabold text-sm tracking-tight text-foreground">
                CUSTOM ROLE & PERMISSION MATRIX
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                Define exact access levels (None, View, Edit, Full) for each ERP module.
              </p>
            </div>
            <button
              onClick={() => setShowRoleModal(true)}
              className="flex items-center gap-1.5 rounded-md bg-[#FF3B00] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#e03400] clicky-btn"
            >
              <Plus className="h-4 w-4 stroke-[3]" /> Build Custom Role
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {roles.map((role) => {
              let perms: any = {};
              try {
                perms = JSON.parse(role.permissions);
              } catch (e) {}

              return (
                <div
                  key={role.id}
                  className="rounded-xl border border-border bg-card p-5 shadow-xs space-y-3 hover:border-[#FF3B00] transition-all"
                >
                  <div className="flex items-center justify-between border-b border-border pb-2">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                      <Shield className="h-4 w-4 text-[#FF3B00]" /> {role.name}
                    </h3>
                    {role.isCustom && (
                      <span className="text-[10px] font-mono bg-[#FF3B00]/10 text-[#FF3B00] px-2 py-0.5 rounded font-bold">
                        CUSTOM
                      </span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    {modulesList.map((m) => {
                      const level = perms[m.key] || 'none';
                      return (
                        <div key={m.key} className="flex justify-between items-center font-mono">
                          <span className="text-muted-foreground">{m.label}:</span>
                          <span
                            className={`font-bold uppercase text-[10px] px-1.5 py-0.5 rounded ${
                              level === 'full'
                                ? 'bg-emerald-500/15 text-emerald-500'
                                : level === 'edit'
                                ? 'bg-amber-500/15 text-amber-500'
                                : level === 'view'
                                ? 'bg-blue-500/15 text-blue-500'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {level}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ADD USER MODAL */}
      {showAddUserModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAddUserModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Users2 className="h-4 w-4 text-[#FF3B00]" /> Add TrexoByte Team Member
              </h2>
              <button onClick={() => setShowAddUserModal(false)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suman Tamang"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="suman@trexobyte.com"
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Initial Password (to hand out to member) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. password123"
                  value={userPassword}
                  onChange={(e) => setUserPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-mono"
                />
                <p className="text-[11px] text-muted-foreground mt-1">Default is set to <code className="text-[#FF3B00] font-bold">password123</code>. You can change it before creating.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Department
                  </label>
                  <select
                    value={userDepartment}
                    onChange={(e) => setUserDepartment(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden"
                  >
                    <option value="Social Media">Social Media</option>
                    <option value="Content Production">Content Production</option>
                    <option value="Ads">Ads Manager</option>
                    <option value="Client Servicing">Client Servicing</option>
                    <option value="Management">Management</option>
                    <option value="Billing">Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={userRoleId || (roles.length > 0 ? roles[0].id : '')}
                    onChange={(e) => setUserRoleId(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                  >
                    {roles.length === 0 ? (
                      <option value="">No roles available</option>
                    ) : (
                      roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn"
                >
                  {submittingUser ? 'Adding...' : 'Add Team Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ROLE BUILDER MODAL */}
      {showRoleModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowRoleModal(false);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-lg bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#FF3B00]" /> Build Custom Role Permission Matrix
              </h2>
              <button onClick={() => setShowRoleModal(false)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomRole} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Custom Role Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lead Motion Graphic Designer"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-bold"
                />
              </div>

              <div className="space-y-3 border border-border p-3 rounded-lg bg-muted/20">
                <span className="block font-bold text-foreground">Per-Module Access Matrix:</span>
                {modulesList.map((m) => (
                  <div key={m.key} className="flex justify-between items-center">
                    <span className="font-semibold text-muted-foreground">{m.label}</span>
                    <select
                      value={permissionsMatrix[m.key] || 'none'}
                      onChange={(e) =>
                        setPermissionsMatrix({
                          ...permissionsMatrix,
                          [m.key]: e.target.value,
                        })
                      }
                      className="rounded border border-input bg-background px-2 py-1 text-xs outline-hidden focus:border-[#FF3B00]"
                    >
                      <option value="none">None</option>
                      <option value="view">View Only</option>
                      <option value="edit">Edit Access</option>
                      <option value="full">Full Admin</option>
                    </select>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRoleModal(false)}
                  className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRole}
                  className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn disabled:opacity-50"
                >
                  {submittingRole ? 'Saving Role...' : 'Save Custom Role'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* EDIT USER MODAL */}
      {userToEdit && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setUserToEdit(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h2 className="font-extrabold text-sm text-foreground flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-[#FF3B00]" /> Edit Member Role & Credentials
              </h2>
              <button onClick={() => setUserToEdit(null)} className="p-1 rounded text-muted-foreground hover:bg-muted">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-4 text-xs">
              {/* Profile / Display Picture */}
              <div className="flex items-center gap-3.5 p-3 rounded-xl border border-border bg-muted/20">
                <div className="relative group shrink-0">
                  <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#FF3B00] shadow-sm bg-background flex items-center justify-center">
                    {editUserAvatar ? (
                      <img
                        src={editUserAvatar}
                        alt="Profile Picture"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-tr from-[#FF3B00] to-orange-400 flex items-center justify-center text-white font-bold text-lg">
                        {(editUserName || 'ME').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                    title="Change Photo (<10MB)"
                  >
                    <Camera className="h-4 w-4 text-white" />
                  </button>
                </div>

                <input
                  type="file"
                  ref={editFileInputRef}
                  onChange={handleEditImageFileChange}
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                />

                <div className="flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF3B00]/10 hover:bg-[#FF3B00] text-[#FF3B00] hover:text-white font-bold text-[11px] transition-colors cursor-pointer border border-[#FF3B00]/30"
                    >
                      <Upload className="h-3 w-3" /> Upload DP (&lt;10MB)
                    </button>
                    {editUserAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditUserAvatar('')}
                        className="px-2 py-1 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-medium text-[11px] transition-colors cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Image must be &lt; 10MB
                  </p>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                />
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Department
                  </label>
                  <select
                    value={editUserDepartment}
                    onChange={(e) => setEditUserDepartment(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                  >
                    <option value="Social Media">Social Media</option>
                    <option value="Content Production">Content Production</option>
                    <option value="Ads">Ads Manager</option>
                    <option value="Client Servicing">Client Servicing</option>
                    <option value="Management">Management</option>
                    <option value="Billing">Billing</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Assigned Role *
                  </label>
                  <select
                    value={editUserRoleId}
                    onChange={(e) => setEditUserRoleId(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  Reset Password (Leave blank to keep existing)
                </label>
                <input
                  type="text"
                  placeholder="Enter new password if changing"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="editUserActive"
                  checked={editUserActive}
                  onChange={(e) => setEditUserActive(e.target.checked)}
                  className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
                />
                <label htmlFor="editUserActive" className="text-xs font-semibold text-foreground cursor-pointer select-none">
                  Account Active (Uncheck to suspend access)
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setUserToEdit(null)}
                  className="px-4 py-2 font-semibold rounded-md border border-input hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingUserEdit}
                  className="px-5 py-2 font-bold rounded-md bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn"
                >
                  {savingUserEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE USER CONFIRMATION MODAL */}
      {userToDelete && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setUserToDelete(null);
          }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200"
        >
          <div className="w-full max-w-md bg-card border-2 border-border shadow-2xl rounded-xl p-6 space-y-4 text-card-foreground">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="font-extrabold text-base text-foreground">Delete User Account</h2>
                <p className="text-xs text-muted-foreground">Remove this user from your agency team roster.</p>
              </div>
            </div>

            <p className="text-xs text-foreground leading-relaxed">
              Are you sure you want to delete <strong className="text-rose-500 font-bold">{userToDelete.name}</strong> (<span className="font-mono text-muted-foreground">{userToDelete.email}</span>)?
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-md border border-input hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                disabled={deletingUser}
                className="px-5 py-2 text-xs font-bold rounded-md bg-rose-500 text-white hover:bg-rose-600 clicky-btn flex items-center gap-1.5 transition-all shadow-xs"
              >
                <Trash2 className="h-4 w-4" />
                <span>{deletingUser ? 'Deleting...' : 'Delete User'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
