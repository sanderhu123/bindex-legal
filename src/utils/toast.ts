import Toast from 'react-native-toast-message';

type ToastType = 'success' | 'error' | 'info';

function show(type: ToastType, title: string, message?: string) {
  Toast.show({
    type,
    text1: title,
    text2: message,
    position: 'bottom',
    visibilityTime: 2500,
    bottomOffset: 80,
  });
}

export function showSuccess(title: string, message?: string) {
  show('success', title, message);
}

export function showError(title: string, message?: string) {
  show('error', title, message);
}

export function showInfo(title: string, message?: string) {
  show('info', title, message);
}
