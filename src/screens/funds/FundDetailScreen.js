import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { getFund, investInFund } from '../../services/fundService';
import { getMyAccounts } from '../../services/accountService';
import { card, colors } from '../../theme';

function fmt(v, decimals = 2) {
  return Number(v).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function FundDetailScreen({ route }) {
  const { fundId } = route.params;

  const [fund, setFund]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const [investing, setInvesting]   = useState(false);
  const [accounts, setAccounts]     = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount]         = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getFund(fundId);
      setFund(data);
    } catch {
      setError('Nije moguće učitati fond.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fundId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const openInvest = async () => {
    try {
      const accs = await getMyAccounts();
      setAccounts(accs ?? []);
      setSelectedAccount(accs?.[0] ?? null);
    } catch {
      Alert.alert('Greška', 'Nije moguće učitati račune.');
      return;
    }
    setAmount('');
    setInvesting(true);
  };

  const submitInvest = async () => {
    const parsedAmt = parseFloat(amount.replace(',', '.'));
    if (!selectedAccount || isNaN(parsedAmt) || parsedAmt <= 0) {
      Alert.alert('Greška', 'Izaberite račun i unesite ispravan iznos.');
      return;
    }
    if (parsedAmt < (fund?.minimumContribution ?? 0)) {
      Alert.alert('Greška', `Minimalni ulog je ${fmt(fund.minimumContribution)} RSD.`);
      return;
    }
    if (parsedAmt > (selectedAccount.availableBalance ?? 0)) {
      Alert.alert('Greška', `Nedovoljno sredstava na računu (dostupno: ${fmt(selectedAccount.availableBalance)} ${selectedAccount.currency}).`);
      return;
    }
    setSubmitting(true);
    try {
      await investInFund(fundId, selectedAccount.accountId, parsedAmt);
      setInvesting(false);
      load();
      Alert.alert('Uspešno', 'Uspešno ste uložili u fond.');
    } catch (e) {
      Alert.alert('Greška', e?.response?.data?.error ?? 'Nije moguće uložiti u fond.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error || !fund) {
    return <View style={styles.center}><Text style={styles.errorText}>{error ?? 'Greška.'}</Text></View>;
  }

  const profitColor = (fund.profit ?? 0) >= 0 ? colors.success : colors.error;

  if (investing) {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.formContent}>
          <View style={[card, styles.section]}>
            <Text style={styles.sectionTitle}>Ulaganje u fond</Text>
            <Text style={styles.subtitle}>{fund.name}</Text>
            <Text style={styles.minNote}>Min. ulog: {fmt(fund.minimumContribution)} RSD</Text>

            <Text style={styles.label}>Odaberite račun*</Text>
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
            {accounts.length === 0 && <Text style={styles.emptyText}>Nema dostupnih računa.</Text>}

            <Text style={styles.label}>Iznos (RSD)*</Text>
            <TextInput
              style={styles.input}
              value={amount}
              onChangeText={setAmount}
              keyboardType="decimal-pad"
              placeholder={`min ${fmt(fund.minimumContribution)}`}
              placeholderTextColor={colors.textMuted}
            />

            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.5 }]}
              onPress={submitInvest}
              disabled={submitting}
            >
              <Text style={styles.submitBtnText}>{submitting ? 'Slanje...' : 'Uloži'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setInvesting(false)}>
              <Text style={styles.cancelBtnText}>Odustani</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
          colors={[colors.primary]} tintColor={colors.primary} />
      }
    >
      {!fund.active && (
        <View style={styles.inactiveBanner}>
          <Text style={styles.inactiveBannerText}>Ovaj fond je neaktivan</Text>
        </View>
      )}

      <View style={[card, styles.section]}>
        <Text style={styles.sectionTitle}>{fund.name}</Text>
        {fund.description ? <Text style={styles.desc}>{fund.description}</Text> : null}
        <Row label="Menadžer"          value={fund.managerName ?? '—'} />
        <Row label="Vrednost fonda"    value={`${fmt(fund.fundValue)} RSD`} />
        <Row label="Likvidna imovina"  value={`${fmt(fund.liquidAssets)} RSD`} />
        <Row label="Profit"            value={
          <Text style={{ color: profitColor, fontWeight: '600' }}>
            {(fund.profit ?? 0) >= 0 ? '+' : ''}{fmt(fund.profit ?? 0)} RSD
          </Text>
        } />
        <Row label="Min. ulog"         value={`${fmt(fund.minimumContribution)} RSD`} />
        <Row label="Račun fonda"       value={fund.accountNumber ?? '—'} />
      </View>

      {fund.active && (
        <TouchableOpacity style={styles.investBtn} onPress={openInvest}>
          <Text style={styles.investBtnText}>Uloži u fond</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage },
  content:   { padding: 16, paddingBottom: 32 },
  center:    { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText: { color: colors.error, fontSize: 14 },
  emptyText: { color: colors.textMuted, fontSize: 13, textAlign: 'center', marginTop: 8 },

  inactiveBanner:     { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center', borderColor: colors.error, backgroundColor: colors.error + '18' },
  inactiveBannerText: { color: colors.error, fontSize: 13, fontWeight: '600' },

  section:      { padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 },
  desc:         { fontSize: 13, color: colors.textMuted, marginBottom: 12, lineHeight: 18 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5,
               borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:  { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:  { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'right', flex: 1 },

  investBtn:     { margin: 0, marginBottom: 0, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  investBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  formContent: { padding: 16, paddingBottom: 32 },
  subtitle:    { fontSize: 13, color: colors.primary, fontWeight: '600', marginBottom: 4 },
  minNote:     { fontSize: 12, color: colors.textMuted, marginBottom: 16 },
  label:       { fontSize: 13, color: colors.textSecondary, marginBottom: 4, marginTop: 12 },
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
