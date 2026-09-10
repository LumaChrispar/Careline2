import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Activity, ArrowRight, ShieldCheck, Zap, ShieldAlert, Globe,
  HeartPulse, Plus, User as UserIcon, Brain, Stethoscope,
  ChevronDown, FlaskConical, ClipboardList, Syringe
} from 'lucide-react'
import useAuthStore from '../stores/authStore'

/*Animated background orb*/
const FloatingOrb = ({ style, dur = 8 }) => (
  <motion.div
    className="absolute rounded-full pointer-events-none"
    style={style}
    animate={{ y: [0, -30, 0], x: [0, 15, 0], scale: [1, 1.08, 1] }}
    transition={{ duration: dur, repeat: Infinity, ease: 'easeInOut' }}
  />
)

/*Counter that animates when scrolled into view*/
const AnimatedCounter = ({ target, suffix = '' }) => {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !started.current) {
        started.current = true
        let frame = 0
        const total = 50
        const step = () => {
          frame++
          setCount(Math.round((frame / total) * target))
          if (frame < total) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.5 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [target])

  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/*Data*/
const features = [
  { icon: Plus, title: 'Permanent Patient Records', desc: 'No paper, no loss. Full history retrievable in seconds even years later.', color: '#0ecfb0' },
  { icon: Zap, title: 'Instant Lab Notifications', desc: 'Result uploaded → doctor notified in under 60 seconds. No phone calls.', color: '#f59e0b' },
  { icon: ShieldAlert, title: 'Outbreak Radar', desc: '20+ cases in 14 days triggers an automatic facility-wide alert.', color: '#ef4444' },
  { icon: Globe, title: 'Works Fully Offline', desc: 'Data saves locally first. Syncs automatically when connectivity returns.', color: '#6366f1' },
  { icon: HeartPulse, title: 'Emergency QR Code', desc: 'Scannable QR shows blood group, allergies, and last diagnosis no login needed.', color: '#ec4899' },
  { icon: Brain, title: 'AI Diagnostics', desc: 'On-device AI reads RDT strips, X-rays, blood smears in under 10 seconds.', color: '#8b5cf6' },
  { icon: ClipboardList, title: 'Nursing Module', desc: 'Obs charts, MAR, fluid balance, wound assessment all digital and real-time.', color: '#0ecfb0' },
  { icon: Stethoscope, title: 'Doctor Cockpit', desc: 'E-prescribing, SOAP notes, differential diagnosis AI, ICD-10 coding.', color: '#f59e0b' },
  { icon: Syringe, title: 'Drug Safety Checks', desc: 'Automatic allergy, interaction, and dose range checks on every prescription.', color: '#ef4444' },
]

const roles = [
  { role: 'Patient', icon: UserIcon, desc: 'Self-registers. Views own records and prescriptions.', color: '#0ecfb0' },
  { role: 'Nurse', icon: ClipboardList, desc: 'Registers patients, triage, obs chart & manages arrivals.', color: '#6366f1' },
  { role: 'Lab Tech', icon: FlaskConical, desc: 'AI diagnostics, uploads results, triggers alerts.', color: '#f59e0b' },
  { role: 'Doctor', icon: Stethoscope, desc: 'Full cockpit: history, prescribe, order tests.', color: '#8b5cf6' },
  { role: 'Admin', icon: ShieldCheck, desc: 'Creates accounts. Manages facility settings.', color: '#ef4444' },
]

/*Animation variants*/
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.12 } } }
const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } }
}

