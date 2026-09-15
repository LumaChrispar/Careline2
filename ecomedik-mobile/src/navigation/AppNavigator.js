import React,{useState,useEffect,useRef} from 'react'
import {View,Text,ActivityIndicator,AppState,Linking} from 'react-native'
import {supabase} from '../lib/supabase'
import {rpc} from '../lib/careline'
import CareAuthScreen from '../screens/CareAuthScreen'
import CareWorkspaceScreen from '../screens/CareWorkspaceScreen'
import {Button,styles} from '../components/CareUI'
import NetInfo from '@react-native-community/netinfo'
import {connected,transientConnectionError} from '../lib/dashboard.mjs'
export default function AppNavigator(){
 const [session,setSession]=useState(null),[context,setContext]=useState(null),[ready,setReady]=useState(false),[error,setError]=useState(''),epoch=useRef(0)
 const [invitationCode,setInvitationCode]=useState(null)
 useEffect(()=>{const read=url=>{try{const parsed=new URL(url);if(parsed.protocol==='careline:'&&parsed.hostname==='staff-activate'){const code=parsed.searchParams.get('code');if(/^[0-9a-f-]{36}$/i.test(code||''))setInvitationCode(code)}}catch{}};Linking.getInitialURL().then(url=>{if(url)read(url)});const listener=Linking.addEventListener('url',event=>read(event.url));return()=>listener.remove()},[])
 const last=useRef(null),[connectionMessage,setConnectionMessage]=useState('')
 async function refresh(){
  const generation=++epoch.current
  let identity=null
  try{
   const {data,error}=await supabase.auth.getSession();if(error)throw error
   identity=data.session?.user.id
   if(data.session&&!connected(await NetInfo.fetch()))throw Error('No internet connection. Reconnect to refresh access.')
   const ctx=data.session?await rpc('careline_context'):null
   if(generation!==epoch.current)return
   last.current={session:data.session,context:ctx};setConnectionMessage('')
   setSession(data.session);setContext(ctx);setError('')
  }catch(e){if(generation===epoch.current){
   if(identity&&identity===last.current?.session?.user.id&&last.current.context&&transientConnectionError(e))setConnectionMessage('Connection interrupted. Your open forms are retained on this screen; reconnect before saving.')
   else {last.current=null;setContext(null);setError(e.message)}
  }}finally{if(generation===epoch.current)setReady(true)}
 }
 useEffect(()=>{
  refresh()
  const {data:{subscription}}=supabase.auth.onAuthStateChange((event,next)=>{
   if(event==='SIGNED_OUT'||(last.current&&next?.user.id!==last.current.session?.user.id)){epoch.current++;last.current=null;setContext(null);setSession(null);setConnectionMessage('')}
   setTimeout(refresh,0)
  })
  let wasConnected=true
  const unsubscribeNetwork=NetInfo.addEventListener(state=>{const nowConnected=connected(state);if(nowConnected&&!wasConnected)refresh();wasConnected=nowConnected})
  const app=AppState.addEventListener('change',state=>{if(state==='active')refresh()})
  const timer=setInterval(refresh,60000)
  return()=>{epoch.current++;subscription.unsubscribe();unsubscribeNetwork();app.remove();clearInterval(timer)}
 },[])
 if(!ready)return <View style={[styles.page,{justifyContent:'center'}]}><ActivityIndicator color="#176b59"/></View>
 if(error)return <View style={[styles.page,{justifyContent:'center',padding:30}]}><Text style={styles.title}>Workspace unavailable</Text><Text style={styles.error}>{error}</Text><Button onPress={refresh}>Retry</Button><Button ghost onPress={()=>supabase.auth.signOut()}>Sign out</Button></View>
 return session&&context?<View style={{flex:1}}>{connectionMessage&&<Text accessibilityRole="alert" style={styles.error}>{connectionMessage}</Text>}<CareWorkspaceScreen key={session.user.id+':'+context.facility_id+':'+context.role} user={session.user} context={context} refreshContext={refresh}/></View>:<CareAuthScreen invitationCode={invitationCode}/>
}
