export const attachmentTypes={'application/pdf':'pdf','image/jpeg':'jpg','image/png':'png'}
export function validateAttachment(asset,size=asset?.size) {
  if(!asset||!attachmentTypes[asset.mimeType])throw Error('Choose a PDF, JPG or PNG file.')
  if(!Number.isFinite(size)||size<=0||size>10*1024*1024)throw Error('Choose a non-empty file up to 10 MB.')
  return attachmentTypes[asset.mimeType]
}
// One immutable submission ID and path survive retries, including a lost response
// after a successful database commit. Never remove the file on a save error.
export async function submitNativeResult({client,command,submission,readFile,onProgress=()=>{}}) {
  const {id,facility,patient_id,test_type,summary,asset}=submission
  if(!patient_id||!test_type?.trim()||!summary?.trim())throw Error('Choose a patient and enter the test name and validated findings.')
  let path=null
  if(asset){
    onProgress('Reading attachment…')
    const bytes=await readFile(asset)
    const extension=validateAttachment(asset,bytes.byteLength)
    path=[facility,patient_id,id+'.'+extension].join('/')
    onProgress('Uploading private attachment…')
    const {error}=await client.storage.from('LAB_result').upload(path,bytes,{contentType:asset.mimeType,upsert:false})
    if(error&&String(error.statusCode)!=='409'&&error.error!=='Duplicate')throw error
  }
  onProgress('Saving result for clinician review…')
  await command('lab_upload',facility,{id,patient_id,test_type:test_type.trim(),summary:summary.trim(),storage_path:path})
  return path
}
