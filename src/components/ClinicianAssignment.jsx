import useTeam from '../hooks/useTeam'
import {ActionForm,Field} from './ui/CarelineUI'
export default function ClinicianAssignment({record,referral=false}) {
  const team=useTeam(),current=referral?record.receiving_doctor_name:record.assigned_doctor_name
  return <div className="care-stack"><p><strong>Responsible clinician:</strong> {current||'Not yet assigned'}</p><details className="care-disclosure"><summary>{current?'Change responsible clinician':'Assign responsible clinician'}</summary><ActionForm action={referral?'referral_assign':'assign_doctor'} key={record.id+':'+record.version} initial={{id:record.id,version:record.version}} label="Save clinician assignment"><Field label="Clinician at this institution" name="doctor_id" required defaultValue={(referral?record.receiving_doctor_id:record.assigned_doctor_id)||''} options={[{value:'',label:'Choose clinician'},...team.rows.filter(m=>['doctor','admin'].includes(m.role)).map(m=>({value:m.id,label:m.name+' · '+m.role}))]}/>{team.error&&<p role="alert" className="care-error">{team.error}</p>}</ActionForm></details></div>
}
