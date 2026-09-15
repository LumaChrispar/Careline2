import React, { useCallback, useEffect, useRef, useState } from 'react'
import { View, Text } from 'react-native'
import { Picker } from '@react-native-picker/picker'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { supabase } from '../lib/supabase'
import { command } from '../lib/careline'
import { Card, Button, Badge, FormModal, styles } from './CareUI'

const planFields = [['summary','Care summary in plain language','textarea'],['medication_instructions','Medicine instructions agreed with the patient','textarea'],['next_steps','Next steps and return arrangements','textarea'],['warning_signs','When and where to seek help','textarea'],['language','Language of the instructions']]
const escapeHtml = text => String(text || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))

export default function CareCoordination({ patient, context, mode = 'plan' }) {
  const own = context.role === 'patient', clinical = ['admin','doctor'].includes(context.role), facility = context.facility_id
  const [rows,setRows] = useState([]), [links,setLinks] = useState([]), [institutions,setInstitutions] = useState([])
  const [selected,setSelected] = useState(''), [form,setForm] = useState(null), [busy,setBusy] = useState(false), [error,setError] = useState('')
  const generation = useRef(0)
  const reload = useCallback(async () => {
    const run = ++generation.current
    setBusy(true);setError('')
    try {
      let query = supabase.from(mode === 'plan' ? 'care_plans' : 'patient_concerns').select('*').eq('patient_id',patient.id).order('created_at',{ascending:false}).limit(50)
      if (!own) query=query.eq('facility_id',facility)
      if (mode==='plan') query=query.in('status',['draft','published'])
      const results=await Promise.all([query,supabase.from('patient_facilities').select('*').eq('patient_id',patient.id),supabase.from('facilities').select('id,name')])
      for(const result of results)if(result.error)throw result.error
      if(run===generation.current){setRows(results[0].data||[]);setLinks(results[1].data||[]);setInstitutions(results[2].data||[])}
    }catch(e){if(run===generation.current)setError(e.message)}finally{if(run===generation.current)setBusy(false)}
  },[patient.id,facility,own,mode])
  useEffect(()=>{reload();return()=>{generation.current++}},[reload])
  const target=own?(selected||links[0]?.facility_id):facility
  async function act(action,payload,f=facility){if(busy)return;setBusy(true);setError('');try{await command(action,f,payload);await reload()}catch(e){setError(e.message)}finally{setBusy(false)}}
  async function share(plan){
    try{
      const sections=[['Care summary',plan.summary],['Medicines',plan.medication_instructions],['Next steps',plan.next_steps],['When and where to seek help',plan.warning_signs]]
      const html='<html><body style="font-family:sans-serif;padding:32px;color:#173b2e"><h1>Careline care instructions</h1><p>'+escapeHtml(patient.first_name+' '+patient.last_name)+' · '+escapeHtml(patient.id)+'</p>'+sections.filter(s=>s[1]).map(([title,value])=>'<h2>'+title+'</h2><p style="white-space:pre-wrap">'+escapeHtml(value)+'</p>').join('')+'<p>Approved '+escapeHtml(new Date(plan.published_at).toLocaleString())+'</p></body></html>'
      if(!await Sharing.isAvailableAsync())throw Error('Sharing is unavailable on this device.')
      const {uri}=await Print.printToFileAsync({html});await Sharing.shareAsync(uri,{mimeType:'application/pdf'})
    }catch(e){setError(e.message)}
  }
  return <View style={{gap:16}}>
    <Card title={mode==='plan'?'Care plan':'What matters to the patient?'}>
      {mode==='concerns'&&<Text style={styles.muted}>Record the patient's own words and access needs. This is reviewed during care, not monitored for emergencies.</Text>}
      {error&&<Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {own&&mode==='concerns'&&links.length>1&&<Picker accessibilityLabel="Institution for your concern" selectedValue={target} onValueChange={setSelected}>{links.map(l=><Picker.Item key={l.facility_id} value={l.facility_id} label={institutions.find(i=>i.id===l.facility_id)?.name||l.facility_id}/>)}</Picker>}
      {mode==='concerns'&&target&&<Button disabled={busy} onPress={()=>setForm({title:'What matters to you?',action:'concern_add',facility:target,fields:[['concern','What should the care team know?','textarea'],['preferred_language','Preferred language'],['access_barriers','What makes care difficult?','textarea']],initial:{patient_id:patient.id}})}>Add a concern</Button>}
      {mode==='plan'&&clinical&&<Button disabled={busy} onPress={()=>setForm({title:'Write a care plan',action:'plan_save',facility,fields:planFields,initial:{patient_id:patient.id,language:'English'}})}>Write care plan</Button>}
      <Button ghost disabled={busy} onPress={reload}>{busy?'Loading…':'Refresh'}</Button>
      {!busy&&!error&&!rows.length&&<Text style={styles.muted}>{mode==='plan'?'No current care plan recorded.':'No concerns recorded.'}</Text>}
    </Card>
    {rows.map(row=><Card key={row.id} title={mode==='plan'?'Care instructions':'Patient concern'}>
      <Badge value={row.status}/><Text style={styles.subtitle}>{row.summary||row.concern}</Text>
      {mode==='plan'?<>
        {[['Medicines',row.medication_instructions],['Next steps',row.next_steps],['When and where to seek help',row.warning_signs]].map(([title,value])=>value&&<View key={title}><Text style={styles.label}>{title}</Text><Text style={styles.subtitle}>{value}</Text></View>)}
        <Text style={styles.muted}>{row.language}{row.published_at?' · Approved '+new Date(row.published_at).toLocaleString()+' · '+(row.published_by_name||'Care team'):''}</Text>
        {clinical&&row.status==='draft'&&<><Button ghost disabled={busy} onPress={()=>setForm({title:'Edit care plan',action:'plan_save',facility:row.facility_id,fields:planFields,initial:{...row}})}>Edit draft</Button><Button disabled={busy} onPress={()=>act('plan_publish',{id:row.id,version:row.version},row.facility_id)}>Approve and share with patient</Button></>}
        {row.status==='published'&&<Button ghost disabled={busy} onPress={()=>share(row)}>Share printable instructions</Button>}
        {own&&row.status==='published'&&!row.acknowledged_at&&<Button disabled={busy} onPress={()=>act('plan_acknowledge',{id:row.id},row.facility_id)}>I have read this plan</Button>}
        {row.acknowledged_at&&<Text style={styles.muted}>Patient marked this plan as read.</Text>}
      </>:<>
        {row.preferred_language&&<Text style={styles.subtitle}>Preferred language: {row.preferred_language}</Text>}
        {row.access_barriers&&<Text style={styles.subtitle}>Access needs: {row.access_barriers}</Text>}
        {row.response&&<Text style={styles.subtitle}>Care team response: {row.response}</Text>}
        {!own&&row.status==='open'&&<Button ghost disabled={busy} onPress={()=>setForm({title:'Respond to concern',action:'concern_review',facility:row.facility_id,fields:[['response','Response discussed with the patient','textarea']],initial:{id:row.id}})}>Record response</Button>}
      </>}
    </Card>)}
    {form&&<FormModal form={form} onClose={()=>setForm(null)} onSave={async payload=>{await command(form.action,form.facility,payload);await reload()}}/>}
  </View>
}
