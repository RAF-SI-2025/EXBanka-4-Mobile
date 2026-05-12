import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyFundPositions, withdrawFromFund } from '../../services/fundService';
import { getMyAccounts } from '../../services/accountService';
import { card, colors } from '../../theme';

function fmt(v, decimals = 2) {
  return Number(v).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function PositionItem({ item, onWithdraw }) {
  const profitColor = (item.profit ?? 0) >= 0 ? colors.success : colors.error;
  const pct = ((item.profit ?? 0) / Math.max(item.totalInvestedAmount, 1)) * 100;
  return (
    <View style={[card, styles.card]}>
      <Text style={styles.fundName}>{item.fundName}</Text>
      {item.description ? <Text style={styles.desc} numberOfLines={1}>{item.description}</Text> : null}
      <View style={styles.row}>
        <View>
          <Text style={styles.valLabel}>Trenutna vrednost</Text>
          <Text style={styles.valPrimary}>{fmt(item.currentPositionValue)} RSD</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.valLabel}>Uloženo</Text>
          <Text style={styles.valSecondary}>{fmt(item.totalInvestedAmount)} RSD</Text>
        </View>
      </View>
      <View style={styles.row}>
        <Text style={[styles.profit, { color: profitColor }]}>
          {(item.profit ?? 0) >= 0 ? '+' : ''}{fmt(item.profit ?? 0)} RSD ({pct >= 0 ? '+' : ''}{pct.toFixed(2)}%)
        </Text>
        <Text style={styles.share}>{fmt(item.fundPercentage, 4)}% fonda</Text>
      </View>
      <TouchableOpacity style={styles.withdrawBtn} onPress={() => onWithdraw(item)}>
        <Text style={styles.withdrawBtnText}>Povuci sredstva</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function MyFundPositionsScreen() {
  const [positions, setPositions]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const [withdrawing, setWithdrawing] = useState(null);
  const [accounts, setAccounts]       = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount]           = useState('');
  const [withdrawAll, setWithdrawAll] = useState(false);
  const [submitting, setSubmitting]   = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getMyFundPositions();
      setPositions(data ?? []);
    } catch {
      setError('Nije moguće učitati investicije.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openWithdraw = async (position) => {
    try {
      const accs = await getMyAccounts();
      setAccounts(accs ?? []);
      setSelectedAccount(accs?.[0] ?? null);
    } catch {
      Alert.alert('Greška', 'Nije moguće učitati račune.');
      return;
    }
    setAmount('');
    setWithdrawAll(false);
    setWithdrawing(position);
  };

  const submitWithdraw = async () => {
    if (!selectedAccount) {
      Alert.alert('Greška', 'Izaberite račun.');
      return;
    }
    const parsedAmt = withdrawAll ? 0 : parseFloat(amount.replace(',', '.'));
    if (!withdrawAll && (isNaN(parsedAmt) || parsedAmt <= 0)) {
      Alert.alert('Greška', 'Unesite ispravan iznos ili izaberite "Povuci sve".');
      return;
    }
    setSubmitting(true);
    try {
      const resp = await withdrawFromFund(
        withdrawing.fundId,
        selectedAccount.accountId,
        parsedAmt,
        withdrawAll,
      );
      setWithdrawing(null);
      load();
      if (resp?.message) {
        Alert.alert('Na čekanju', resp.message);
      } else {
        Alert.alert('Uspešno', 'Sredstva su povučena.');
      }
    } catch (e) {
      Alert.alert('Greška', e?.response?.data?.error ?? 'Nije moguće povući sredstva.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  if (withdrawing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.formContent}>
          <View style={[card, styles.section]}>
            <Text style={styles.sectionTitle}>Povlačenje iz fonda</Text>
            <Text style={styles.subtitle}>{withdrawing.fundName}</Text>
            <Text style={styles.available}>Dostupno: {fmt(withdrawing.currentPositionValue)} RSD</Text>

            <Text style={styles.label}>Odaberite destinacioni račun*</Text>
            {accounts.map((acc) => (
              <TouchableOpacity
                key={acc.accountId}
                style={[styles.accRow, selectedAccount?.accountId === acc.accountId && styles.accRowSelected]}
                onPress={() => setSelectedAccount(acc)}
              >
                <Text style={styles.accNumber}>{acc.accountNumber}</Text>
                <Text style={styles.accBalance}>{fmt(acc.availableBalance)} {acc.currency}</Text>
              </TouchableOpacity>
            ))}

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Povuci sve</Text>
              <Switch
                value={withdrawAll}
                onValueChange={setWithdrawAll}
                trackColor={{ true: colors.primary }}
              />
            </View>

            {!withdrawAll && (
              <>
                <Text style={styles.label}>Iznos (RSD)*</Text>
                <TextInput
                  style={styles.input}
                  value={amount}
                  onChangeText={setAmount}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
              onPress={submitWithdraw}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Slanje...' : 'Povuci sredstva'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setWithdrawing(null)}>
              <Text style={styles.cancelBtnText}>Odustani</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={styles.list}
      data={positions}
      keyExtractor={(item) => String(item.fundId)}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
          colors={[colors.primary]} tintColor={colors.primary} />
      }
      ListEmptyComponent={
        <View style={styles.center}>
          <Text style={styles.emptyText}>{error || 'Nemate aktivnih investicija u fondove.'}</Text>
        </View>
      }
      renderItem={({ item }) => (
        <PositionItem item={item} onWithdraw={openWithdraw} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText: { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  list:      { padding: 16, paddingBottom: 24 },

  card:        { padding: 16, marginBottom: 12 },
  fundName:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 2 },
  desc:        { fontSize: 11, color: colors.textMuted, marginBottom: 10 },
  row:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 },
  valLabel:    { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  valPrimary:  { fontSize: 16, fontWeight: '700', color: colors.primary },
  valSecondary:{ fontSize: 13, color: colors.textSecondary },
  profit:      { fontSize: 13, fontWeight: '600' },
  share:       { fontSize: 11, color: colors.textMuted },
  withdrawBtn: { marginTop: 6, paddingVertical: 10, borderWidth: 1, borderColor: colors.primary, borderRadius: 8, alignItems: 'center' },
  withdrawBtnText: { color: colors.primary, fontSize: 13, fontWeight: '600' },

  formContent: { padding: 16, paddingBottom: 32 },
  section:     { padding: 20 },
  sectionTitle:{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtitle:    { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 2 },
  available:   { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  label:       { fontSize: 13, color: colors.textSecondary, marginBottom: 4, marginTop: 12 },
  switchRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, marginBottom: 4 },
  switchLabel: { fontSize: 14, color: colors.textPrimary },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: colors.textPrimary, backgroundColor: colors.bgPage,
  },
  accRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    marginBottom: 8, backgroundColor: colors.bgPage,
  },
  accRowSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  accNumber:      { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  accBalance:     { fontSize: 13, color: colors.textSecondary },
  submitBtn:      { marginTop: 20, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  submitBtnText:  { color: '#fff', fontSize: 15, fontWeight: '600' },
  cancelBtn:      { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText:  { color: colors.textMuted, fontSize: 14 },
});
