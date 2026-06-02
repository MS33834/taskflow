import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  TextInput,
  ScrollView,
} from 'react-native';
import { useAppStore } from '../../store';

interface SelectOption {
  label: string;
  value: string;
  icon?: string;
  color?: string;
}

interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
}

export const Select: React.FC<SelectProps> = ({
  value,
  options,
  onChange,
  placeholder = '选择...',
  label,
}) => {
  const { theme } = useAppStore();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setShowModal(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.colors.text }]}>{label}</Text>
      )}
      <TouchableOpacity
        style={[
          styles.selectButton,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        onPress={() => setShowModal(true)}
      >
        <View style={styles.selectContent}>
          {selectedOption?.icon && (
            <Text style={styles.optionIcon}>{selectedOption.icon}</Text>
          )}
          {selectedOption?.color && (
            <View
              style={[styles.colorDot, { backgroundColor: selectedOption.color }]}
            />
          )}
          <Text
            style={[
              styles.selectText,
              {
                color: selectedOption
                  ? theme.colors.text
                  : theme.colors.textSecondary,
              },
            ]}
          >
            {selectedOption?.label || placeholder}
          </Text>
        </View>
        <Text style={[styles.arrow, { color: theme.colors.textSecondary }]}>›</Text>
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <TouchableWithoutFeedback onPress={() => setShowModal(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View
                style={[styles.modalContent, { backgroundColor: theme.colors.surface }]}
              >
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
                    {label || '选择'}
                  </Text>
                  <TouchableOpacity onPress={() => setShowModal(false)}>
                    <Text
                      style={[
                        styles.modalClose,
                        { color: theme.colors.textSecondary },
                      ]}
                    >
                      ×
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={[
                    styles.searchContainer,
                    { backgroundColor: theme.colors.background },
                  ]}
                >
                  <TextInput
                    style={[styles.searchInput, { color: theme.colors.text }]}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="搜索..."
                    placeholderTextColor={theme.colors.textSecondary}
                  />
                </View>

                <ScrollView style={styles.optionsList}>
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[
                          styles.optionRow,
                          option.value === value && {
                            backgroundColor: theme.colors.primary + '20',
                          },
                        ]}
                        onPress={() => handleSelect(option.value)}
                      >
                        {option.icon && (
                          <Text style={styles.optionIcon}>{option.icon}</Text>
                        )}
                        {option.color && (
                          <View
                            style={[
                              styles.colorDot,
                              { backgroundColor: option.color },
                            ]}
                          />
                        )}
                        <Text
                          style={[styles.optionLabel, { color: theme.colors.text }]}
                        >
                          {option.label}
                        </Text>
                        {option.value === value && (
                          <Text
                            style={[
                              styles.checkmark,
                              { color: theme.colors.primary },
                            ]}
                          >
                            ✓
                          </Text>
                        )}
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.emptyState}>
                      <Text
                        style={[
                          styles.emptyText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        没有找到匹配项
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  selectButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  selectContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  selectText: {
    fontSize: 14,
    flex: 1,
  },
  optionIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  colorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  arrow: {
    fontSize: 20,
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  modalClose: {
    fontSize: 28,
    lineHeight: 28,
  },
  searchContainer: {
    padding: 12,
  },
  searchInput: {
    fontSize: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionsList: {
    maxHeight: 300,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  optionLabel: {
    flex: 1,
    fontSize: 14,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
  },
});
