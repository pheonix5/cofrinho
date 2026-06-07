import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import {
  Download,
  Upload,
  Trash2,
  Info,
  ChevronRight,
  Loader,
  Repeat,
  Target,
  Layers,
  Bell,
} from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { exportAll, importAll } from '@/db/backup';
import type { BackupPayload, ImportMode } from '@/db/backup';
import { useBumpReload } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

export default function SettingsScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();
  const [busy, setBusy] = useState<string | null>(null);

  const handleExport = async () => {
    try {
      setBusy('export');
      const payload = await exportAll(db);
      const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const file = new File(Paths.document, `cofrinho-backup-${stamp}.json`);
      file.create({ overwrite: true });
      file.write(JSON.stringify(payload, null, 2));

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Backup salvo', `Arquivo: ${file.uri}`);
      } else {
        await Sharing.shareAsync(file.uri, {
          mimeType: 'application/json',
          dialogTitle: 'Exportar backup do Cofrinho',
          UTI: 'public.json',
        });
      }
    } catch (e: any) {
      Alert.alert('Erro ao exportar', e?.message ?? 'Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;

      const asset = res.assets[0];
      const file = new File(asset.uri);
      const text = file.textSync();
      const payload = JSON.parse(text) as BackupPayload;

      Alert.alert(
        'Importar backup',
        `Encontrei ${payload.transactions?.length ?? 0} lançamentos e ${payload.categories?.length ?? 0} categorias.\n\nComo deseja importar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Mesclar',
            onPress: () => runImport(payload, 'merge'),
          },
          {
            text: 'Substituir tudo',
            style: 'destructive',
            onPress: () =>
              Alert.alert(
                'Substituir tudo?',
                'Todos os lançamentos e categorias atuais serão apagados.',
                [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Substituir',
                    style: 'destructive',
                    onPress: () => runImport(payload, 'replace'),
                  },
                ]
              ),
          },
        ]
      );
    } catch (e: any) {
      Alert.alert('Erro ao importar', e?.message ?? 'Arquivo inválido.');
    }
  };

  const runImport = async (payload: BackupPayload, mode: ImportMode) => {
    try {
      setBusy('import');
      const result = await importAll(db, payload, mode);
      bump();
      Alert.alert(
        'Importação concluída',
        `${result.transactions} lançamentos, ${result.categories} categorias, ${result.recurring} recorrências, ${result.budgets} orçamentos e ${result.cards} cartões importados.`
      );
    } catch (e: any) {
      Alert.alert('Erro ao importar', e?.message ?? 'Tente novamente.');
    } finally {
      setBusy(null);
    }
  };

  const handleWipe = () => {
    router.push('/wipe');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
        <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 }}>
          <Text style={{ color: colors.inkMuted, fontSize: 12, fontWeight: '600', letterSpacing: 0.5 }}>
            CONFIGURAÇÕES
          </Text>
          <Text style={{ color: colors.ink, fontSize: 22, fontWeight: '800', marginTop: 2 }}>
            Ajustes
          </Text>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 24 }}>
        <Section title="Automatizar">
          <Item
            Icon={Repeat}
            tint={colors.accent}
            title="Lançamentos recorrentes"
            subtitle="Salário, assinaturas, contas fixas"
            onPress={() => router.push('/recurring')}
          />
          <Item
            Icon={Target}
            tint={colors.brand}
            title="Orçamentos por categoria"
            subtitle="Defina limites mensais de gastos"
            onPress={() => router.push('/budgets')}
          />
          <Item
            Icon={Layers}
            tint={colors.accent}
            title="Lançamento parcelado"
            subtitle="Compra ou dívida com data para acabar"
            onPress={() => router.push('/installment')}
          />
          <Item
            Icon={Bell}
            tint={colors.warn}
            title="Notificações"
            subtitle="Lembrete antes da fatura vencer"
            onPress={() => router.push('/notifications')}
          />
        </Section>

        <Section title="Dados">
          <Item
            Icon={Download}
            tint={colors.brand}
            title="Exportar backup"
            subtitle="Salvar todos os dados em JSON"
            busy={busy === 'export'}
            onPress={handleExport}
          />
          <Item
            Icon={Upload}
            tint={colors.accent}
            title="Importar backup"
            subtitle="Restaurar de um arquivo JSON"
            busy={busy === 'import'}
            onPress={handleImport}
          />
          <Item
            Icon={Trash2}
            tint={colors.expense}
            title="Apagar todos os dados"
            subtitle="Limpa lançamentos e categorias"
            danger
            onPress={handleWipe}
          />
        </Section>

        <Section title="Sobre">
          <Item
            Icon={Info}
            tint={colors.inkSoft}
            title="Cofrinho"
            subtitle="v1.0 · 100% local · sem login"
          />
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          color: colors.inkMuted,
          fontSize: 11,
          fontWeight: '700',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: colors.bgCard,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: colors.line,
          overflow: 'hidden',
        }}
      >
        {children}
      </View>
    </View>
  );
}

function Item({
  Icon,
  tint,
  title,
  subtitle,
  onPress,
  danger,
  busy,
}: {
  Icon: any;
  tint: string;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  danger?: boolean;
  busy?: boolean;
}) {
  const node = (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        borderBottomWidth: 1,
        borderBottomColor: colors.line,
      }}
    >
      <View
        style={{
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: `${tint}22`,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {busy ? <Loader size={18} color={tint} /> : <Icon size={18} color={tint} strokeWidth={2.4} />}
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text
          style={{
            color: danger ? colors.expense : colors.ink,
            fontSize: 15,
            fontWeight: '700',
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={{ color: colors.inkMuted, fontSize: 12 }}>{subtitle}</Text>
        ) : null}
      </View>
      {onPress ? <ChevronRight size={18} color={colors.inkDim} /> : null}
    </View>
  );

  if (!onPress) return node;
  return (
    <Pressable onPress={onPress} haptic="selection" disabled={busy}>
      {node}
    </Pressable>
  );
}
