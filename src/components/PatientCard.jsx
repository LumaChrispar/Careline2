import { useEffect,useState } from 'react'
import QRCode from 'qrcode'
import { fullName } from '../lib/careline'
import { Panel } from './ui/CarelineUI'
export default function PatientCard({patient}){
 const [qr,setQr]=useState(''),[error,setError]=useState('')
 useEffect(()=>{let live=true; QRCode.toDataURL('CARELINE:1:'+patient.id,{width:240,margin:2,errorCorrectionLevel:'M'}).then(data=>{if(live)setQr(data)}).catch(e=>setError(e.message));return()=>{live=false}},[patient.id])
 return <Panel title="Careline patient card"><div className="care-card"><strong className="care-wordmark">careline<span>+</span></strong><h2>{fullName(patient)}</h2>{qr&&<img src={qr} alt="Careline patient identification QR" width="200" height="200"/>}<code>{patient.id}</code><p>This code identifies a record. Staff must sign in and have permission to open it.</p>{error&&<p role="alert">{error}</p>}<button className="btn btn-primary" onClick={()=>window.print()}>Print card</button></div></Panel>
}
