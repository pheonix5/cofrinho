import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { X, Lock, Shield, Download, Trash2, Check } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { exportAll } from '@/db/backup';
import { hasPin, setPin as savePin, verifyPin } from '@/storage/pin';
import { useBumpReload } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

type Step = 'loading' | 'createPin' | 'enterPin' | 'backup' | 'confirm';

export default function WipeScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();

  const [step, setStep] = useState<Step>('loading');
  const [pinDigits, setPinDigits] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [confirmStage, setConfirmStage] = useState(false);
  const [backupDone, setBackupDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const pinInputRef = useRef<TextInput>(null);

  useEffect(() => {
    (async () => {
      const exists = await hasPin();
      setStep(exists ? 'enterPin' : 'createPin');
    })();
  }, []);

  useEffect(() => {
    if (step === 'createPin' || step === 'enterPin') {
      setTimeout(() => pinInputRef.current?.focus(), 200);
    }
  }, [step]);

  const onCreatePin = useCallback(async () => {
    if (pinDigits.length < 4) {
      Alert.alert('PIN curto', 'O PIN precisa ter pelo menos 4 dígitos.');
      return;
    }
    if (!confirmStage) {
      setPinConfirm(pinDigits);
      setPinDigits('');
      setConfirmStage(true);
      return;
    }
    if (pinDigits !== pinConfirm) {
      Alert.alert('PINs diferentes', 'Os PINs digitados não coincidem. Tente novamente.');
      setPinDigits('');
      setPinConfirm('');
      setConfirmStage(false);
      return;
    }
    setBusy(true);
    try {
      await savePin(pinDigits);
      setStep('backup');
    } catch (e: any) {
      Alert.alert('Erro ao salvar PIN', e?.message ?? 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, [pinDigits, pinConfirm, confirmStage]);

  const onVerifyPin = useCallback(async () => {
    if (pinDigits.length < 4) return;
    setBusy(true);
    try {
      const ok = await verifyPin(pinDigits);
      if (!ok) {
        Alert.alert('PIN incorreto', 'O PIN digitado não confere.');
        setPinDigits('');
        return;
      }
      setStep('backup');
    } finally {
      setBusy(false);
    }
  }, [pinDigits]);

  const onExportBackup = useCallback(async () => {
    setBusy(true);
    try {
      const payload = await exportAll(db);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const file = new File(Paths.document, `cofrinho-backup-${stamp}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      const available = await Sharing.isAvailableAsync();
      if (available) {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Salvar backup antes de apagar',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Backup salvo', `Arquivo: ${file.uri}`);
      }
      setBackupDone(true);
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e?.message ?? 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, [db]);

  const onWipe = useCallback(async () => {
    setBusy(true);
    try {
      await db.execAsync(
        'DELETE FROM transactions; DELETE FROM recurring_templates; DELETE FROM budgets; DELETE FROM cards; DELETE FROM categories;'
      );
      const { migrate } = await import('@/db/schema');
      await db.execAsync('PRAGMA user_version = 0');
      await migrate(db);
      bump();
      router.back();
      setTimeout(() => Alert.alert('Pronto', 'Todos os dados foram apagados.'), 200);
    } catch (e: any) {
      Alert.alert('Erro ao apagar', e?.message ?? 'Tente novamente.');
    } finally {
      setBusy(false);
    }
  }, [db, bump, router]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 12,
        }}
      >
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: colors.bgSoft,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <X size={20} color={colors.inkSoft} />
        </Pressable>
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Apagar tudo</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 12 }}>
        {step === 'loading' ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <ActivityIndicator color={colors.brand} />
          </View>
        ) : null}

        {step === 'createPin' ? (
          <View style={{ gap: 20 }}>
            <Header
              Icon={Shield}
              tint={colors.brand}
              title={confirmStage ? 'Confirme o PIN' : 'Crie um PIN de segurança'}
              subtitle={
                confirmStage
                  ? 'Digite o mesmo PIN novamente para confirmar.'
                  : '4 a 6 dígitos. Você precisará dele toda vez que quiser apagar os dados.'
              }
            />
            <PinField
              inputRef={pinInputRef}
              value={pinDigits}
              onChange={setPinDigits}
            />
            <PrimaryButton
              label={confirmStage ? 'Salvar PIN' : 'Continuar'}
              onPress={onCreatePin}
              disabled={pinDigits.length < 4 || busy}
              busy={busy}
            />
          </View>
        ) : null}

        {step === 'enterPin' ? (
          <View style={{ gap: 20 }}>
            <Header
              Icon={Lock}
              tint={colors.warn}
              title="Digite seu PIN"
              subtitle="Este PIN protege o app de exclusões acidentais."
            />
            <PinField
              inputRef={pinInputRef}
              value={pinDigits}
              onChange={setPinDigits}
            />
            <PrimaryButton
              label="Verificar"
              onPress={onVerifyPin}
              disabled={pinDigits.length < 4 || busy}
              busy={busy}
            />
          </View>
        ) : null}

        {step === 'backup' ? (
          <View style={{ gap: 20 }}>
            <Header
              Icon={Download}
              tint={colors.accent}
              title="Faça um backup antes"
              subtitle="É obrigatório exportar um backup antes de apagar tudo. Sem isso, você perde tudo."
            />
            <PrimaryButton
              label={backupDone ? 'Backup salvo ✓ — Exportar de novo' : 'Exportar backup agora'}
              onPress={onExportBackup}
              disabled={busy}
              busy={busy}
              variant={backupDone ? 'secondary' : 'primary'}
            />
            {backupDone ? (
              <PrimaryButton
                label="Continuar para apagar"
                onPress={() => setStep('confirm')}
                disabled={busy}
                variant="primary"
              />
            ) : null}
          </View>
        ) : null}

        {step === 'confirm' ? (
          <View style={{ gap: 20 }}>
            <Header
              Icon={Trash2}
              tint={colors.expense}
              title="Apagar mesmo?"
              subtitle="Isso vai apagar TUDO: lançamentos, categorias, cartões, recorrências, orçamentos. Você fez backup?"
            />
            <PrimaryButton
              label="Sim, apagar tudo"
              onPress={() =>
                Alert.alert(
                  'Última confirmação',
                  'Tem certeza absoluta? Esta ação NÃO pode ser desfeita.',
                  [
                    { text: 'Cancelar', style: 'cancel' },
                    { text: 'Apagar tudo', style: 'destructive', onPress: onWipe },
                  ]
                )
              }
              disabled={busy}
              busy={busy}
              variant="danger"
            />
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}

function Header({
  Icon,
  tint,
  title,
  subtitle,
}: {
  Icon: any;
  tint: string;
  title: string;
  subtitle: string;
}) {
  return (
    <View style={{ alignItems: 'center', gap: 12, paddingTop: 24 }}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 20,
          backgroundColor: `${tint}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={28} color={tint} strokeWidth={2.4} />
      </View>
      <Text
        style={{
          color: colors.ink,
          fontSize: 20,
          fontWeight: '800',
          textAlign: 'center',
        }}
      >
        {title}
      </Text>
      <Text
        style={{
          color: colors.inkMuted,
          fontSize: 14,
          textAlign: 'center',
          lineHeight: 20,
          paddingHorizontal: 16,
        }}
      >
        {subtitle}
      </Text>
    </View>
  );
}

function PinField({
  inputRef,
  value,
  onChange,
}: {
  inputRef: React.RefObject<TextInput | null>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      haptic={false}
      scaleTo={1}
      style={{
        backgroundColor: colors.bgCard,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: colors.line,
        paddingVertical: 18,
        alignItems: 'center',
      }}
    >
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(v) => onChange(v.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={6}
        style={{
          color: colors.ink,
          fontSize: 32,
          fontWeight: '800',
          textAlign: 'center',
          letterSpacing: 12,
          minWidth: 200,
        }}
      />
    </Pressable>
  );
}

function PrimaryButton({
  label,
  onPress,
  disabled,
  busy,
  variant = 'primary',
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  busy?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  const bg =
    variant === 'danger'
      ? colors.expense
      : variant === 'secondary'
      ? colors.bgElev
      : colors.brand;
  const fg = variant === 'secondary' ? colors.ink : colors.bg;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      haptic="medium"
      scaleTo={0.97}
      style={{
        backgroundColor: disabled ? colors.bgElev : bg,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      {busy ? (
        <ActivityIndicator size="small" color={disabled ? colors.inkDim : fg} />
      ) : (
        <Check size={18} color={disabled ? colors.inkDim : fg} strokeWidth={2.6} />
      )}
      <Text
        style={{
          color: disabled ? colors.inkDim : fg,
          fontSize: 15,
          fontWeight: '800',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
