import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles, ShieldCheck, Zap, HeartPulse } from 'lucide-react'
import useAuthStore from '../stores/authStore'

const TRUST_ITEMS = [
  { icon: ShieldCheck, label: 'Your care workspace', sub: 'Patient records in one place' },
  { icon: Zap,         label: 'Laboratory records', sub: 'View reports and review results' },
  { icon: HeartPulse,  label: 'Connected care', sub: 'Sign in with your facility account' },
]

const ECG_PATH =
  'M0,32 L60,32 L75,32 L88,10 L96,54 L104,4 L112,54 L120,32 L170,32 L185,32 L198,18 L206,46 L214,32 L260,32 L275,32 L288,10 L296,54 L304,4 L312,54 L320,32 L380,32'

export default function LoginPage() {
  const [email, setEmail]             = useState('')
  const [password, setPassword]       = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError]             = useState('')
  const [isLoading, setIsLoading]     = useState(false)
  const { login }                     = useAuthStore()
  const navigate                      = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)
    try {
    const result = await login(email, password)
    if (result.success) navigate(useAuthStore.getState().role === 'patient' ? '/my-records' : '/dashboard')
    else setError(result.error)
    } catch (error) { setError(error.message || 'Unable to sign in. Please retry.') }
    finally { setIsLoading(false); useAuthStore.setState({ isLoading: false }) }
  }

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
          className="absolute bottom-0 left-0 w-80 h-80 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(14,207,176,0.08) 0%, transparent 70%)', transform: 'translate(-30%, 30%)' }}
        />

        {/* Logo */}
        <div>
          <Link to="/" className="flex items-center gap-3 mb-16">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: '#0ecfb0' }}
            >
              <Activity className="w-5 h-5" style={{ color: '#04080f' }} />
            </div>
            <span className="text-white font-black text-lg tracking-widest">
              ECO~<span style={{ color: '#0ecfb0' }}>MEDIK</span>
            </span>
          </Link>

          {/* Headline */}
          <h2
            className="text-5xl font-black leading-[1.08] text-white mb-6"
            style={{ letterSpacing: '-2px' }}
          >
            Healthcare<br />
            <span style={{ color: '#0ecfb0' }}>intelligence</span><br />
            for every clinic.
          </h2>
          <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
            Digitising patient records, delivering lab results in real time,
            and detecting outbreaks built for areas with unreliable internet.
          </p>
        </div>

        {/* ECG decoration */}
        <div className="my-10">
          <svg viewBox="0 0 380 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d={ECG_PATH} stroke="#0ecfb0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.4" />
            <path d={ECG_PATH} stroke="#0ecfb0" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.15" strokeDasharray="4 8" />
          </svg>
        </div>

        {/* Trust items */}
        <div className="space-y-5">
          {TRUST_ITEMS.map(({ icon: Icon, label, sub }) => (
            <div key={label} className="flex items-center gap-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: 'rgba(14,207,176,0.08)', border: '1px solid rgba(14,207,176,0.18)' }}
              >
                <Icon className="w-4 h-4" style={{ color: '#0ecfb0' }} />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{label}</p>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom facility note */}
        <p className="text-xs mt-10" style={{ color: 'rgba(255,255,255,0.15)', fontFamily: "'DM Sans', sans-serif" }}>
          Staff accounts are created by your facility administrator.<br />
          Patients can self-register above.
        </p>
      </div>

      {/*RIGHT PANEL — FORM*/}
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
              Secure portal
            </div>
            <h1
              className="text-4xl font-black text-white"
              style={{ letterSpacing: '-1.5px' }}
            >
              Sign In
            </h1>
            <p className="mt-2 text-sm" style={{ color: 'rgba(255,255,255,0.35)', fontFamily: "'DM Sans', sans-serif" }}>
              Welcome back, enter your credentials to continue.
            </p>
          </div>

          {/* FORM (unchanged) */}
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

          <form onSubmit={handleSubmit} className="space-y-6">
            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
              <label className="block text-xs font-bold uppercase tracking-widest mb-2 px-1 text-slate-400">
                Identity Identifier
              </label>
              <div className="relative flex items-center group">
                <Mail className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-[#0ecfb0] transition-colors pointer-events-none z-20" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Phone or Hospital Email"
                  className="w-full bg-white/[0.03] border-white/5 focus:border-[#0ecfb0]/30 focus:bg-white/[0.05] rounded-2xl py-4 pr-4 auth-input-with-icon text-white placeholder:text-slate-600 transition-all outline-none relative z-10"
                  required
                />
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
              <div className="flex justify-between items-center mb-2 px-1">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-400">Secure Pin</label>
                <Link to="#" className="text-[10px] font-bold text-primary-light/50 hover:text-primary-light uppercase tracking-tighter">
                  Forgot Secret?
                </Link>
              </div>
              <div className="relative flex items-center group">
                <Lock className="absolute left-4 w-5 h-5 text-slate-500 group-focus-within:text-[#0ecfb0] transition-colors pointer-events-none z-20" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
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
            </motion.div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              className="w-full py-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all"
              style={{ background: '#0ecfb0', color: '#04080f' }}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(4,8,15,0.2)', borderTopColor: '#04080f' }} />
                  Checking clearance...
                </>
              ) : (
                <>
                  Initialize Session <ArrowRight className="w-5 h-5" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)', fontFamily: "'DM Sans', sans-serif" }}>or</span>
            <div className="flex-1 h-px" style={{ background: 'rgba(255,255,255,0.06)' }} />
          </div>

          {/* Register link */}
          <div
            className="rounded-2xl p-5 flex items-center justify-between"
            style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">New to ECO~MEDIK?</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: "'DM Sans', sans-serif" }}>
                Patients can create their own account.
              </p>
            </div>
            <Link
              to="/register"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{ background: 'rgba(14,207,176,0.1)', border: '1px solid rgba(14,207,176,0.2)', color: '#0ecfb0' }}
            >
              <Sparkles className="w-4 h-4" />
              Register
            </Link>
          </div>

        </motion.div>
      </div>
    </div>
  )
}
