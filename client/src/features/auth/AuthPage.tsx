import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Dialog } from '../../components/ui/Dialog.tsx';
import {
  Lock,
  Mail,
  User as UserIcon,
  Eye,
  EyeOff,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signIn, signUp, resetPassword, user } = useAuth();

  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forgot password modal
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStatus, setForgotStatus] = useState<string | null>(null);
  const [isSendingForgot, setIsSendingForgot] = useState(false);

  // If already logged in, redirect
  React.useEffect(() => {
    if (user) {
      const destination = (location.state as any)?.from?.pathname || '/today';
      navigate(destination, { replace: true });
    }
  }, [user, navigate, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!email.trim() || !password) {
      setErrorMsg('Please provide both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const { error } = await signIn(email, password);
        if (error) {
          setErrorMsg(error.message || 'Invalid email or password.');
        } else {
          const destination = (location.state as any)?.from?.pathname || '/today';
          navigate(destination, { replace: true });
        }
      } else {
        const { error, user: newUser } = await signUp(email, password, displayName);
        if (error) {
          setErrorMsg(error.message || 'Registration failed. Please try again.');
        } else if (newUser) {
          setSuccessMsg('Account created! Logging you into your workspace...');
          setTimeout(() => {
            navigate('/onboarding', { replace: true });
          }, 800);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;

    setIsSendingForgot(true);
    setForgotStatus(null);
    try {
      const { error } = await resetPassword(forgotEmail);
      if (error) {
        setForgotStatus(`Error: ${error.message}`);
      } else {
        setForgotStatus('Password reset link sent! Check your inbox.');
      }
    } catch (err: any) {
      setForgotStatus(`Error: ${err.message || 'Could not send reset email.'}`);
    } finally {
      setIsSendingForgot(false);
    }
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-teal-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-md w-full relative z-10 space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-400 text-xs font-mono font-semibold tracking-wider uppercase mb-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            Anti-Procrastination OS
          </div>
          <h1 className="text-3xl font-black tracking-tight text-stone-100 font-mono">
            START<span className="text-teal-400">.</span>
          </h1>
          <p className="text-xs text-stone-400 max-w-sm mx-auto leading-relaxed">
            Your personal operating manual for ending avoidance and executing non-negotiable daily work.
          </p>
        </div>

        {/* Auth Card */}
        <div className="surface-1 border border-stone-800/90 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-sm space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-stone-950/80 border border-stone-800/40 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signin'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 text-xs font-mono font-bold rounded-lg transition-all cursor-pointer ${
                mode === 'signup'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Alert */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-850 text-red-300 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
              <span className="leading-snug">{errorMsg}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-850 text-emerald-300 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
              <span className="leading-snug">{successMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1.5 text-left">
                <Input
                  label="Your Name or Call-Sign"
                  placeholder="e.g. Alex Hunter"
                  leftIcon={<UserIcon className="w-4 h-4 text-stone-500" />}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  autoFocus={mode === 'signup'}
                />
              </div>
            )}

            <div className="space-y-1.5 text-left">
              <Input
                label="Email Address"
                type="email"
                placeholder="name@domain.com"
                leftIcon={<Mail className="w-4 h-4 text-stone-500" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={mode === 'signin'}
                required
              />
            </div>

            <div className="space-y-1.5 text-left">
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-stone-300">
                  Password
                </label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    onClick={() => {
                      setForgotEmail(email);
                      setIsForgotModalOpen(true);
                    }}
                    className="text-xs font-mono text-teal-400 hover:text-teal-300 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock className="w-4 h-4 text-stone-500" />}
                  rightIcon={
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {mode === 'signup' && (
                <span className="text-xs text-stone-500 font-mono block">
                  Must be at least 6 characters.
                </span>
              )}
            </div>

            <Button
              variant="primary"
              size="lg"
              type="submit"
              disabled={isSubmitting}
              rightIcon={<ArrowRight className="w-4 h-4" />}
              className="w-full bg-teal-600 hover:bg-teal-500 font-bold py-3 shadow-lg shadow-teal-600/20 mt-2"
            >
              {isSubmitting
                ? 'Processing...'
                : mode === 'signin'
                ? 'Enter Operating System'
                : 'Create Account & Begin'}
            </Button>
          </form>
        </div>

        {/* Security & Partition Notice */}
        <div className="text-center text-xs font-mono text-stone-500 space-y-1">
          <p>End-to-end data isolation enforced via Supabase Row-Level Security (RLS).</p>
          <p>Zero data is shared between user accounts.</p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      <Dialog
        isOpen={isForgotModalOpen}
        onClose={() => {
          setIsForgotModalOpen(false);
          setForgotStatus(null);
        }}
        title="Reset Password"
        description="Enter your account email to receive a password recovery link."
        maxWidth="sm"
      >
        <form onSubmit={handleSendReset} className="space-y-4 pt-2 text-left">
          {forgotStatus && (
            <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              forgotStatus.startsWith('Error')
                ? 'bg-red-950/40 border-red-850 text-red-300'
                : 'bg-emerald-950/40 border-emerald-850 text-emerald-300'
            }`}>
              {forgotStatus.startsWith('Error') ? (
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              )}
              <span>{forgotStatus}</span>
            </div>
          )}

          <Input
            label="Account Email"
            type="email"
            placeholder="name@domain.com"
            value={forgotEmail}
            onChange={(e) => setForgotEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="flex justify-end gap-2 pt-2 border-t border-stone-800">
            <Button
              variant="ghost"
              size="sm"
              type="button"
              onClick={() => setIsForgotModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              disabled={isSendingForgot}
            >
              {isSendingForgot ? 'Sending...' : 'Send Recovery Link'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
