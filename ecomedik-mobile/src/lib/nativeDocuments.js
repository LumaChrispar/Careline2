import {File,Paths} from 'expo-file-system'
import * as Sharing from 'expo-sharing'
import {privateDocument,requestId} from './careline'

export async function openNativeDocument(result) {
  if(!await Sharing.isAvailableAsync())throw Error('Document sharing is unavailable on this device.')
  const extension=(result.storage_path||result.file_url||'').split('.').pop()?.toLowerCase()
  const type={pdf:'application/pdf',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png'}[extension]
  if(!type)throw Error('Ask your facility for a PDF, JPG or PNG copy of this document.')
  const destination=new File(Paths.cache,requestId()+'.'+extension)
  try{
    await File.downloadFileAsync(await privateDocument(result),destination)
    await Sharing.shareAsync(destination.uri,{mimeType:type,dialogTitle:'Open or share care document'})
  }finally{if(destination.exists)destination.delete()}
}
