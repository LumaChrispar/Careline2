import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius, fontSize } from '../theme/theme';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function range(start, end) {
  const arr = [];
  for (let i = start; i <= end; i++) arr.push(i);
  return arr;
}

function getDaysInMonth(month, year) {
  return new Date(year, month + 1, 0).getDate();
}

export default function DatePickerModal({ visible, value, onConfirm, onCancel, colors }) {
  const [year, setYear] = useState(value?.getFullYear() || 1990);
  const [month, setMonth] = useState(value?.getMonth() || 0);
  const [day, setDay] = useState(value?.getDate() || 1);

  const currentYear = new Date().getFullYear();
  const years = range(1930, currentYear).reverse();
  const days = range(1, getDaysInMonth(month, year));

  const handleConfirm = () => {
    const safeDay = Math.min(day, getDaysInMonth(month, year));
    onConfirm(new Date(year, month, safeDay));
  };

  const ColumnPicker = ({ label, items, selected, onSelect, formatLabel }) => (
    <View style={styles.column}>
      <Text style={[styles.colLabel, { color: colors.textMuted }]}>{label}</Text>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        {items.map((item) => {
          const isSelected = item === selected;
          return (
            <TouchableOpacity
              key={item}
              onPress={() => onSelect(item)}
              style={[styles.item, isSelected && { backgroundColor: colors.primary + '30', borderRadius: 8 }]}
            >
              <Text style={[styles.itemText, { color: isSelected ? colors.primary : colors.text }, isSelected && { fontWeight: '800' }]}>
                {formatLabel ? formatLabel(item) : item}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>Date of Birth</Text>
            <TouchableOpacity onPress={handleConfirm}>
              <Text style={{ color: colors.primary, fontWeight: '800' }}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.pickerRow}>
            <ColumnPicker label="Day" items={days} selected={day} onSelect={setDay} />
            <ColumnPicker label="Month" items={range(0, 11)} selected={month} onSelect={setMonth} formatLabel={(m) => MONTHS[m].slice(0, 3)} />
            <ColumnPicker label="Year" items={years} selected={year} onSelect={setYear} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 16, fontWeight: '800' },
  pickerRow: { flexDirection: 'row', gap: 8, height: 200 },
  column: { flex: 1 },
  colLabel: { fontSize: 9, fontWeight: '900', letterSpacing: 1, textAlign: 'center', marginBottom: 8 },
  scroll: { flex: 1 },
  item: { paddingVertical: 8, paddingHorizontal: 4, alignItems: 'center' },
  itemText: { fontSize: 14 },
});
