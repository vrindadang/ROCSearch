import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, UserPlus, Trash2, Edit2, Shield, User, Key, Save, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { UserAccount } from '../types';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: UserAccount[];
  onSaveUser: (user: Partial<UserAccount>) => void;
  onDeleteUser: (id: string) => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  users,
  onSaveUser,
  onDeleteUser
}) => {
  const [editingUser, setEditingUser] = useState<Partial<UserAccount> | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    setShowPassword(false);
  }, [editingUser?.id]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser?.username || !editingUser?.password) {
      setError('Username and password are required');
      return;
    }

    // Check if username already exists (only for new users)
    if (!editingUser.id && users.some(u => u.username === editingUser.username)) {
      setError('Username already exists');
      return;
    }

    onSaveUser(editingUser);
    setEditingUser(null);
    setError(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="bg-navy p-6 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold font-serif">User Management</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* User List */}
          <div className="w-1/2 border-r border-gray-100 overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-gray-800">System Users</h3>
              <button
                onClick={() => setEditingUser({ username: '', password: '', role: 'user' })}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors text-sm font-semibold"
              >
                <UserPlus className="w-4 h-4" />
                Add User
              </button>
            </div>

            <div className="space-y-3">
              {users.map(u => (
                <div
                  key={u.id}
                  className={`p-4 rounded-xl border transition-all ${
                    editingUser?.id === u.id ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100 bg-gray-50/50 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        u.role === 'admin' ? 'bg-navy text-white' : 'bg-blue-100 text-blue-600'
                      }`}>
                        {u.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{u.username}</p>
                        <p className="text-xs text-gray-500 capitalize">{u.role}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setEditingUser(u)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.username !== 'admin' && (
                        <button
                          onClick={() => onDeleteUser(u.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Edit Form */}
          <div className="w-1/2 p-8 bg-gray-50/50">
            <AnimatePresence mode="wait">
              {editingUser ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                  <h3 className="text-lg font-bold text-gray-900 mb-6">
                    {editingUser.id ? 'Edit User' : 'Create New User'}
                  </h3>

                  <form onSubmit={handleSave} className="space-y-6">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Username</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={editingUser.username}
                          onChange={e => setEditingUser({ ...editingUser, username: e.target.value })}
                          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          placeholder="Enter username"
                          disabled={editingUser.username === 'admin'}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                      <div className="relative">
                        <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type={showPassword ? "text" : "password"}
                          value={editingUser.password}
                          onChange={e => setEditingUser({ ...editingUser, password: e.target.value })}
                          className="w-full pl-10 pr-12 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">Role</label>
                      <div className="flex gap-4">
                        <button
                          type="button"
                          onClick={() => setEditingUser({ ...editingUser, role: 'user' })}
                          className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                            editingUser.role === 'user'
                              ? 'bg-blue-50 border-blue-500 text-blue-600'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                          disabled={editingUser.username === 'admin'}
                        >
                          User
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingUser({ ...editingUser, role: 'admin' })}
                          className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-all ${
                            editingUser.role === 'admin'
                              ? 'bg-navy border-navy text-white'
                              : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                          }`}
                          disabled={editingUser.username === 'admin'}
                        >
                          Admin
                        </button>
                      </div>
                    </div>

                    {error && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs">
                        <AlertCircle className="w-4 h-4" />
                        <span>{error}</span>
                      </div>
                    )}

                    <div className="pt-4 flex gap-3">
                      <button
                        type="button"
                        onClick={() => setEditingUser(null)}
                        className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-sm text-gray-600 hover:bg-gray-50 transition-all"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2.5 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        Save Changes
                      </button>
                    </div>
                  </form>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="h-full flex flex-col items-center justify-center text-center p-8"
                >
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <User className="w-8 h-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Select a User</h3>
                  <p className="text-sm text-gray-500">
                    Select a user from the list to edit their details or create a new user account.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
