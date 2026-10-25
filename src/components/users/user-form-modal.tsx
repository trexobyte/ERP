'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Camera, Edit2, Upload, Users2, X, Shield, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react';
import { IndividualPermissionsEditor } from './individual-permissions-editor';
import {
  GranularPermissionsMap,
  getRoleDefaultGranularPermissions,
  normalizeUserPermissions,
  countActivePermissions,
} from '@/lib/permissions';

interface UserFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  user?: any | null; // if provided, Edit Mode; otherwise Add Mode
  roles: any[];
  clients?: any[];
  onSubmit: (data: any) => Promise<void>;
  isSubmitting: boolean;
  initialTab?: 'profile' | 'permissions';
  isSuperAdmin?: boolean;
}

export function UserFormModal({
  isOpen,
  onClose,
  user,
  roles,
  clients = [],
  onSubmit,
  isSubmitting,
  initialTab = 'profile',
  isSuperAdmin = true,
}: UserFormModalProps) {
  const isEdit = Boolean(user);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Active Tab: 'profile' | 'permissions'
  const [activeTab, setActiveTab] = useState<'profile' | 'permissions'>('profile');

  // Form states
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [department, setDepartment] = useState('Social Media');
  const [roleId, setRoleId] = useState('');
  const [active, setActive] = useState(true);
  const [avatar, setAvatar] = useState('');
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);

  // Permissions state
  const [permissions, setPermissions] = useState<GranularPermissionsMap>({});

  const selectedRoleObj = roles.find((r) => r.id === roleId) || roles[0];
  const selectedRoleName = selectedRoleObj?.name || 'Social Media Manager';

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPassword('');
      setDepartment(user.department || 'Social Media');
      const initialRoleId = user.roleId || (roles.length > 0 ? roles[0].id : '');
      setRoleId(initialRoleId);
      setActive(user.active !== undefined ? user.active : true);
      setAvatar(user.avatar || '');
      setAssignedClientIds(
        user.assignedClients?.map((a: any) => a.clientId || a.client?.id).filter(Boolean) || []
      );

      // Load existing user individual permissions or fallback to role defaults
      const resolvedPerms = normalizeUserPermissions(
        user.permissions,
        user.role?.name || (roles.find((r) => r.id === initialRoleId)?.name)
      );
      setPermissions(resolvedPerms);
    } else {
      setName('');
      setEmail('');
      setPassword('');
      setDepartment('Social Media');
      const firstRoleId = roles.length > 0 ? roles[0].id : '';
      setRoleId(firstRoleId);
      setActive(true);
      setAvatar('');
      setAssignedClientIds([]);

      // Initialize permissions from default selected role
      const firstRoleName = roles.find((r) => r.id === firstRoleId)?.name || 'Social Media Manager';
      setPermissions(getRoleDefaultGranularPermissions(firstRoleName));
    }
  }, [user, isOpen, roles]);

  // When changing role in Create Mode, automatically re-seed permissions from the newly selected role
  const handleRoleChange = (newRoleId: string) => {
    setRoleId(newRoleId);
    if (!isEdit) {
      const newRoleName = roles.find((r) => r.id === newRoleId)?.name || 'Social Media Manager';
      setPermissions(getRoleDefaultGranularPermissions(newRoleName));
    }
  };

  if (!isOpen) return null;

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

            const isTransparent =
              file.type === 'image/png' || file.type === 'image/webp' || file.type === 'image/gif';
            const mimeType = isTransparent ? 'image/png' : 'image/jpeg';
            const processedUrl = canvas.toDataURL(mimeType, 0.92);
            resolve(processedUrl);
          } catch {
            resolve(event.target?.result as string);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processMetaInstagramPhoto(file);
      setAvatar(processed);
    } catch (err: any) {
      alert(err.message || 'Failed to process image');
    } finally {
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setActiveTab('profile');
      return;
    }

    const payload: any = {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      department,
      roleId: roleId || (roles.length > 0 ? roles[0].id : ''),
      permissions, // Pass explicitly configured individual permissions
    };

    if (isEdit) {
      payload.id = user.id;
      payload.active = active;
      payload.avatar = avatar || null;
      if (password.trim()) payload.password = password.trim();
    } else {
      if (password.trim()) payload.password = password.trim();
      payload.assignedClientIds = assignedClientIds;
    }

    await onSubmit(payload);
  };

  const stats = countActivePermissions(permissions);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-2 sm:p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-4xl bg-card border-2 border-border shadow-2xl rounded-2xl p-4 sm:p-6 space-y-4 max-h-[94vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-[#FF3B00]/10 flex items-center justify-center text-[#FF3B00]">
              {isEdit ? <Edit2 className="h-5 w-5" /> : <Users2 className="h-5 w-5" />}
            </div>
            <div>
              <h2 className="font-black text-sm sm:text-base text-foreground tracking-tight">
                {isEdit ? `Edit Member: ${user.name}` : 'Add New TrexoByte Team Member'}
              </h2>
              <p className="text-[11px] text-muted-foreground font-mono">
                {isEdit
                  ? 'Customize individual module permissions and account credentials.'
                  : 'Assign job role and configure granular permissions across ERP modules.'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-border pb-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#FF3B00] text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Users2 className="h-3.5 w-3.5" />
            <span>1. Profile & Role</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'permissions'
                ? 'bg-[#FF3B00] text-white shadow-xs'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>2. Custom Permissions</span>
            <span
              className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'permissions'
                  ? 'bg-black/25 text-white'
                  : 'bg-[#FF3B00]/10 text-[#FF3B00]'
              }`}
            >
              {stats.enabled}/{stats.total}
            </span>
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto space-y-4 text-xs pr-1 flex flex-col">
          {activeTab === 'profile' ? (
            <div className="space-y-4 flex-1">
              {isEdit && (
                <div className="flex items-center gap-3.5 p-3.5 rounded-xl border border-border bg-muted/20">
                  <div className="relative group shrink-0">
                    <div className="h-14 w-14 rounded-full overflow-hidden border-2 border-[#FF3B00] shadow-sm bg-background flex items-center justify-center">
                      {avatar ? (
                        <img src={avatar} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-tr from-[#FF3B00] to-orange-400 flex items-center justify-center text-white font-bold text-lg">
                          {(name || 'TB').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer"
                      title="Change Photo (<10MB)"
                    >
                      <Camera className="h-4 w-4 text-white" />
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageFileChange}
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                  />

                  <div className="flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF3B00]/10 hover:bg-[#FF3B00] text-[#FF3B00] hover:text-white font-bold text-[11px] transition-colors cursor-pointer border border-[#FF3B00]/30"
                      >
                        <Upload className="h-3 w-3" /> Upload DP (&lt;10MB)
                      </button>
                      {avatar && (
                        <button
                          type="button"
                          onClick={() => setAvatar('')}
                          className="px-2 py-1 rounded border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-medium text-[11px] transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground font-mono">Image must be &lt; 10MB</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Suman Tamang"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
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
                    placeholder="suman@trexobyte.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                  {isEdit ? 'Reset Password (Leave blank to keep existing)' : 'Initial Password *'}
                </label>
                <input
                  type="text"
                  required={!isEdit}
                  placeholder={isEdit ? 'Enter new password if changing' : 'Enter temporary account password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-mono"
                />
                {!isEdit && (
                  <p className="text-[11px] text-muted-foreground mt-1">
                    Team member will use this initial password to sign in.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                    Department
                  </label>
                  <select
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
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
                    Assigned Job Role *
                  </label>
                  <select
                    value={roleId || (roles.length > 0 ? roles[0].id : '')}
                    onChange={(e) => handleRoleChange(e.target.value)}
                    required
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:border-[#FF3B00] outline-hidden font-medium"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Determines base title. Custom permissions can be fine-tuned in Tab 2.
                  </p>
                </div>
              </div>

              {isEdit ? (
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="userActiveStatus"
                    checked={active}
                    onChange={(e) => setActive(e.target.checked)}
                    className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
                  />
                  <label
                    htmlFor="userActiveStatus"
                    className="text-xs font-semibold text-foreground cursor-pointer select-none"
                  >
                    Account Active (Uncheck to suspend access)
                  </label>
                </div>
              ) : (
                clients.length > 0 && (
                  <div>
                    <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                      Assign Initial Clients
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border p-2.5 rounded-lg max-h-36 overflow-y-auto bg-muted/10">
                      {clients.map((c) => (
                        <label
                          key={c.id}
                          className="flex items-center gap-2 p-1.5 rounded hover:bg-muted/40 cursor-pointer text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={assignedClientIds.includes(c.id)}
                            onChange={(e) => {
                              if (e.target.checked) setAssignedClientIds([...assignedClientIds, c.id]);
                              else setAssignedClientIds(assignedClientIds.filter((id) => id !== c.id));
                            }}
                            className="rounded border-input text-[#FF3B00] focus:ring-[#FF3B00]"
                          />
                          <span className="truncate font-medium">{c.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )
              )}

              {/* Callout to Permissions Tab */}
              <div className="p-3.5 rounded-xl border border-[#FF3B00]/30 bg-[#FF3B00]/5 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-[#FF3B00]" />
                    Individual Permissions Configured: {stats.enabled} active
                  </span>
                  <p className="text-[11px] text-muted-foreground">
                    You can inspect or customize specific module capabilities (View, Create, Edit, Delete, Manage) in Tab 2.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-md bg-[#FF3B00] text-white text-xs font-bold hover:bg-[#e03400] shrink-0 cursor-pointer"
                >
                  Configure Permissions <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ) : (
            /* Permissions Tab */
            <div className="space-y-4 flex-1">
              <IndividualPermissionsEditor
                permissions={permissions}
                onChange={setPermissions}
                selectedRoleName={selectedRoleName}
                readOnly={!isSuperAdmin}
              />
            </div>
          )}

          {/* Sticky Modal Footer */}
          <div className="sticky bottom-0 bg-card border-t border-border pt-3.5 pb-1 flex items-center justify-between gap-2 shrink-0">
            <div>
              {activeTab === 'permissions' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('profile')}
                  className="flex items-center gap-1.5 px-3 py-2 font-semibold text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to Profile
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab('permissions')}
                  className="flex items-center gap-1.5 px-3 py-2 font-semibold text-xs text-[#FF3B00] hover:underline cursor-pointer"
                >
                  Customize Permissions ({stats.enabled}/{stats.total}) <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-input hover:bg-muted cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold rounded-lg bg-[#FF3B00] text-white hover:bg-[#e03400] clicky-btn cursor-pointer transition-all disabled:opacity-50"
              >
                {isSubmitting
                  ? isEdit
                    ? 'Saving Changes...'
                    : 'Adding Member...'
                  : isEdit
                  ? 'Save Changes'
                  : 'Add Team Member'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
