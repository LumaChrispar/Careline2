import { BrowserRouter,Routes,Route,Navigate } from 'react-router-dom'
import { useEffect,lazy,Suspense } from 'react'
import useAuthStore from './stores/authStore'
import AppLayout from './components/layout/AppLayout'
import AuthPage from './pages/AuthPage'
import CareLandingPage from './pages/CareLandingPage'
import { syncIntake } from './lib/offline'
const Tasks=lazy(()=>import('./pages/TasksPage'))
const Worklist=lazy(()=>import('./pages/WorklistPage'))
const Patients=lazy(()=>import('./pages/CarePatientsPage'))
import Intake from './pages/CareIntakePage'
const Patient=lazy(()=>import('./pages/CarePatientPage'))
const Labs=lazy(()=>import('./pages/CareLabPage'))
const Upload=lazy(()=>import('./pages/CareUploadPage'))
const Pharmacy=lazy(()=>import('./pages/PharmacyPage'))
const Appointments=lazy(()=>import('./pages/AppointmentsPage'))
const Referrals=lazy(()=>import('./pages/ReferralsPage'))
const Billing=lazy(()=>import('./pages/BillingPage'))
const Institutions=lazy(()=>import('./pages/InstitutionsPage'))
const Team=lazy(()=>import('./pages/CareStaffPage'))
const Portal=lazy(()=>import('./pages/CarePortalPage'))
import Pending from './pages/PendingPage'
const Account=lazy(()=>import('./pages/AccountPage'))
const NoticeBoard=lazy(()=>import('./pages/StaffCommunicationPage'))
function Guard({roles,children}){
 const {user,role}=useAuthStore()
 if(!user)return <Navigate to="/login" replace/>
 if(roles&&!roles.includes(role))return <Navigate to={role==='patient'?'/my-records':'/dashboard'} replace/>
 return children
}
export default function App(){
 const {user,role,isInitialized,error,initSession,refreshContext,logout}=useAuthStore()
 useEffect(()=>initSession(),[initSession])
 useEffect(()=>{
  if(!user)return
  const sync=()=>syncIntake(user.id).catch(()=>{})
  const refresh=()=>{if(navigator.onLine){refreshContext();sync()}}
  window.addEventListener('online',refresh);window.addEventListener('focus',refresh)
  const timer=setInterval(()=>{if(navigator.onLine)refreshContext()},60000)
  sync()
  return()=>{window.removeEventListener('online',refresh);window.removeEventListener('focus',refresh);clearInterval(timer)}
 },[user?.id,refreshContext])
 if(!isInitialized)return <div className="app-loading" role="status">Opening Careline…</div>
 if(error)return <main className="care-auth"><div className="care-auth-card"><h1>Your workspace is unavailable</h1><p role="alert">{error}</p><button className="btn btn-primary" onClick={()=>refreshContext()}>Try again</button><button className="btn btn-ghost" onClick={()=>logout().catch(e=>useAuthStore.setState({error:e.message}))}>Sign out</button></div></main>
 const home=role==='patient'?'/my-records':'/dashboard'
 const staff=['admin','doctor','nurse','labtech','pharmacist']
 const route=(path,roles,element)=><Route key={path} path={path} element={<Guard roles={roles}>{element}</Guard>}/>
 return <BrowserRouter><Suspense fallback={<div className="app-loading" role="status">Loading workspace…</div>}><Routes>
 <Route path="/" element={<CareLandingPage/>}/><Route path="/login" element={user?<Navigate to={home} replace/>:<AuthPage/>}/><Route path="/activate" element={user?<Navigate to={home} replace/>:<AuthPage/>}/><Route path="/register" element={user?<Navigate to={home} replace/>:<AuthPage/>}/>
 <Route element={<Guard><AppLayout key={[user?.id,user?.user_metadata?.facility_id,role].join(':')}/></Guard>}>
 {route('/dashboard',staff,role==='pharmacist'?<Pharmacy/>:role==='labtech'?<Labs/>:<Worklist/>)}
 {route('/patients',['admin','doctor','nurse','labtech'],<Patients/>)}
 {route('/patients/new',['admin','doctor','nurse'],<Intake/>)}
 {route('/patients/:id',['admin','doctor','nurse'],<Patient/>)}
 {route('/lab',['admin','doctor','nurse','labtech'],<Labs/>)}
 {route('/lab/upload',['admin','labtech'],<Upload/>)}
 {route('/pharmacy',['admin','pharmacist'],<Pharmacy/>)}
 {route('/appointments',['admin','doctor','nurse'],<Appointments/>)}
 {route('/referrals',['admin','doctor','nurse'],<Referrals/>)}
 {route('/billing',['admin','nurse','pharmacist'],<Billing/>)}
 {route('/admin/users',['admin'],<Team/>)}
 {route('/pending',['admin','nurse','doctor'],<Pending/>)}
 {route('/tasks',staff,<Tasks/>)}
 {route('/communication',staff,<NoticeBoard/>)}
 {route('/my-records',['patient'],<Portal/>)}
 {route('/institutions',null,<Institutions/>)}
 {route('/account',null,<Account/>)}
 <Route path="/settings" element={<Navigate to="/account" replace/>}/>
 </Route><Route path="*" element={<Navigate to={user?home:'/'} replace/>}/>
 </Routes></Suspense></BrowserRouter>
}
