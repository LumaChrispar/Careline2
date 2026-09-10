import { useEffect,useState } from 'react'
import { NavLink,Outlet,Link } from 'react-router-dom'
import { LayoutDashboard,Users,FlaskConical,Pill,CalendarDays,ArrowRightLeft,Receipt,Building2,UserCog,ClipboardList,HeartPulse,LogOut,Menu,X,MessageSquare,Settings } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
const links=[
 ['/dashboard','Today',LayoutDashboard,['admin','nurse','doctor','labtech','pharmacist']],
 ['/patients','Patients',Users,['admin','nurse','doctor']],
 ['/appointments','Appointments',CalendarDays,['admin','nurse','doctor']],
 ['/lab','Laboratory',FlaskConical,['admin','doctor','nurse','labtech']],
 ['/pharmacy','Pharmacy',Pill,['admin','pharmacist']],
 ['/referrals','Referrals',ArrowRightLeft,['admin','doctor','nurse']],
 ['/billing','Billing',Receipt,['admin','nurse','pharmacist']],
 ['/my-records','My care',HeartPulse,['patient']],
 ['/institutions','Institutions',Building2,null],
 ['/communication','Notice board',MessageSquare,['admin','nurse','doctor','labtech','pharmacist']],
 ['/admin/users','Team & access',UserCog,['admin']],
 ['/pending','Pending intake',ClipboardList,['admin','doctor','nurse']],
 ['/account','My account',Settings,null],
]
export default function AppLayout(){
 const {user,role,memberships,switchFacility,logout}=useAuthStore()
 const [open,setOpen]=useState(false),[online,setOnline]=useState(navigator.onLine),[error,setError]=useState(''),[switching,setSwitching]=useState(false)
 useEffect(()=>{const update=()=>setOnline(navigator.onLine);window.addEventListener('online',update);window.addEventListener('offline',update);return()=>{window.removeEventListener('online',update);window.removeEventListener('offline',update)}},[])
 const current=memberships.find(m=>m.facility_id===user?.user_metadata?.facility_id)
 return <div className="care-shell"><a href="#main-content" className="skip-link">Skip to content</a>{open&&<button className="care-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside className={'care-sidebar '+(open?'is-open':'')}><Link to="/" className="care-wordmark">careline<span>+</span></Link><p className="care-sidebar-caption">CARE THAT STAYS CONNECTED</p><nav>{links.filter(l=>!l[3]||l[3].includes(role)).map(([path,label,Icon])=><NavLink key={path} to={path} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>)}</nav><div className="care-sidebar-bottom"><span className={'care-connectivity '+(online?'':'is-offline')}>● {online?'Connected':'Offline — intake drafts only'}</span><div className="care-user"><div className="care-avatar small">{user?.name?.[0]||'C'}</div><div><strong>{user?.name||'Careline member'}</strong><small>{role==='nurse'?'Nurse · reception & care':role}</small></div></div><button onClick={()=>logout().catch(e=>setError(e.message))}><LogOut size={17}/> Sign out</button></div></aside>
 <div className="care-main"><header className="care-topbar"><button className="care-mobile-menu" aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu/></button><div><strong>{current?.name||'Your Careline'}</strong><p>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p></div>{memberships.length>1&&<label>Institution <select aria-label="Current institution" value={current?.facility_id||''} disabled={switching} onChange={async e=>{setSwitching(true);try{await switchFacility(e.target.value)}catch(e){setError(e.message)}finally{setSwitching(false)}}}>{memberships.map(m=><option value={m.facility_id} key={m.facility_id}>{m.name}</option>)}</select></label>}<Link to="/account" className="care-account-link">My account ↗</Link></header><main id="main-content">{error&&<div role="alert" className="care-error">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{!online&&<div className="care-notice">Connection interrupted. Only patient intake can be saved as a temporary draft. Reconnect before saving other changes.</div>}<Outlet/></main></div></div>
}
