import React, { useState } from 'react'
import { View, Text, TouchableOpacity, Platform } from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'

const pad = value => String(value).padStart(2, '0')
function format(value, withTime) {
  const date = [value.getFullYear(), pad(value.getMonth() + 1), pad(value.getDate())].join('-')
  return withTime ? date + 'T' + pad(value.getHours()) + ':' + pad(value.getMinutes()) : date
}

export default function CareDateField({ label, value, onChange, disabled, withTime, styles }) {
  const [step, setStep] = useState(null), [draft, setDraft] = useState(new Date())
  function open() {
    const parsed = new Date(value ? value.replace(' ', 'T') + (withTime ? '' : 'T12:00:00') : Date.now())
    setDraft(Number.isNaN(parsed.getTime()) ? new Date() : parsed)
    setStep('date')
  }
  function change(event, date) {
    if (event.type === 'dismissed') { setStep(null); return }
    if (!date) return
    setDraft(date)
    if (Platform.OS === 'ios') return
    if (withTime && step === 'date') { setStep('time'); return }
    onChange(format(date, withTime)); setStep(null)
  }
  return <View>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={open} style={styles.input}>
      <Text style={{ color: value ? '#254333' : '#728571' }}>{value ? value.replace('T', ' ') : withTime ? 'Choose date and time' : 'Choose date'}</Text>
    </TouchableOpacity>
    {step && <DateTimePicker key={step} value={draft} mode={Platform.OS === 'ios' && withTime ? 'datetime' : step} display={Platform.OS === 'ios' ? 'spinner' : 'default'} onChange={change}/>}
    {step && Platform.OS === 'ios' && <TouchableOpacity accessibilityRole="button" onPress={() => { onChange(format(draft, withTime)); setStep(null) }} style={styles.button}><Text style={styles.buttonText}>Use this date{withTime ? ' and time' : ''}</Text></TouchableOpacity>}
    {!!value && !disabled && <TouchableOpacity accessibilityRole="button" accessibilityLabel={'Clear ' + label} onPress={() => { onChange(''); setStep(null) }} style={{ paddingVertical: 10 }}><Text style={styles.muted}>Clear date</Text></TouchableOpacity>}
  </View>
}
