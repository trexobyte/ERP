'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useImpersonation } from '@/components/providers';
import {
  X,
  Camera,
  Upload,
  User,
  Mail,
  Shield,
  Building2,
  Calendar,
  Lock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';

interface PersonalProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PersonalProfileModal({ isOpen, onClose }: PersonalProfileModalProps) {
  const { data: session, update: updateSession } = useSession();
  const { effectiveRoleName, triggerRefresh } = useImpersonation();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<any | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('');
  const [avatarPreview, setAvatarPreview] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState('');

  // Password change states
  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user details from /api/users
  const loadUserProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const allUsers = await res.json();
        const sessionUserId = (session?.user as any)?.id;
        const sessionUserEmail = session?.user?.email;

        // Find user by session ID, session email, or first user (Super Admin)
        const current =
          allUsers.find((u: any) => u.id === sessionUserId) ||
          allUsers.find((u: any) => u.email === sessionUserEmail) ||
          allUsers[0];

        if (current) {
          setUserProfile(current);
          setName(current.name || '');
          setAvatar(current.avatar || '');
          setAvatarPreview(current.avatar || '');
        }
      }
    } catch (err) {
      console.error('Failed to load user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUserProfile();
      setChangePassword(false);
      setNewPassword('');
      setConfirmPassword('');
      setShowUrlInput(false);
    }
  }, [isOpen]);

  // Process image using Meta / Instagram standards:
  // - Validates size <= 10MB (Instagram standard max upload)
  // - High quality 1:1 square center-crop (Instagram profile circle crop)
  // - Scales to max 800x800px at 0.92 JPEG quality for crystal sharpness without payload bloat
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
            // Instagram profile crop: center square (1:1)
            const squareSize = Math.min(img.width, img.height);
            const cropX = (img.width - squareSize) / 2;
            const cropY = (img.height - squareSize) / 2;

            // Target dimensions: 800x800 for high-density displays
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

            // Draw centered square crop
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

            // Export format: preserve alpha transparency for transparent PNGs / WebPs ("no bg" images)
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

  // Handle local image file upload (< 10MB Meta / Instagram limit)
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const processed = await processMetaInstagramPhoto(file);
      setAvatar(processed);
      setAvatarPreview(processed);
    } catch (err: any) {
      alert(err.message || 'Failed to process image');
    } finally {
      e.target.value = '';
    }
  };

  const handleApplyImageUrl = () => {
    if (!imageUrlInput.trim()) return;
    setAvatar(imageUrlInput.trim());
    setAvatarPreview(imageUrlInput.trim());
    setShowUrlInput(false);
    setImageUrlInput('');
  };

  const handleRemovePhoto = () => {
    setAvatar('');
    setAvatarPreview('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter your full name.');
      return;
    }

    if (changePassword) {
      if (newPassword.length < 6) {
        alert('Password must be at least 6 characters.');
        return;
      }
      if (newPassword !== confirmPassword) {
        alert('New passwords do not match. Please verify and try again.');
        return;
      }
    }

    setSaving(true);
    try {
      const targetId = userProfile?.id || (session?.user as any)?.id;
      const res = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: targetId,
          name: name.trim(),
          avatar: avatar || null,
          ...(changePassword && newPassword ? { password: newPassword } : {}),
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        // Update NextAuth local session with lightweight avatar URL (avoids cookie bloat)
        if (updateSession) {
          await updateSession({
            name: updated.name,
            avatar: `/api/users/${updated.id}/avatar?t=${Date.now()}`,
          });
        }
        triggerRefresh();
        alert('Your personal profile has been updated successfully!');
        onClose();
      } else {
        const errorData = await res.json().catch(() => ({}));
        alert(errorData.error || 'Failed to update personal profile.');
      }
    } catch (err: any) {
      console.error('Save profile error:', err);
      alert(err?.message || 'An unexpected error occurred while saving profile.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-card border-2 border-border shadow-2xl rounded-2xl overflow-hidden max-h-[92vh] flex flex-col text-card-foreground">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-6 py-4 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 shadow-inner">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-foreground">
                My Personal Profile
              </h2>
              <p className="text-xs text-muted-foreground font-mono">
                View account details & edit your personal avatar & credentials
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            title="Close (Esc)"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Hero / Avatar Banner */}
          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl border border-border bg-muted/20">
            {/* Circular Avatar with Camera overlay */}
            <div className="relative group flex-shrink-0">
              <div className="h-24 w-24 rounded-full border-2 border-[#FF3B00] overflow-hidden bg-background shadow-md flex items-center justify-center">
                {avatarPreview ? (
                  <img
                    src={avatarPreview}
                    alt={name || 'Profile'}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gradient-to-tr from-[#FF3B00] to-orange-400 flex items-center justify-center text-white font-black text-2xl">
                    {name ? name.slice(0, 2).toUpperCase() : 'ME'}
                  </div>
                )}
              </div>

              {/* Upload Overlay Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute inset-0 rounded-full bg-black/60 flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-bold"
                title="Change Photo (< 10MB)"
              >
                <Camera className="h-5 w-5 mb-0.5" />
                <span>Upload</span>
              </button>
            </div>

            {/* Hidden File Input (<10MB) */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImageFileChange}
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
            />

            {/* Profile Summary & Photo Actions */}
            <div className="space-y-2 text-center sm:text-left flex-1 min-w-0">
              <div>
                <h3 className="font-extrabold text-base text-foreground truncate">
                  {name || userProfile?.name || 'Team Member'}
                </h3>
                <p className="text-xs font-mono text-muted-foreground truncate flex items-center justify-center sm:justify-start gap-1 mt-0.5">
                  <Mail className="h-3 w-3" />
                  {userProfile?.email || session?.user?.email || 'user@trexobyte.com'}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-1.5 pt-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#FF3B00]/15 text-[#FF3B00] border border-[#FF3B00]/30 flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {effectiveRoleName || userProfile?.role?.name || 'Super Admin'}
                </span>
                {userProfile?.department && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-muted text-muted-foreground border border-border">
                    {userProfile.department}
                  </span>
                )}
              </div>

              {/* Photo Action Buttons */}
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1 text-xs">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#FF3B00]/10 hover:bg-[#FF3B00] text-[#FF3B00] hover:text-white font-bold text-[11px] transition-colors cursor-pointer border border-[#FF3B00]/30"
                >
                  <Upload className="h-3 w-3" /> Upload Image (&lt;10MB)
                </button>

                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-input hover:bg-muted font-medium text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <LinkIcon className="h-3 w-3" /> Photo URL
                </button>

                {avatarPreview && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-rose-500/30 hover:bg-rose-500/10 text-rose-400 font-medium text-[11px] transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                )}
              </div>

              {/* Spec Indicator */}
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground font-mono pt-1">
                <span>Image must be &lt; 10MB</span>
              </div>

              {/* Image URL Input Form */}
              {showUrlInput && (
                <div className="flex items-center gap-1.5 pt-2 animate-in fade-in">
                  <input
                    type="url"
                    placeholder="https://example.com/my-photo.jpg"
                    value={imageUrlInput}
                    onChange={(e) => setImageUrlInput(e.target.value)}
                    className="flex-1 px-2.5 py-1 text-xs rounded border border-input bg-background focus:border-[#FF3B00] outline-hidden"
                  />
                  <button
                    type="button"
                    onClick={handleApplyImageUrl}
                    className="px-2.5 py-1 rounded bg-[#FF3B00] text-white text-xs font-bold hover:bg-[#e03400] cursor-pointer"
                  >
                    Apply
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
            {/* Name Input */}
            <div>
              <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                Full Display Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-3 py-2 text-sm font-bold rounded-lg border border-input bg-background focus:border-[#FF3B00] focus:ring-1 focus:ring-[#FF3B00] outline-hidden"
              />
            </div>

            {/* Readonly Account Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl border border-border bg-muted/20">
              <div>
                <span className="block text-[10px] font-mono uppercase text-muted-foreground">Registered Email</span>
                <span className="font-semibold text-foreground truncate block">
                  {userProfile?.email || session?.user?.email || 'user@trexobyte.com'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-muted-foreground">Department</span>
                <span className="font-semibold text-foreground block">
                  {userProfile?.department || 'Social Media'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-muted-foreground">Assigned Role</span>
                <span className="font-bold text-[#FF3B00] block">
                  {effectiveRoleName || userProfile?.role?.name || 'Super Admin'}
                </span>
              </div>
              <div>
                <span className="block text-[10px] font-mono uppercase text-muted-foreground">Account Status</span>
                <span className="font-bold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Active Member
                </span>
              </div>
            </div>

            {/* Assigned Client Accounts */}
            {userProfile?.assignedClients && userProfile.assignedClients.length > 0 && (
              <div>
                <label className="block font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Assigned Client Accounts ({userProfile.assignedClients.length})
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg border border-border bg-muted/20">
                  {userProfile.assignedClients.map((a: any) => (
                    <span
                      key={a.id}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-white uppercase"
                      style={{ backgroundColor: a.client?.color || '#FF3B00' }}
                    >
                      {a.client?.name}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Optional Change Password Section */}
            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setChangePassword(!changePassword)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#FF3B00] hover:underline cursor-pointer"
              >
                <Lock className="h-3.5 w-3.5" />
                {changePassword ? 'Cancel Password Change' : 'Change Account Password'}
              </button>

              {changePassword && (
                <div className="mt-3 p-3.5 rounded-xl border border-border bg-muted/20 space-y-3 animate-in fade-in">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-muted-foreground mb-1">
                      New Password *
                    </label>
                    <input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background focus:border-[#FF3B00] outline-hidden text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold uppercase text-muted-foreground mb-1">
                      Confirm New Password *
                    </label>
                    <input
                      type="password"
                      placeholder="Repeat new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg border border-input bg-background focus:border-[#FF3B00] outline-hidden text-xs"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 font-semibold rounded-lg border border-input hover:bg-muted transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 font-bold rounded-lg bg-[#FF3B00] text-white hover:bg-[#e03400] transition-all shadow-md clicky-btn cursor-pointer disabled:opacity-50"
              >
                {saving ? 'Saving Profile...' : 'Save Profile Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
