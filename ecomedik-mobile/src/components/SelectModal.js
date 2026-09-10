import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { spacing } from '../theme/theme';

export default function SelectModal({ visible, options, selected, onSelect, onCancel, label, colors }) {
  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <View style={[styles.sheet, { backgroundColor: colors.surface }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={onCancel}>
              <Text style={{ color: colors.textMuted, fontWeight: '700' }}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.title, { color: colors.text }]}>{label}</Text>
            <View style={{ width: 60 }} />
          </View>
          <ScrollView showsVerticalScrollIndicator={false}>
            {options.map((opt) => {
              const isSelected = opt === selected;
              return (
                <TouchableOpacity
                  key={opt}
                  onPress={() => { onSelect(opt); onCancel(); }}
                  style={[styles.item, isSelected && { backgroundColor: colors.primary + '20' }]}
                >
                  <Text style={[styles.itemText, { color: isSelected ? colors.primary : colors.text }, isSelected && { fontWeight: '800' }]}>
                    {opt}
                  </Text>
                  {isSelected && (
                    <Text style={{ color: colors.primary, fontSize: 18 }}>✓</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: spacing.xl, maxHeight: '70%', paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  title: { fontSize: 16, fontWeight: '800' },
  item: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: spacing.md, borderRadius: 10, marginBottom: 4 },
  itemText: { fontSize: 16 },
});
