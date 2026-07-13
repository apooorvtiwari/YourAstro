import { Alert, Platform } from 'react-native';

/**
 * Cross-platform alert. React Native's `Alert.alert()` silently no-ops on
 * web (react-native-web has no native alert dialog) — this was causing
 * "nothing happens" symptoms across the whole app when running as a website.
 *
 * On web, falls back to `window.confirm`/`window.alert`. On native, uses the
 * real Alert.alert with full button support.
 */

interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export function showAlert(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS === 'web') {
    if (!buttons || buttons.length <= 1) {
      window.alert(message ? `${title}\n\n${message}` : title);
      buttons?.[0]?.onPress?.();
      return;
    }

    // Multi-button case (e.g. Cancel / Confirm) — use confirm() for the
    // primary action, fire the non-cancel button's onPress if confirmed.
    const confirmed = window.confirm(message ? `${title}\n\n${message}` : title);
    const primaryButton = buttons.find((b) => b.style !== 'cancel');
    const cancelButton = buttons.find((b) => b.style === 'cancel');

    if (confirmed) {
      primaryButton?.onPress?.();
    } else {
      cancelButton?.onPress?.();
    }
    return;
  }

  Alert.alert(title, message, buttons);
}
