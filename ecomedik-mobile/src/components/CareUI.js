import React,{useState} from 'react'
import {View,Text,TextInput,TouchableOpacity,Modal,ScrollView,KeyboardAvoidingView,Platform,StyleSheet,ActivityIndicator} from 'react-native'
import {Picker} from '@react-native-picker/picker'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import {requestId} from '../lib/careline'
import CareDateField from './CareDateField'
import NetInfo from '@react-native-community/netinfo'
import {connected} from '../lib/dashboard.mjs'
export const styles=StyleSheet.create({
 page:{flex:1,backgroundColor:'#f5f7f1'},content:{padding:20,paddingBottom:45,gap:16},title:{fontSize:28,fontWeight:'700',color:'#1b3b2e',letterSpacing:-1},subtitle:{fontSize:13,color:'#6b7f6d',lineHeight:21},
 card:{backgroundColor:'#fff',borderColor:'#dce5d8',borderWidth:1,borderRadius:16,padding:20,gap:12},heading:{fontSize:17,fontWeight:'700',color:'#234735'},label:{fontSize:12,color:'#57705e',marginBottom:7,fontWeight:'600'},
 input:{backgroundColor:'#fff',borderColor:'#cfdbcc',borderWidth:1,borderRadius:9,padding:12,minHeight:46,fontSize:15,color:'#254333'},
 button:{backgroundColor:'#176b59',borderRadius:9,paddingVertical:13,paddingHorizontal:18,alignItems:'center',marginTop:7},buttonText:{color:'#fff',fontWeight:'700',fontSize:13},ghost:{backgroundColor:'#eaf1e5'},
 ghostText:{color:'#2b6246'},error:{color:'#a73c31',fontSize:13,lineHeight:20,backgroundColor:'#fff0eb',padding:12,borderRadius:9},badge:{alignSelf:'flex-start',backgroundColor:'#edf3e8',color:'#4c7551',paddingVertical:5,paddingHorizontal:9,borderRadius:5,fontSize:11,fontWeight:'700'},
 row:{flexDirection:'row',gap:10,alignItems:'center',justifyContent:'space-between'},tabs:{flexDirection:'row',gap:8,paddingHorizontal:20,paddingVertical:12},tab:{paddingHorizontal:15,paddingVertical:10,borderRadius:9,backgroundColor:'#e9efe4'},activeTab:{backgroundColor:'#176b59'},tabText:{fontSize:12,color:'#5b755f',fontWeight:'600'},activeText:{color:'#fff'},muted:{fontSize:12,color:'#728571',lineHeight:19}
})
export function Button({children,onPress,disabled,ghost}){return <TouchableOpacity accessibilityRole="button" accessibilityState={{disabled:!!disabled}} disabled={disabled} onPress={onPress} style={[styles.button,ghost&&styles.ghost,disabled&&{opacity:.5}]}><Text style={[styles.buttonText,ghost&&styles.ghostText]}>{children}</Text></TouchableOpacity>}
export function Card({title,children}){return <View style={styles.card}>{title&&<Text style={styles.heading}>{title}</Text>}{children}</View>}
export function Badge({value}){return <Text style={styles.badge}>{String(value||'unknown').replaceAll('_',' ')}</Text>}
export function Field({field,value,onChange,disabled}){
 const [name,label,type,options]=field
 return <View><Text style={styles.label}>{label}</Text>{['date','datetime'].includes(type)?<CareDateField label={label} value={value} onChange={onChange} disabled={disabled} withTime={type==='datetime'} styles={styles}/>:type==='select'?<View style={{borderWidth:1,borderColor:'#cfdbcc',borderRadius:9}}><Picker accessibilityLabel={label} enabled={!disabled} selectedValue={value||''} onValueChange={onChange} style={{color:'#254333'}}>{options.map(o=><Picker.Item key={o.value??o} label={o.label??o} value={o.value??o}/>)}</Picker></View>:<TextInput editable={!disabled} accessibilityLabel={label} value={String(value??'')} onChangeText={onChange} style={[styles.input,type==='textarea'&&{height:100,textAlignVertical:'top'}]} multiline={type==='textarea'} secureTextEntry={type==='password'} autoCapitalize={['email','password','date','datetime'].includes(type)||name==='identifier'?'none':'sentences'} keyboardType={type==='number'?'decimal-pad':type==='email'?'email-address':'default'} placeholder={type==='date'?'YYYY-MM-DD':type==='datetime'?'YYYY-MM-DD HH:mm':''} placeholderTextColor="#849581"/>}</View>
}
export function FormModal({form,onClose,onSave}){
 const inset=useSafeAreaInsets(),[values,setValues]=useState(()=>({...Object.fromEntries(form.fields.map(([name,,type,options])=>[name,type==='select'?(options[0]?.value??options[0]??''):''])),...form.initial})),[busy,setBusy]=useState(false),[error,setError]=useState(''),[id]=useState(requestId)
 return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose()}}><KeyboardAvoidingView style={[styles.page,{paddingTop:inset.top}]} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[styles.content,{paddingBottom:inset.bottom+30}]} keyboardShouldPersistTaps="handled"><Text style={styles.title}>{form.title}</Text>{form.description&&<Text style={styles.subtitle}>{form.description}</Text>}{form.fields.map(field=><Field disabled={busy} key={field[0]} field={field} value={values[field[0]]} onChange={value=>setValues(s=>({...s,[field[0]]:value}))}/>)}{error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}<Button disabled={busy} onPress={async()=>{if(busy)return;setBusy(true);setError('');try{if(!connected(await NetInfo.fetch()))throw Error('No connection. Your form is still open; reconnect before saving.');await onSave({...values,id:form.initial?.id||id});onClose()}catch(e){setError(e.message)}finally{setBusy(false)}}}>{busy?'Saving…':form.submit||'Save'}</Button><Button disabled={busy} ghost onPress={onClose}>Cancel</Button></ScrollView></KeyboardAvoidingView></Modal>
}
