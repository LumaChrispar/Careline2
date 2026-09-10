import React,{useMemo} from 'react'
import {Text,View} from 'react-native'
import Svg,{Path,Rect} from 'react-native-svg'
import QRCode from 'qrcode/lib/core/qrcode'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import {Button,Card,styles} from './CareUI'
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))
export default function NativePatientCard({patient,onError}){
 const qr=useMemo(()=>QRCode.create('CARELINE:1:'+patient.id,{errorCorrectionLevel:'M'}),[patient.id])
 const size=qr.modules.size,padding=3
 const path=useMemo(()=>{let d='';for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(qr.modules.data[y*size+x])d+='M'+(x+padding)+' '+(y+padding)+'h1v1h-1z';return d},[qr,size])
 async function share(){
  try{
   const html='<html><body style="font-family:sans-serif;padding:40px;text-align:center"><h1 style="color:#176b59">careline+</h1><h2>'+escapeHtml(patient.first_name)+' '+escapeHtml(patient.last_name)+'</h2><svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 '+(size+6)+' '+(size+6)+'"><rect width="100%" height="100%" fill="white"/><path d="'+path+'" fill="black"/></svg><p>'+escapeHtml(patient.id)+'</p><p>This card identifies a record. Staff access requires permission.</p></body></html>'
   const {uri}=await Print.printToFileAsync({html})
   if(await Sharing.isAvailableAsync())await Sharing.shareAsync(uri,{mimeType:'application/pdf'})
   else throw Error('Sharing is unavailable on this device.')
  }catch(e){onError(e.message)}
 }
 return <Card title="Careline patient card"><View style={{alignItems:'center',gap:12}}><Text style={styles.heading}>{patient.first_name} {patient.last_name}</Text><Svg width={230} height={230} viewBox={'0 0 '+(size+6)+' '+(size+6)}><Rect width="100%" height="100%" fill="white"/><Path d={path} fill="#183b2a"/></Svg><Text selectable style={styles.muted}>{patient.id}</Text><Text style={styles.muted}>The code contains only your patient ID. Staff must sign in with permission to open a record.</Text></View><Button onPress={share}>Share printable card</Button></Card>
}
