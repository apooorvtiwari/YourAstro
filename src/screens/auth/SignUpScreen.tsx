import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { supabase } from '../../services/supabase';
import { colors } from '../../theme';
import type { UserRole } from '../../types';
import { showAlert } from '../../utils/showAlert';

export function SignUpScreen({ navigation }: any) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!fullName.trim() || !email.trim() || password.length < 6) {
      showAlert('Missing details', 'Fill in name, email, and a password (min 6 characters).');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role },
      },
    });
    setLoading(false);

    if (error) {
      showAlert('Sign up failed', error.message);
      return;
    }

    if (role === 'astrologer') {
      showAlert(
        'Almost there',
        'Your astrologer account needs manual approval before you can go online. Please contact the admin.'
      );
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>

      <View style={styles.roleToggle}>
        <TouchableOpacity
          style={[styles.roleOption, role === 'customer' && styles.roleOptionActive]}
          onPress={() => setRole('customer')}
        >
          <Text style={[styles.roleText, role === 'customer' && styles.roleTextActive]}>I need guidance</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.roleOption, role === 'astrologer' && styles.roleOptionActive]}
          onPress={() => setRole('astrologer')}
        >
          <Text style={[styles.roleText, role === 'astrologer' && styles.roleTextActive]}>I'm an astrologer</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Full name"
        placeholderTextColor={colors.textTertiary}
        value={fullName}
        onChangeText={setFullName}
      />
      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={colors.textTertiary}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password (min 6 characters)"
        placeholderTextColor={colors.textTertiary}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSignUp} disabled={loading}>
        {loading ? <ActivityIndicator color={colors.bgVoid} /> : <Text style={styles.buttonText}>Sign Up</Text>}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgVoid, padding: 24, justifyContent: 'center' },
  title: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, marginBottom: 24 },
  roleToggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  roleOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  roleOptionActive: { borderColor: colors.accentGold, backgroundColor: 'rgba(212,168,87,0.08)' },
  roleText: { color: colors.textSecondary, fontSize: 13, fontWeight: '500' },
  roleTextActive: { color: colors.accentGold },
  input: {
    backgroundColor: colors.bgPanel,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: colors.textPrimary,
    marginBottom: 14,
  },
  button: {
    backgroundColor: colors.accentGold,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: colors.bgVoid, fontWeight: '700', fontSize: 15 },
  link: { color: colors.accentTeal, textAlign: 'center', marginTop: 20, fontSize: 13.5 },
});
