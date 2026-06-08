import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ScrollView, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Plus, Check, Trash2, Pencil } from 'lucide-react-native';

import { Pressable } from '@/components/Pressable';
import { CategoryIcon, CATEGORY_ICON_NAMES } from '@/components/CategoryIcon';
import { KindToggle } from '@/components/KindToggle';
import { EmptyState } from '@/components/EmptyState';
import {
  countCategoryUsage,
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '@/db/categories';
import type { Category, TxKind } from '@/db/types';
import { useBumpReload } from '@/hooks/useReload';
import { colors } from '@/theme/colors';

const PALETTE = [
  '#F87171', '#FB923C', '#FBBF24', '#FACC15',
  '#A3E635', '#4ADE80', '#34D399', '#22D3EE',
  '#60A5FA', '#818CF8', '#A78BFA', '#C084FC',
  '#F472B6', '#FB7185', '#9AE66E', '#8A8A99',
];

export default function CategoriesScreen() {
  const db = useSQLiteContext();
  const router = useRouter();
  const bump = useBumpReload();

  const [kind, setKind] = useState<TxKind>('expense');
  const [categories, setCategories] = useState<Category[]>([]);
  const [editing, setEditing] = useState<Category | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    const all = await listCategories(db);
    setCategories(all);
  }, [db]);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(
    () => categories.filter((c) => c.kind === kind),
    [categories, kind]
  );

  const handleDelete = useCallback(
    async (cat: Category) => {
      const usage = await countCategoryUsage(db, cat.id);
      if (usage > 0) {
        Alert.alert(
          'Categoria em uso',
          `Esta categoria está usada em ${usage} ${
            usage === 1 ? 'lançamento/recorrência/orçamento' : 'itens'
          }. Apague-os antes ou edite-os para outra categoria.`
        );
        return;
      }
      Alert.alert('Apagar categoria?', `"${cat.name}" será removida.`, [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(db, cat.id);
            bump();
            await load();
          },
        },
      ]);
    },
    [db, bump, load]
  );

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
        <Text style={{ color: colors.ink, fontSize: 16, fontWeight: '700' }}>Categorias</Text>
        <Pressable
          onPress={() => setCreating(true)}
          haptic="medium"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            backgroundColor: colors.brand,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} color={colors.bg} strokeWidth={2.6} />
        </Pressable>
      </View>

      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <KindToggle value={kind} onChange={setKind} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 80, gap: 8 }}>
        {visible.length === 0 ? (
          <EmptyState
            title="Sem categorias deste tipo"
            subtitle="Toque em + para adicionar uma."
          />
        ) : (
          visible.map((cat) => (
            <View
              key={cat.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
                backgroundColor: colors.bgCard,
                borderRadius: 14,
                paddingHorizontal: 14,
                paddingVertical: 12,
                borderWidth: 1,
                borderColor: colors.line,
              }}
            >
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: `${cat.color}22`,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CategoryIcon name={cat.icon} color={cat.color} size={20} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.ink, fontSize: 15, fontWeight: '700' }}>
                  {cat.name}
                </Text>
                {cat.is_default ? (
                  <Text style={{ color: colors.inkMuted, fontSize: 11 }}>Padrão</Text>
                ) : null}
              </View>
              <Pressable
                onPress={() => setEditing(cat)}
                haptic="selection"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.bgElev,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Pencil size={16} color={colors.inkSoft} />
              </Pressable>
              <Pressable
                onPress={() => handleDelete(cat)}
                haptic="medium"
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: colors.bgElev,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Trash2 size={16} color={colors.expense} />
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>

      {creating ? (
        <CategoryEditor
          kind={kind}
          onClose={() => setCreating(false)}
          onSave={async (input) => {
            await createCategory(db, { ...input, kind });
            bump();
            setCreating(false);
            await load();
          }}
        />
      ) : null}

      {editing ? (
        <CategoryEditor
          initial={editing}
          kind={editing.kind}
          onClose={() => setEditing(null)}
          onSave={async (input) => {
            await updateCategory(db, editing.id, input);
            bump();
            setEditing(null);
            await load();
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

function CategoryEditor({
  initial,
  kind,
  onClose,
  onSave,
}: {
  initial?: Category;
  kind: TxKind;
  onClose: () => void;
  onSave: (input: { name: string; icon: string; color: string }) => Promise<void>;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [icon, setIcon] = useState(initial?.icon ?? CATEGORY_ICON_NAMES[0]);
  const [color, setColor] = useState(initial?.color ?? PALETTE[0]);
  const [saving, setSaving] = useState(false);
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 200);
  }, []);

  const handleSave = useCallback(async () => {
    if (!name.trim()) {
      Alert.alert('Nome obrigatório', 'Dê um nome à categoria.');
      return;
    }
    setSaving(true);
    try {
      await onSave({ name, icon, color });
    } catch (e: any) {
      Alert.alert('Erro ao salvar', e?.message ?? 'Tente novamente.');
    } finally {
      setSaving(false);
    }
  }, [name, icon, color, onSave]);

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
      }}
    >
      <Pressable onPress={onClose} haptic={false} style={{ flex: 1 }} />
      <View
        style={{
          backgroundColor: colors.bgSoft,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingTop: 18,
          paddingHorizontal: 20,
          paddingBottom: 28,
          gap: 16,
          borderTopWidth: 1,
          borderColor: colors.line,
        }}
      >
        <View
          style={{
            width: 48,
            height: 4,
            borderRadius: 2,
            backgroundColor: colors.line,
            alignSelf: 'center',
          }}
        />
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: `${color}22`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CategoryIcon name={icon} color={color} size={22} />
          </View>
          <Text style={{ flex: 1, color: colors.ink, fontSize: 16, fontWeight: '700' }}>
            {initial ? 'Editar categoria' : 'Nova categoria'}
            {kind === 'income' ? ' (entrada)' : ' (saída)'}
          </Text>
        </View>

        <TextInput
          ref={nameRef}
          value={name}
          onChangeText={setName}
          placeholder="Nome da categoria"
          placeholderTextColor={colors.inkDim}
          style={{
            backgroundColor: colors.bgCard,
            color: colors.ink,
            paddingHorizontal: 14,
            paddingVertical: 16,
            borderRadius: 14,
            fontSize: 15,
            borderWidth: 1,
            borderColor: colors.line,
            minHeight: 52,
          }}
        />

        <View>
          <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 }}>
            COR
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PALETTE.map((c) => (
              <Pressable
                key={c}
                onPress={() => setColor(c)}
                haptic="selection"
                scaleTo={0.9}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 12,
                  backgroundColor: c,
                  borderWidth: color === c ? 3 : 0,
                  borderColor: colors.ink,
                }}
              />
            ))}
          </View>
        </View>

        <View>
          <Text style={{ color: colors.inkMuted, fontSize: 11, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 }}>
            ÍCONE
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
              {CATEGORY_ICON_NAMES.map((n) => (
                <Pressable
                  key={n}
                  onPress={() => setIcon(n)}
                  haptic="selection"
                  scaleTo={0.9}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    backgroundColor: icon === n ? `${color}33` : colors.bgCard,
                    borderWidth: 1,
                    borderColor: icon === n ? color : colors.line,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CategoryIcon name={n} color={icon === n ? color : colors.inkSoft} size={20} />
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        <Pressable
          onPress={handleSave}
          haptic="medium"
          scaleTo={0.97}
          disabled={saving}
          style={{
            backgroundColor: name.trim() ? colors.brand : colors.bgElev,
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Check size={20} color={name.trim() ? colors.bg : colors.inkDim} strokeWidth={2.6} />
          <Text style={{ color: name.trim() ? colors.bg : colors.inkDim, fontSize: 16, fontWeight: '800' }}>
            {initial ? 'Salvar alterações' : 'Criar categoria'}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