/* ═══════════════════════════════════════════════════════════════ */
export default function LandingPage() {
  const { user, isLoading } = useAuthStore()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])

  if (isLoading) return null

  return (
    <div className="min-h-screen bg-[#04080f] text-white overflow-x-hidden"
         style={{ fontFamily: "'Sora', sans-serif" }}>

      {/*Ambient background*/}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <FloatingOrb dur={9} style={{ width: 600, height: 600, top: -200, left: -200,
          background: 'radial-gradient(circle, rgba(14,207,176,0.07) 0%, transparent 70%)' }} />
        <FloatingOrb dur={11} style={{ width: 500, height: 500, top: '30%', right: -150,
          background: 'radial-gradient(circle, rgba(99,102,241,0.06) 0%, transparent 70%)' }} />
        <FloatingOrb dur={13} style={{ width: 400, height: 400, bottom: '10%', left: '20%',
          background: 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', inset: 0,
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
          backgroundSize: '60px 60px' }} />
      </div>

      {/*NAV*/}
      <motion.nav
        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 px-4 sm:px-8 py-4 flex items-center justify-between transition-all duration-300 ${scrolled ? 'bg-[#04080f]/90 backdrop-blur-xl border-b border-white/5 shadow-2xl' : ''}`}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-[#0ecfb0] shadow-[0_0_20px_rgba(14,207,176,0.4)]">
            <Activity className="w-4 h-4 text-[#04080f]" />
          </div>
          <span className="text-base font-extrabold tracking-widest">
            ECO~<span className="text-[#0ecfb0]">MEDIK</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user ? (
            <Link to={user.role === 'patient' ? '/my-records' : '/dashboard'}
              className="bg-[#0ecfb0] text-[#04080f] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#0bc1a4] transition-colors">
              Dashboard
            </Link>
          ) : (
            <>
              <Link to="/login"
                className="text-white/50 px-4 py-2 rounded-xl font-semibold text-sm hover:text-white transition-colors hidden sm:block">
                Sign In
              </Link>
              <Link to="/register"
                className="bg-[#0ecfb0] text-[#04080f] px-4 py-2 rounded-xl font-bold text-sm hover:bg-[#0bc1a4] transition-colors">
                Get Started
              </Link>
            </>
          )}
        </div>
      </motion.nav>

      {/*HERO*/}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 sm:px-8 pt-24 pb-16 text-center">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 bg-[#0ecfb0]/10 border border-[#0ecfb0]/25 rounded-full px-3.5 py-1.5 mb-8">
          <motion.div className="w-1.5 h-1.5 bg-[#0ecfb0] rounded-full"
            animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
          <span className="text-[11px] font-bold text-[#0ecfb0] uppercase tracking-[0.2em]">
            Live across Cameroon
          </span>
        </motion.div>

        <motion.div variants={stagger} initial="hidden" animate="show" className="max-w-4xl">
          <motion.h1 variants={fadeUp}
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold leading-[1.04] tracking-[-0.04em] mb-6">
            Healthcare<br />that works for<br />
            <span className="text-[#0ecfb0] relative inline-block">
              everyone.
              <motion.span className="absolute -bottom-2 left-0 right-0 h-[3px] bg-[#0ecfb0]/30 rounded-full"
                initial={{ scaleX: 0 }} animate={{ scaleX: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                style={{ transformOrigin: 'left' }} />
            </span>
          </motion.h1>

          <motion.p variants={fadeUp}
            className="text-base sm:text-lg text-white/45 leading-relaxed max-w-xl mx-auto mb-10"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            Digitising patient records, delivering lab results in real time,
            and detecting outbreaks before they spread built for clinics
            with no stable internet.
          </motion.p>

          <motion.div variants={fadeUp}
            className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Link to="/register"
              className="w-full sm:w-auto bg-[#0ecfb0] text-[#04080f] px-8 py-4 rounded-2xl font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-[#0bc1a4] transition-all hover:shadow-[0_0_30px_rgba(14,207,176,0.3)] hover:scale-105 active:scale-95">
              Get started <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/login"
              className="w-full sm:w-auto border border-white/12 text-white px-8 py-4 rounded-2xl font-semibold text-[15px] flex items-center justify-center hover:bg-white/5 transition-all">
              Staff portal login
            </Link>
          </motion.div>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.7 }}
          className="flex flex-wrap justify-center gap-8 sm:gap-12">
          {[
            { val: 1247, suffix: '', label: 'Patients registered' },
            { val: 6, suffix: '', label: 'Roles supported' },
            { val: 100, suffix: '%', label: 'Offline capable' },
            { val: 10, suffix: 's', label: 'AI result time' },
          ].map((s, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-white">
                <AnimatedCounter target={s.val} suffix={s.suffix} />
              </div>
              <div className="text-xs text-white/35 mt-0.5"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* Scroll hint */}
        <motion.div className="absolute bottom-8 left-1/2 -translate-x-1/2"
          animate={{ y: [0, 10, 0] }} transition={{ duration: 1.8, repeat: Infinity }}>
          <ChevronDown className="w-5 h-5 text-white/20" />
        </motion.div>
      </section>

      {/*PREVIEW CARDS (md+)*/}
      <section className="relative z-10 hidden md:block max-w-5xl mx-auto px-8 -mt-8 mb-20">
        <div className="grid grid-cols-3 gap-4">
          {/* Outbreak card */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="p-4 rounded-2xl bg-[#1a0808] border border-red-500/20 shadow-2xl shadow-red-500/10">
            <div className="flex items-center gap-2 mb-2">
              <motion.div className="w-2 h-2 bg-red-400 rounded-full"
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }} />
              <span className="text-[11px] font-bold text-red-400">OUTBREAK ALERT</span>
            </div>
            <p className="text-[11px] text-white/40 mb-2">Malaria cluster Bamenda Central</p>
            <div className="text-3xl font-extrabold text-red-400">23</div>
            <div className="text-[10px] text-white/30">cases in 14 days</div>
          </motion.div>

          {/* Patient queue card */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.1 }}
            className="p-4 rounded-2xl bg-[#0a1428]/80 border border-[#0ecfb0]/15 backdrop-blur-md shadow-2xl">
            <div className="text-[10px] font-bold text-white/50 uppercase tracking-widest mb-3">Patient Queue</div>
            {[
              { initials: 'AM', name: 'Amara Oumarou', status: 'Critical', cls: 'text-red-400' },
              { initials: 'CF', name: 'Christelle Foa', status: 'Stable', cls: 'text-[#0ecfb0]' },
              { initials: 'IS', name: 'Ibrahim Saliou', status: 'Lab pending', cls: 'text-amber-400' },
            ].map((p, i) => (
              <div key={i} className="flex items-center gap-2 py-1.5 border-b border-white/5 last:border-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#0ecfb0] to-[#0a9e87] flex items-center justify-center text-[10px] font-bold text-[#04080f]">
                  {p.initials}
                </div>
                <div className="flex-1 text-[12px] font-semibold">{p.name}</div>
                <div className={`text-[10px] font-bold ${p.cls}`}>{p.status}</div>
              </div>
            ))}
          </motion.div>

          {/* Lab card */}
          <motion.div initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }} transition={{ delay: 0.2 }}
            className="p-4 rounded-2xl bg-[#0d1f14] border border-[#0ecfb0]/20 shadow-2xl shadow-[#0ecfb0]/5">
            <div className="w-8 h-8 bg-[#0ecfb0]/15 rounded-lg flex items-center justify-center mb-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0ecfb0]" />
            </div>
            <div className="text-sm font-bold mb-1">Lab result ready</div>
            <div className="text-[11px] text-white/35 leading-tight">
              Fatou Diallo · Malaria RDT<br />Doctor notified automatically
            </div>
            <motion.div className="mt-3 h-1 bg-[#0ecfb0]/20 rounded-full overflow-hidden">
              <motion.div className="h-full bg-[#0ecfb0] rounded-full"
                initial={{ width: '0%' }} animate={{ width: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }} />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/*FEATURES*/}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-14">
          <div className="text-[11px] font-bold text-[#0ecfb0] tracking-[0.2em] uppercase mb-3">
            What we solve
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold leading-tight tracking-tight">
            Built around real<br />
            <span className="text-white/20">clinical problems.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.02, y: -4 }}
              className="group p-7 rounded-2xl bg-white/[0.03] border border-white/[0.07] hover:border-white/20 transition-all cursor-default relative overflow-hidden">
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl"
                style={{ background: `radial-gradient(circle at 30% 30%, ${f.color}22, transparent 70%)` }} />
              <div className="relative z-10">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 border border-white/10 bg-white/5 group-hover:border-white/20 transition-colors"
                  style={{ boxShadow: `0 0 20px ${f.color}22` }}>
                  <f.icon className="w-5 h-5 transition-colors" style={{ color: f.color }} />
                </div>
                <h3 className="text-[15px] font-bold mb-2">{f.title}</h3>
                <p className="text-[13px] text-white/35 leading-relaxed"
                  style={{ fontFamily: "'DM Sans', sans-serif" }}>{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/*ROLES*/}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-20">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }} className="text-center mb-12">
          <div className="text-[11px] font-bold text-[#0ecfb0] tracking-[0.2em] uppercase mb-3">
            Who uses it
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
            One platform, <span className="text-white/20">six roles.</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {roles.map((r, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ scale: 1.05 }}
              className="group bg-white/[0.03] border border-white/[0.07] rounded-2xl p-5 text-center hover:border-white/20 transition-all cursor-default">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-white/10 bg-white/5 group-hover:bg-white/10 transition-colors"
                style={{ boxShadow: `0 0 20px ${r.color}22` }}>
                <r.icon className="w-5 h-5" style={{ color: r.color }} />
              </div>
              <div className="text-[13px] font-bold mb-1">{r.role}</div>
              <div className="text-[11px] text-white/30 leading-tight"
                style={{ fontFamily: "'DM Sans', sans-serif" }}>{r.desc}</div>
            </motion.div>
          ))}
        </div>
      </section>

      {/*CTA*/}
      <section className="relative z-10 max-w-6xl mx-auto px-4 sm:px-8 py-20 mb-16">
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative overflow-hidden rounded-[28px] border border-[#0ecfb0]/15 p-10 sm:p-16"
          style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(14,207,176,0.08), transparent 70%), rgba(255,255,255,0.02)' }}>
          <div className="absolute inset-0 pointer-events-none">
            <motion.div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#0ecfb0]/40 to-transparent"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 3, repeat: Infinity }} />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10">
            <div className="text-center md:text-left">
              <h2 className="text-3xl sm:text-5xl font-extrabold tracking-tighter leading-tight mb-3">
                Ready to bring<br />your clinic online?
              </h2>
              <p className="text-base text-white/40" style={{ fontFamily: "'DM Sans', sans-serif" }}>
                Set up takes minutes. No technical knowledge required.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full md:w-auto md:min-w-[220px]">
              <Link to="/register"
                className="bg-[#0ecfb0] text-[#04080f] px-8 py-4 rounded-xl font-bold text-[14px] text-center hover:bg-[#0bc1a4] transition-all hover:shadow-[0_0_30px_rgba(14,207,176,0.3)] hover:scale-105 active:scale-95">
                Register as a patient
              </Link>
              <Link to="/login"
                className="border border-white/12 text-white px-8 py-4 rounded-xl font-bold text-[14px] text-center hover:bg-white/5 transition-all">
                Staff portal login
              </Link>
            </div>
          </div>
        </motion.div>
      </section>

      {/*FOOTER*/}
      <footer className="relative z-10 border-t border-white/5 py-10 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <span className="text-sm font-extrabold tracking-widest">
            ECO~<span className="text-[#0ecfb0]">MEDIK</span>
          </span>
          <div className="flex gap-8 text-[12px] text-white/25 font-medium uppercase tracking-widest"
            style={{ fontFamily: "'DM Sans', sans-serif" }}>
            <a href="#" className="hover:text-[#0ecfb0] transition-colors">Network</a>
            <a href="#" className="hover:text-[#0ecfb0] transition-colors">Security</a>
            <a href="#" className="hover:text-[#0ecfb0] transition-colors">Hospitals</a>
          </div>
          <p className="text-[12px] text-white/15" style={{ fontFamily: "'DM Sans', sans-serif" }}>
            © 2026 ECO~MEDIK. ALL RIGHTS RESERVED.
          </p>
        </div>
      </footer>
    </div>
  )
}
