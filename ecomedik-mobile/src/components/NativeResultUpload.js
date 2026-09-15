import React,{useState,useEffect,useRef} from 'react'
import {Modal,ScrollView,KeyboardAvoidingView,Platform,Text,View,Image} from 'react-native'
import {CameraView,useCameraPermissions} from 'expo-camera'
import {useSafeAreaInsets} from 'react-native-safe-area-context'
import * as DocumentPicker from 'expo-document-picker'
import {File} from 'expo-file-system'
import NetInfo from '@react-native-community/netinfo'
import {supabase} from '../lib/supabase'
import {command,requestId} from '../lib/careline'
import {connected} from '../lib/dashboard.mjs'
import {validateAttachment,submitNativeResult,attachmentTypes} from '../lib/nativeUpload.mjs'
import {Field,Button,styles} from './CareUI'

export default function NativeResultUpload({facility,onClose,onSaved}) {
  const inset=useSafeAreaInsets(),[search,setSearch]=useState(''),[patients,setPatients]=useState([]),[patient,setPatient]=useState(null),[test,setTest]=useState(''),[summary,setSummary]=useState(''),[asset,setAsset]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[searchError,setSearchError]=useState(''),[progress,setProgress]=useState(''),[submitted,setSubmitted]=useState(false)
  const submission=useRef(null),cached=useRef(null),saving=useRef(false)
  const [camera,setCamera]=useState(false),[cameraReady,setCameraReady]=useState(false),[takingPhoto,setTakingPhoto]=useState(false)
  const cameraRef=useRef(null),taking=useRef(false),[,requestCameraPermission]=useCameraPermissions()
  useEffect(()=>{
    let active=true
    const timer=setTimeout(async()=>{
      try{
        const clean=search.replace(/[^\p{L}\p{N} +.-]/gu,'').trim(),parts=clean.split(/\s+/)
        let query=supabase.from('patients').select('id,first_name,last_name').is('archived_at',null).order('created_at',{ascending:false}).limit(25)
        if(clean)query=parts.length>1?query.ilike('first_name','%'+parts[0]+'%').ilike('last_name','%'+parts.slice(1).join(' ')+'%'):query.or('first_name.ilike.%'+clean+'%,last_name.ilike.%'+clean+'%,id.ilike.%'+clean+'%')
        const {data,error}=await query;if(error)throw error
        if(active){setPatients(data||[]);setSearchError('')}
      }catch(e){if(active){setPatients([]);setSearchError(e.message)}}
    },300)
    return()=>{active=false;clearTimeout(timer)}
  },[search])
  useEffect(()=>()=>{try{if(cached.current?.exists)cached.current.delete()}catch{}},[])
  async function pick(){
    setError('')
    try{
      const result=await DocumentPicker.getDocumentAsync({type:Object.keys(attachmentTypes),copyToCacheDirectory:true,multiple:false})
      if(result.canceled)return
      const selected=result.assets[0],file=new File(selected.uri)
      try{validateAttachment(selected,file.size)}catch(e){file.delete();throw e}
      if(cached.current?.exists)cached.current.delete()
      cached.current=file;setAsset(selected)
    }catch(e){setError(e.message)}
  }
  async function openCamera(){
    try{
      const permission=await requestCameraPermission()
      if(!permission.granted)throw Error('Camera permission is needed to photograph a document. You can also choose an existing file.')
      setError('');setCameraReady(false);setCamera(true)
    }catch(e){setError(e.message)}
  }
  async function photograph(){
    if(taking.current||!cameraReady)return
    taking.current=true;setTakingPhoto(true)
    try{
      const photo=await cameraRef.current.takePictureAsync({quality:0.6})
      const file=new File(photo.uri),selected={uri:photo.uri,mimeType:'image/jpeg',name:'Laboratory-document.jpg',size:file.size}
      try{validateAttachment(selected,file.size)}catch(e){file.delete();throw e}
      if(cached.current?.exists)cached.current.delete()
      cached.current=file;setAsset(selected);setCamera(false)
    }catch(e){setError(e.message);setCamera(false)}finally{taking.current=false;setTakingPhoto(false)}
  }
  async function save(){
    if(saving.current)return
    saving.current=true;setBusy(true);setError('')
    try{
      if(!connected(await NetInfo.fetch()))throw Error('No connection. Keep this form open and retry when connected.')
      if(!submission.current){
        if(!patient||!test.trim()||!summary.trim())throw Error('Choose a patient and enter the test name and validated findings.')
        submission.current={id:requestId(),facility,patient_id:patient.id,test_type:test,summary,asset}
        setSubmitted(true)
      }
      await submitNativeResult({client:supabase,command,submission:submission.current,readFile:a=>new File(a.uri).arrayBuffer(),onProgress:setProgress})
      onSaved();onClose()
    }catch(e){setError(e.message+' Your form is still here. Retry this submission; if the result already saved, it will not be duplicated.')}
    finally{saving.current=false;setBusy(false);setProgress('')}
  }
  if(camera)return <Modal visible animationType="slide" onRequestClose={()=>{if(!takingPhoto)setCamera(false)}}><View style={[styles.page,{paddingTop:inset.top,paddingBottom:inset.bottom+12}]}><Text style={[styles.heading,{padding:16}]}>Keep the whole document in view</Text><CameraView ref={cameraRef} style={{flex:1}} facing="back" onCameraReady={()=>setCameraReady(true)} onMountError={()=>{setCamera(false);setError('Camera unavailable. Choose an existing document instead.')}}/><View style={{padding:16}}><Button disabled={!cameraReady||takingPhoto} onPress={photograph}>{takingPhoto?'Taking photo…':'Take photo'}</Button><Button ghost disabled={takingPhoto} onPress={()=>setCamera(false)}>Back to result</Button></View></View></Modal>
  return <Modal visible animationType="slide" onRequestClose={()=>{if(!busy)onClose()}}><KeyboardAvoidingView style={[styles.page,{paddingTop:inset.top}]} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[styles.content,{paddingBottom:inset.bottom+24}]}>
    <Text style={styles.title}>Add laboratory result</Text><Text style={styles.subtitle}>For a standalone result. Complete an existing test request from its worklist.</Text>
    <Field disabled={busy||submitted} field={['search','Find patient by name or ID']} value={search} onChange={setSearch}/>
    {searchError&&<Text style={styles.error}>{searchError}</Text>}
    <Field disabled={busy||submitted} field={['patient','Patient','select',[{value:'',label:'Choose patient'},...(patient&&!patients.some(p=>p.id===patient.id)?[patient]:[]).concat(patients).map(p=>({value:p.id,label:p.first_name+' '+p.last_name+' · '+p.id}))]]} value={patient?.id||''} onChange={id=>setPatient(patients.find(p=>p.id===id)||null)}/>
    {patient&&<Text style={styles.subtitle}>Selected: {patient.first_name} {patient.last_name} · {patient.id}</Text>}
    <Field disabled={busy||submitted} field={['test','Test name']} value={test} onChange={setTest}/>
    <Field disabled={busy||submitted} field={['summary','Validated result / findings','textarea']} value={summary} onChange={setSummary}/>
    <Button ghost disabled={busy||submitted} onPress={pick}>{asset?'Replace attachment':'Choose PDF or image'}</Button>
    <Button ghost disabled={busy||submitted} onPress={openCamera}>Photograph document</Button>
    <Text style={styles.muted}>{asset?asset.name:'Attachment is optional. PDF, JPG or PNG, up to 10 MB.'}</Text>
    {asset?.mimeType.startsWith('image/')&&<><Image source={{uri:asset.uri}} resizeMode="contain" accessibilityLabel="Selected document preview" style={{height:240,width:'100%'}}/><Text style={styles.muted}>Check that the patient details and findings are readable before saving.</Text></>}
    {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
    {submitted&&<Text style={styles.muted}>This submission is locked for safe retry. Check the laboratory worklist before starting another entry if you leave this screen.</Text>}
    <Button disabled={busy} onPress={save}>{busy?progress||'Saving…':submitted?'Retry saving this result':'Save result'}</Button><Button ghost disabled={busy} onPress={onClose}>Close</Button>
  </ScrollView></KeyboardAvoidingView></Modal>
}
