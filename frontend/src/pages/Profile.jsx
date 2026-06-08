import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, User as UserIcon, Lock, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

const Profile = () => {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [savingName, setSavingName] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  React.useEffect(() => { document.title = 'Profile Settings | Abundant Merchandise'; }, []);

  const saveName = async (e) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { toast.error('Name cannot be empty'); return; }
    if (trimmed === user?.name) { toast.message('No changes to save'); return; }
    setSavingName(true);
    try {
      await api.patch('/auth/profile', { name: trimmed });
      await refresh();
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not update profile');
    } finally {
      setSavingName(false);
    }
  };

  const savePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) { toast.error('Please fill in all password fields'); return; }
    if (newPassword.length < 8) { toast.error('New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('New passwords do not match'); return; }
    setSavingPwd(true);
    try {
      await api.post('/auth/change-password', { current_password: currentPassword, new_password: newPassword });
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Could not change password');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <div data-testid="profile-page" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-brand">My Account</p>
          <h1 className="mt-1 font-heading text-3xl font-bold text-ink-900">Profile</h1>
          <p className="text-sm text-ink-500 mt-1">Update your display name and password.</p>
        </div>
        <Link to="/account" data-testid="profile-back-link" className="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-700 hover:text-brand">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.75} /> Back to account
        </Link>
      </div>

      {/* Personal details */}
      <form onSubmit={saveName} data-testid="profile-name-form" className="bg-white border border-ink-200 rounded-xl p-6 md:p-8 mb-6">
        <div className="flex items-center gap-2 mb-5">
          <UserIcon className="w-5 h-5 text-brand" strokeWidth={1.75} />
          <h2 className="font-heading text-lg font-bold text-ink-900">Personal details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Display name</label>
            <input
              data-testid="profile-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-ink-400 absolute left-3 top-1/2 -translate-y-1/2" strokeWidth={1.75} />
              <input
                data-testid="profile-email-input"
                value={user?.email || ''}
                disabled
                className="w-full h-11 pl-9 pr-3 text-sm border border-ink-200 bg-ink-50 text-ink-500 rounded-md cursor-not-allowed"
              />
            </div>
            <p className="text-[11px] text-ink-400 mt-1">Email cannot be changed.</p>
          </div>
        </div>
        <div className="mt-5 flex">
          <button
            data-testid="profile-save-name"
            type="submit"
            disabled={savingName}
            className="h-11 px-5 bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold rounded-md transition-colors"
          >
            {savingName ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </form>

      {/* Password */}
      <form onSubmit={savePassword} data-testid="profile-password-form" className="bg-white border border-ink-200 rounded-xl p-6 md:p-8">
        <div className="flex items-center gap-2 mb-5">
          <Lock className="w-5 h-5 text-brand" strokeWidth={1.75} />
          <h2 className="font-heading text-lg font-bold text-ink-900">Change password</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-ink-700 mb-1">Current password</label>
            <input
              data-testid="profile-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">New password</label>
            <input
              data-testid="profile-new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
            <p className="text-[11px] text-ink-400 mt-1">At least 8 characters.</p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-700 mb-1">Confirm new password</label>
            <input
              data-testid="profile-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              minLength={8}
              className="w-full h-11 px-3 text-sm border border-ink-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
            />
          </div>
        </div>
        <div className="mt-5 flex">
          <button
            data-testid="profile-save-password"
            type="submit"
            disabled={savingPwd}
            className="h-11 px-5 bg-brand hover:bg-brand-600 disabled:bg-ink-300 text-white text-sm font-semibold rounded-md transition-colors"
          >
            {savingPwd ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
