import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, User, Phone, Lock, Eye, EyeOff, ArrowRight, CheckCircle, ShieldCheck, Clock, FileText } from 'lucide-react'
import useAuthStore from '../stores/authStore'

const STEPS = [
  { icon: User,        label: 'Create your identity',   sub: 'Name and phone number' },
  { icon: FileText,    label: 'Complete health profile', sub: 'Blood group, allergies, next of kin' },
  { icon: ShieldCheck, label: 'Access your records',     sub: 'Lab results, visits, prescriptions' },
]

const ECG_PATH =
  'M0,32 L60,32 L75,32 L88,10 L96,54 L104,4 L112,54 L120,32 L170,32 L185,32 L198,18 L206,46 L214,32 L260,32 L275,32 L288,10 L296,54 L304,4 L312,54 L320,32 L380,32'

export default function PatientRegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', phone: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]               = useState('')
  const [isLoading, setIsLoading]       = useState(false)
  const [success, setSuccess]           = useState(false)
  const { registerPatient }             = useAuthStore()
  const navigate                        = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.first_name.trim() || !form.last_name.trim() || !form.phone.trim() || !form.password) {
      setError('Please fill in all required fields.')
      return
    }
    setIsLoading(true)
    const result = await registerPatient(form, form.password)
    setIsLoading(false)
    if (result.success) {
      setSuccess(true)
      setTimeout(() => navigate('/my-records'), 2000)
    } else {
      setError(result.error || 'Registration failed. Please try again.')
    }
  }

  /*SUCCESS SCREEN*/
  if (success) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6"
        style={{ background: '#04080f' }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-sm w-full text-center"
        >
          <div
            className="w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center"
            style={{ background: 'rgba(14,207,176,0.1)', border: '1px solid rgba(14,207,176,0.25)' }}
          >
            <CheckCircle className="w-10 h-10" style={{ color: '#0ecfb0' }} />
          </div>
          <h2 className="text-3xl font-black text-white mb-3" style={{ letterSpacing: '-1px' }}>
            Welcome aboard.
          </h2>
          <p className="text-sm leading-relaxed mb-2" style={{ color: 'rgba(255,255,255,0.4)', fontFamily: "'DM Sans', sans-serif" }}>
            Your patient account has been created. Complete your health profile inside the app whenever you're ready.
          </p>
          <p className="text-xs flex items-center justify-center gap-2" style={{ color: 'rgba(255,255,255,0.2)' }}>
            <Clock className="w-3 h-3" /> Redirecting to your dashboard...
          </p>
        </motion.div>
      </div>
    )
  }

  /*MAIN PAGE*/
  return (
    <div className="min-h-screen flex" style={{ background: '#04080f', fontFamily: "'Sora', system-ui, sans-serif" }}>

      {/*LEFT PANEL*/}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 relative overflow-hidden p-14"
        style={{ borderRight: '1px solid rgba(255,255,255,0.05)' }}
      >
        {/* Vertical accent line */}
        <div
          className="absolute top-0 right-0 w-px h-full"
          style={{ background: 'linear-gradient(to bottom, transparent, #0ecfb0 40%, transparent)' }}
        />

        {/* Teal glow blob */}
        <div
          className="absolute top-0 right-0 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,207,176,0.06) 0%, transparent 70%)', transform: 'translate(30%, -30%)' }}
        />

        {/* Logo */}
        <div>
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#0ecfb0' }}>
              <Activity className="w-5 h-5" style={{ color: '#04080f' }} />
            </div>
            <span className="text-white font-black text-lg tracking-widest">
              ECO~<span style={{ color: '#0ecfb0' }}>MEDIK</span>
            </span>
          </Link>

          <div
            className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
            style={{ background: 'rgba(14,207,176,0.08)', border: '1px solid rgba(14,207,176,0.2)', color: '#0ecfb0' }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ecfb0', display: 'inline-block' }} />
            Patient portal
          </div>

          <h2
            className="text-5xl font-black leading-[1.08] text-white mb-6"
            style={{ letterSpacing: '-2px' }}
          >
            Your health,<br />
            <span style={{ color: '#0ecfb0' }}>always</span><br />
            with you.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
            Register once. Access your full medical history, lab results,
            and prescriptions from any device even offline.
          </p>
        </div>

        {/* ECG decoration */}
        <div className="my-10">
          <svg viewBox="0 0 380 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d={ECG_PATH} stroke="#0ecfb0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            <path d={ECG_PATH} stroke="#0ecfb0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" strokeDasharray="4 8" />
          </svg>
        </div>

        {/* 3-step onboarding flow */}
        <div className="space-y-0">
          <p className="text-xs font-bold uppercase tracking-widest mb-5" style={{ color: 'rgba(255,255,255,0.2)' }}>
            Getting started 3 steps
          </p>
          {STEPS.map(({ icon: Icon, label, sub }, i) => (
            <div key={label} className="flex gap-4">
              {/* Timeline connector */}
              <div className="flex flex-col items-center">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                  style={{
                    background: i === 0 ? '#0ecfb0' : 'rgba(14,207,176,0.08)',
                    border: '1px solid rgba(14,207,176,0.25)',
                  }}
                >
                  <Icon className="w-4 h-4" style={{ color: i === 0 ? '#04080f' : '#0ecfb0' }} />
                </div>
                {i < STEPS.length - 1 && (
                  <div className="w-px flex-1 my-1" style={{ background: 'rgba(14,207,176,0.15)', minHeight: 24 }} />
                )}
              </div>
              <div className="pb-5">
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.15)', fontFamily: "'DM Sans', sans-serif" }}>
          Staff accounts are created by your facility administrator.
          <br />This portal is for patients only.
        </p>
      </div>

      {/*RIGHT PANEL FORM */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden">

        {/* Subtle grid texture */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(rgba(14,207,176,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(14,207,176,0.03) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
          className="w-full max-w-md relative z-10"
        >
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: '#0ecfb0' }}>
              <Activity className="w-5 h-5" style={{ color: '#04080f' }} />
            </div>
            <span className="text-white font-black text-lg tracking-widest">
              ECO~<span style={{ color: '#0ecfb0' }}>MEDIK</span>
            </span>
          </div>

          {/* Form header */}
          <div className="mb-10">
            <div
              className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase"
              style={{ background: 'rgba(14,207,176,0.08)', border: '1px solid rgba(14,207,176,0.2)', color: '#0ecfb0' }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ecfb0', display: 'inline-block' }} />
              Step 1 of 3 Basic identity
            </div>
            <h1 className="text-4xl font-black text-white" style={{ letterSpacing: '-1.5px' }}>
              Quick Signup
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
              Takes less than a minute. Complete your health profile later.
            </p>
          </div>

          {/*FORM (unchanged)*/}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="mb-6 px-4 py-3 rounded-xl text-sm flex items-center gap-2"
                style={{ border: '1px solid rgba(248,113,113,0.2)', background: 'rgba(248,113,113,0.05)', color: '#f87171' }}
              >
                <Activity className="w-4 h-4" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Names */}
            <div className="grid grid-cols-2 gap-4">
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 px-1 text-slate-400">First Name</label>
                <div className="relative flex items-center group">
                  <User className="absolute left-4 w-4 h-4 text-slate-500 group-focus-within:text-[#0ecfb0] transition-colors pointer-events-none z-20" />
                  <input
                    name="first_name"
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="John"
                    className="w-full bg-white/[0.03] border-white/5 focus:border-[#0ecfb0]/30 focus:bg-white/[0.05] rounded-2xl py-4 pr-4 auth-input-with-icon text-white placeholder:text-slate-600 transition-all outline-none relative z-10 text-sm"
                    required
                  />
                </div>
              </motion.div>
              <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                <label className="block text-xs font-bold uppercase tracking-widest mb-2 px-1 text-slate-400">Last Name</label>
                <div className="relative flex items-center group">
                  <User className="absolute left-4 w-4 h-4 text-slate-500 group-focus-within:text-[#0ecfb0] transition-colors pointer-events-none z-20" />
                  <input
                    name="last_name"
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Doe"
                    className="w-full bg-white/[0.03] border-white/5 focus:border-[#0ecfb0]/30 focus:bg-white/[0.05] rounded-2xl py-4 pr-4 auth-input-with-icon text-white placeholder:text-slate-600 transition-all outline-none relative z-10 text-sm"
                    required
                  />
                </div>
              </motion.div>
            </div>

            {/* Phone */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 px-1 text-slate-400">Mobile Identifier</label>
              <div className="relative flex items-center group">
                <Phone className="absolute left-4 w-4 h-4 text-slate-500 group-focus-within:text-[#0ecfb0] transition-colors pointer-events-none z-20" />
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="+237 6XX XXX XXX"
                  className="w-full bg-white/[0.03] border-white/5 focus:border-[#0ecfb0]/30 focus:bg-white/[0.05] rounded-2xl py-4 pr-4 auth-input-with-icon text-white placeholder:text-slate-600 transition-all outline-none relative z-10"
                  required
                />
              </div>
            </motion.div>

            {/* Password */}
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 px-1 text-slate-400">Access Password</label>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 w-4 h-4 text-slate-500 group-focus-within:text-[#0ecfb0] transition-colors pointer-events-none z-20" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full bg-white/[0.03] border-white/5 focus:border-[#0ecfb0]/30 focus:bg-white/[0.05] rounded-2xl py-4 pr-12 auth-input-with-icon text-white placeholder:text-slate-600 transition-all outline-none relative z-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white z-20"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs mt-2 px-1" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans', sans-serif" }}>
                Use at least 8 characters with a mix of letters and numbers.
              </p>
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all mt-2"
              style={{ background: '#0ecfb0', color: '#04080f' }}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(4,8,15,0.2)', borderTopColor: '#04080f' }} />
                  Establishing secure identity...
                </>
              ) : (
                <>
                  Begin Your Journey <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans', sans-serif" }}>already registered?</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Sign-in link */}
          <div
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">Have an account?</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
                Sign in to your patient portal.
              </p>
            </div>
            <Link
              to="/login"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(14,207,176,0.1)', border: '1px solid rgba(14,207,176,0.2)', color: '#0ecfb0' }}
            >
              Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.15)', fontFamily: "'DM Sans', sans-serif" }}>
            By registering you agree to our terms of service and privacy policy.
          </p>

        </motion.div>
      </div>
    </div>
  )
}