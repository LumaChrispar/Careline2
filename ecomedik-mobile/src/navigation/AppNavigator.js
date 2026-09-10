import React,{useState,useEffect,useRef} from 'react'
import {View,Text,ActivityIndicator,AppState} from 'react-native'
import {supabase} from '../lib/supabase'
import {rpc} from '../lib/careline'
import CareAuthScreen from '../screens/CareAuthScreen'
import CareWorkspaceScreen from '../screens/CareWorkspaceScreen'
import {Button,styles} from '../components/CareUI'
export default function AppNavigator(){
 const [session,setSession]=useState(null),[context,setContext]=useState(null),[ready,setReady]=useState(false),[error,setError]=useState(''),epoch=useRef(0)
 async function refresh(){
  const generation=++epoch.current
  try{
   const {data,error}=await supabase.auth.getSession();if(error)throw error
   const ctx=data.session?await rpc('careline_context'):null
   if(generation!==epoch.current)return
   setSession(data.session);setContext(ctx);setError('')
  }catch(e){if(generation===epoch.current){setContext(null);setError(e.message)}}finally{if(generation===epoch.current)setReady(true)}
 }
 useEffect(()=>{
  refresh()
  const {data:{subscription}}=supabase.auth.onAuthStateChange(()=>setTimeout(refresh,0))
  const app=AppState.addEventListener('change',state=>{if(state==='active')refresh()})
  const timer=setInterval(refresh,60000)
  return()=>{epoch.current++;subscription.unsubscribe();app.remove();clearInterval(timer)}
 },[])
 if(!ready)return <View style={[styles.page,{justifyContent:'center'}]}><ActivityIndicator color="#176b59"/></View>
 if(error)return <View style={[styles.page,{justifyContent:'center',padding:30}]}><Text style={styles.title}>Workspace unavailable</Text><Text style={styles.error}>{error}</Text><Button onPress={refresh}>Retry</Button><Button ghost onPress={()=>supabase.auth.signOut()}>Sign out</Button></View>
 return session&&context?<CareWorkspaceScreen key={session.user.id+':'+context.facility_id+':'+context.role} user={session.user} context={context} refreshContext={refresh}/>:<CareAuthScreen/>
}
