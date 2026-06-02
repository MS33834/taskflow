import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal as RNModal,
  TouchableOpacity,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAppStore } from '../../store';

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  showCloseButton?: boolean;
  size?: 'small' | 'medium' | 'large' | 'full';
  position?: 'center' | 'bottom';
}

export const Modal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  children,
  showCloseButton = true,
  size = 'medium',
  position = 'center',
}) => {
  const { theme } = useAppStore();

  const getModalWidth = (): '70%' | '85%' | '95%' | '100%' => {
    switch (size) {
      case 'small':
        return '70%';
      case 'medium':
        return '85%';
      case 'large':
        return '95%';
      case 'full':
        return '100%';
      default:
        return '85%';
    }
  };

  const getModalPosition = () => {
    if (position === 'bottom') {
      return {
        justifyContent: 'flex-end' as const,
        margin: 0 as const,
      };
    }
    return {
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    };
  };

  return (
    <RNModal
      visible={visible}
      animationType={position === 'bottom' ? 'slide' : 'fade'}
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={[styles.overlay, getModalPosition()]}
        >
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.modalContent,
                {
                  backgroundColor: theme.colors.surface,
                  width: getModalWidth(),
                  maxHeight: position === 'bottom' ? '90%' : '80%',
                },
                position === 'bottom' && styles.modalContentBottom,
              ]}
            >
              {(title || showCloseButton) && (
                <View
                  style={[
                    styles.header,
                    { borderBottomColor: theme.colors.border },
                  ]}
                >
                  <View style={styles.headerLeft} />
                  {title && (
                    <Text style={[styles.title, { color: theme.colors.text }]}>
                      {title}
                    </Text>
                  )}
                  {showCloseButton ? (
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                      <Text
                        style={[
                          styles.closeButtonText,
                          { color: theme.colors.textSecondary },
                        ]}
                      >
                        ×
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.headerRight} />
                  )}
                </View>
              )}

              <ScrollView
                style={styles.body}
                contentContainerStyle={styles.bodyContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {children}
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </RNModal>
  );
};

interface ConfirmModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  showCancel?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '确定',
  cancelText = '取消',
  confirmColor,
  showCancel = true,
}) => {
  const { theme } = useAppStore();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Modal visible={visible} onClose={onClose} title={title} size="small">
      <View style={styles.confirmContent}>
        <Text style={[styles.confirmMessage, { color: theme.colors.text }]}>
          {message}
        </Text>

        <View style={styles.confirmButtons}>
          {showCancel && (
            <TouchableOpacity
              style={[
                styles.confirmButton,
                styles.cancelButton,
                { backgroundColor: theme.colors.background },
              ]}
              onPress={onClose}
            >
              <Text
                style={[styles.confirmButtonText, { color: theme.colors.text }]}
              >
                {cancelText}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              styles.confirmButtonPrimary,
              { backgroundColor: confirmColor || theme.colors.primary },
            ]}
            onPress={handleConfirm}
          >
            <Text style={[styles.confirmButtonText, { color: '#FFFFFF' }]}>
              {confirmText}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

interface AlertModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  buttonText?: string;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  onClose,
  title,
  message,
  type = 'info',
  buttonText = '确定',
}) => {
  const { theme } = useAppStore();

  const getIcon = (): string => {
    switch (type) {
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return 'ℹ️';
    }
  };

  const getColor = (): string => {
    switch (type) {
      case 'success':
        return '#10b981';
      case 'warning':
        return '#f59e0b';
      case 'error':
        return '#ef4444';
      default:
        return theme.colors.primary;
    }
  };

  return (
    <Modal visible={visible} onClose={onClose} title={title} size="small">
      <View style={styles.alertContent}>
        <Text style={styles.alertIcon}>{getIcon()}</Text>
        <Text style={[styles.alertMessage, { color: theme.colors.text }]}>
          {message}
        </Text>
        <TouchableOpacity
          style={[styles.alertButton, { backgroundColor: getColor() }]}
          onPress={onClose}
        >
          <Text style={styles.alertButtonText}>{buttonText}</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalContentBottom: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    width: 40,
  },
  headerRight: {
    width: 40,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  closeButton: {
    width: 40,
    alignItems: 'flex-end',
  },
  closeButtonText: {
    fontSize: 28,
    lineHeight: 28,
  },
  body: {
    maxHeight: 400,
  },
  bodyContent: {
    padding: 16,
  },
  confirmContent: {
    alignItems: 'center',
  },
  confirmMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  confirmButtons: {
    flexDirection: 'row',
    width: '100%',
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {},
  confirmButtonPrimary: {},
  confirmButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  alertContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  alertIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  alertMessage: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 24,
  },
  alertButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  alertButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
