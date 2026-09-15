import { useEffect,useState,useRef } from 'react'
import { NavLink,Outlet,Link } from 'react-router-dom'
import { LayoutDashboard,Users,FlaskConical,Pill,CalendarDays,ArrowRightLeft,Receipt,Building2,UserCog,ClipboardList,HeartPulse,LogOut,Menu,X,MessageSquare,Settings } from 'lucide-react'
import useAuthStore from '../../stores/authStore'
const links=[
 ['/dashboard','Today',LayoutDashboard,['admin','nurse','doctor','labtech','pharmacist']],
 ['/tasks','Tasks',ClipboardList,['admin','nurse','doctor','labtech','pharmacist']],
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
 const menuButton=useRef(null), sidebar=useRef(null)
 const [mobile,setMobile]=useState(()=>window.matchMedia('(max-width: 800px)').matches)
 useEffect(()=>{const media=window.matchMedia('(max-width: 800px)');const update=()=>{setMobile(media.matches);if(!media.matches)setOpen(false)};media.addEventListener('change',update);return()=>media.removeEventListener('change',update)},[])
 useEffect(()=>{
  if(!open||!mobile)return
  const previousOverflow=document.body.style.overflow
  document.body.style.overflow='hidden'
  const focusable=()=>[...sidebar.current.querySelectorAll('a,button,select,summary')].filter(el=>!el.disabled&&el.getClientRects().length>0)
  focusable()[0]?.focus()
  const keydown=e=>{if(e.key==='Escape'){setOpen(false);return}if(e.key==='Tab'){const nodes=focusable(),first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus()}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus()}}}
  document.addEventListener('keydown',keydown)
  return()=>{document.body.style.overflow=previousOverflow;document.removeEventListener('keydown',keydown);menuButton.current?.focus()}
 },[open,mobile])
 const primaryPaths=role==='patient'?['/my-records','/institutions','/account']:['/dashboard',role==='labtech'?'/lab':role==='pharmacist'?'/pharmacy':'/patients','/tasks']
 const available=links.filter(l=>!l[3]||l[3].includes(role))
 const renderLink=([path,label,Icon])=><NavLink key={path} to={path} onClick={()=>setOpen(false)}><Icon size={19}/><span>{label}</span></NavLink>
 const current=memberships.find(m=>m.facility_id===user?.user_metadata?.facility_id)
 return <div className="care-shell"><a href="#main-content" className="skip-link">Skip to content</a>{open&&<button className="care-backdrop" aria-label="Close navigation" onClick={()=>setOpen(false)}/>}<aside id="workspace-navigation" ref={sidebar} inert={mobile&&!open} aria-hidden={mobile&&!open} aria-label="Workspace navigation" className={'care-sidebar '+(open?'is-open':'')}><Link to="/" className="care-wordmark"><img src="/careline-mark-v2.png" alt="" aria-hidden="true"/>careline<span>+</span></Link><button className="care-nav-close" aria-label="Close navigation" onClick={()=>setOpen(false)}><X size={20}/></button><p className="care-sidebar-caption">CARE THAT STAYS CONNECTED</p><nav aria-label="Main workspace">{available.filter(l=>primaryPaths.includes(l[0])).map(renderLink)}<details className="care-nav-more"><summary>More workspace tools</summary>{available.filter(l=>!primaryPaths.includes(l[0])).map(renderLink)}</details></nav><div className="care-sidebar-bottom"><span className={'care-connectivity '+(online?'':'is-offline')}>● {online?'Connected':'Offline — intake drafts only'}</span><div className="care-user"><div className="care-avatar small">{user?.name?.[0]||'C'}</div><div><strong>{user?.name||'Careline member'}</strong><small>{role==='nurse'?'Nurse · reception & care':role}</small></div></div><button onClick={()=>logout().catch(e=>setError(e.message))}><LogOut size={17}/> Sign out</button></div></aside>
 <div className="care-main" inert={mobile&&open} aria-hidden={mobile&&open}><header className="care-topbar"><button ref={menuButton} className="care-mobile-menu" aria-controls="workspace-navigation" aria-expanded={open} aria-label="Open navigation" onClick={()=>setOpen(true)}><Menu/></button><div><strong>{current?.name||'Your Careline'}</strong><p>{new Date().toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long'})}</p></div>{memberships.length>1&&<label>Institution <select aria-label="Current institution" value={current?.facility_id||''} disabled={switching} onChange={async e=>{setSwitching(true);try{await switchFacility(e.target.value)}catch(e){setError(e.message)}finally{setSwitching(false)}}}>{memberships.map(m=><option value={m.facility_id} key={m.facility_id}>{m.name}</option>)}</select></label>}<Link to="/account" className="care-account-link">My account ↗</Link></header><main id="main-content">{error&&<div role="alert" className="care-error">{error}<button onClick={()=>setError('')} aria-label="Dismiss error"><X size={16}/></button></div>}{!online&&<div className="care-notice">Connection interrupted. Only patient intake can be saved as a temporary draft. Reconnect before saving other changes.</div>}<Outlet/></main><nav className="care-bottom-nav" aria-label="Quick navigation">{available.filter(l=>primaryPaths.includes(l[0])).map(renderLink)}<button onClick={()=>setOpen(true)} aria-label="More workspace tools"><Menu size={19}/><span>More</span></button></nav></div></div>
}
