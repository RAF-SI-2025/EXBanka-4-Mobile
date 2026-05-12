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
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  acceptNegotiation,
  counterOffer,
  getNegotiation,
  rejectNegotiation,
} from '../../services/otcService';
import { getMyAccounts } from '../../services/accountService';
import { useAuth } from '../../context/AuthContext';
import { card, colors } from '../../theme';

const STATUS_COLORS = {
  PENDING_SELLER: colors.warning,
  PENDING_BUYER:  colors.primary,
  ACCEPTED:       colors.success,
  REJECTED:       colors.error,
};
const STATUS_LABELS = {
  PENDING_SELLER: 'Na čekanju (prodavac)',
  PENDING_BUYER:  'Na čekanju (kupac)',
  ACCEPTED:       'Prihvaćeno',
  REJECTED:       'Odbijeno',
};

function fmt(v, decimals = 2) {
  return Number(v).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDateTime(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s.slice(0, 10);
  return d.toLocaleString('sr-RS', { dateStyle: 'short', timeStyle: 'short' });
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isFutureDate(s) {
  if (!DATE_RE.test(s)) return false;
  return s > new Date().toISOString().slice(0, 10);
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function OTCNegotiationDetailScreen({ route }) {
  const { negotiationId } = route.params;
  const { user } = useAuth();

  const [neg, setNeg]               = useState(null);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const [mode, setMode]             = useState(null); // null | 'counter' | 'accept'
  const [accounts, setAccounts]     = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [amount, setAmount]         = useState('');
  const [price, setPrice]           = useState('');
  const [settlement, setSettlement] = useState('');
  const [premium, setPremium]       = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await getNegotiation(negotiationId);
      setNeg(data);
    } catch {
      setError('Nije moguće učitati pregovor.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [negotiationId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isSeller = neg && neg.sellerType === 'CLIENT' && String(neg.sellerId) === String(user?.id);
  const isBuyer  = neg && neg.buyerType  === 'CLIENT' && String(neg.buyerId)  === String(user?.id);
  const isActive = neg && (neg.status === 'PENDING_SELLER' || neg.status === 'PENDING_BUYER');
  const isMyTurn = neg && (
    (neg.status === 'PENDING_SELLER' && isSeller) ||
    (neg.status === 'PENDING_BUYER'  && isBuyer)
  );
  const canAct = isActive && isMyTurn;

  const openCounter = () => {
    setAmount(String(neg.amount));
    setPrice(String(neg.pricePerStock));
    setSettlement(neg.settlementDate ?? '');
    setPremium(String(neg.premium ?? 0));
    setMode('counter');
  };

  const openAccept = async () => {
    // Only the buyer needs to select an account (for premium payment).
    // When the seller accepts (PENDING_SELLER), the backend auto-finds the buyer's account.
    if (isBuyer) {
      try {
        const accs = await getMyAccounts();
        setAccounts(accs ?? []);
        setSelectedAccount(accs?.[0] ?? null);
      } catch {
        setAccounts([]);
      }
    }
    setMode('accept');
  };

  const submitCounter = async () => {
    const parsedAmt = parseInt(amount, 10);
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedAmt) || parsedAmt <= 0 || isNaN(parsedPrice) || parsedPrice <= 0) {
      Alert.alert('Greška', 'Unesite ispravne brojeve za količinu i cenu (moraju biti > 0).');
      return;
    }
    if (!DATE_RE.test(settlement)) {
      Alert.alert('Greška', 'Datum mora biti u formatu GGGG-MM-DD (npr. 2026-06-30).');
      return;
    }
    if (!isFutureDate(settlement)) {
      Alert.alert('Greška', 'Datum poravnanja mora biti u budućnosti.');
      return;
    }
    setSubmitting(true);
    try {
      await counterOffer(negotiationId, {
        amount:         parsedAmt,
        pricePerStock:  parsedPrice,
        settlementDate: settlement,
        premium:        premium ? parseFloat(premium.replace(',', '.')) : 0,
      });
      setMode(null);
      load();
    } catch (e) {
      Alert.alert('Greška', e?.response?.data?.error ?? 'Nije moguće poslati kontra-ponudu.');
    } finally {
      setSubmitting(false);
    }
  };

  const submitAccept = async () => {
    if (isBuyer && !selectedAccount) {
      Alert.alert('Greška', 'Izaberite račun za plaćanje premije.');
      return;
    }
    setSubmitting(true);
    try {
      await acceptNegotiation(negotiationId, isBuyer ? selectedAccount.accountId : undefined);
      setMode(null);
      load();
    } catch (e) {
      Alert.alert('Greška', e?.response?.data?.error ?? 'Nije moguće prihvatiti pregovor.');
    } finally {
      setSubmitting(false);
    }
  };

  const reject = () => {
    Alert.alert('Odbijanje pregovora', 'Da li ste sigurni?', [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Odbij',
        style: 'destructive',
        onPress: async () => {
          try {
            await rejectNegotiation(negotiationId);
            load();
          } catch (e) {
            Alert.alert('Greška', e?.response?.data?.error ?? 'Nije moguće odbiti pregovor.');
          }
        },
      },
    ]);
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }
  if (error || !neg) {
    return <View style={styles.center}><Text style={styles.errorText}>{error ?? 'Greška.'}</Text></View>;
  }

  const statusColor = STATUS_COLORS[neg.status] ?? colors.textMuted;

  if (mode === 'counter') {
    return (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView style={styles.container} contentContainerStyle={styles.formContent}>
          <View style={[card, styles.section]}>
            <Text style={styles.sectionTitle}>Kontra-ponuda — {neg.ticker}</Text>

            <Text style={styles.label}>Količina (kom)*</Text>
            <TextInput style={styles.input} value={amount} onChangeText={setAmount} keyboardType="number-pad" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Cena po akciji ({neg.currency})*</Text>
            <TextInput style={styles.input} value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Datum poravnanja (GGGG-MM-DD)*</Text>
            <TextInput style={styles.input} value={settlement} onChangeText={setSettlement} placeholder="2025-12-31" placeholderTextColor={colors.textMuted} />

            <Text style={styles.label}>Premija ({neg.currency})</Text>
            <TextInput style={styles.input} value={premium} onChangeText={setPremium} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={colors.textMuted} />

            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }, submitting && { opacity: 0.5 }]} onPress={submitCounter} disabled={submitting}>
              <Text style={styles.actionBtnText}>{submitting ? 'Slanje...' : 'Pošalji kontra-ponudu'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode(null)}>
              <Text style={styles.cancelBtnText}>Odustani</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  if (mode === 'accept') {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.formContent}>
        <View style={[card, styles.section]}>
          <Text style={styles.sectionTitle}>Prihvatanje — {neg.ticker}</Text>

          <View style={styles.premiumBox}>
            <Text style={styles.premiumLabel}>Premija</Text>
            <Text style={styles.premiumValue}>{fmt(neg.premium ?? 0)} {neg.currency}</Text>
          </View>

          {isBuyer ? (
            <>
              <Text style={styles.label}>Odaberite račun za plaćanje premije</Text>
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
            </>
          ) : (
            <Text style={styles.sellerAcceptNote}>
              Kupac će biti zadužen za premiju. Nije potrebno birati račun.
            </Text>
          )}

          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }, submitting && { opacity: 0.5 }]} onPress={submitAccept} disabled={submitting}>
            <Text style={styles.actionBtnText}>{submitting ? 'Slanje...' : 'Potvrdi prihvatanje'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={() => setMode(null)}>
            <Text style={styles.cancelBtnText}>Odustani</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
      <View style={[styles.statusBanner, { backgroundColor: statusColor + '18', borderColor: statusColor }]}>
        <Text style={[styles.statusBannerText, { color: statusColor }]}>
          {STATUS_LABELS[neg.status] ?? neg.status}
        </Text>
      </View>

      <View style={[card, styles.section]}>
        <Text style={styles.sectionTitle}>{neg.ticker}</Text>
        <Row label="Prodavac"          value={neg.sellerName ?? '—'} />
        <Row label="Kupac"             value={neg.buyerName ?? '—'} />
        <Row label="Količina"          value={`${fmt(neg.amount, 0)} kom`} />
        <Row label="Cena po akciji"    value={`${fmt(neg.pricePerStock)} ${neg.currency}`} />
        <Row label="Premija"           value={`${fmt(neg.premium ?? 0)} ${neg.currency}`} />
        <Row label="Datum poravnanja"  value={neg.settlementDate ?? '—'} />
        <Row label="Izmenio"           value={neg.modifiedByName ?? '—'} />
        <Row label="Poslednja izmena"  value={fmtDateTime(neg.lastModified)} />
      </View>

      {isActive && canAct && (
        <View style={styles.actionsSection}>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.success }]} onPress={openAccept}>
            <Text style={styles.actionBtnText}>Prihvati</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.primary }]} onPress={openCounter}>
            <Text style={styles.actionBtnText}>Kontra-ponuda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.error }]} onPress={reject}>
            <Text style={styles.actionBtnText}>Odbij</Text>
          </TouchableOpacity>
        </View>
      )}

      {isActive && !isMyTurn && (
        <View style={styles.waitBanner}>
          <Text style={styles.waitText}>Čekate odgovor druge strane.</Text>
        </View>
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

  statusBanner:     { borderWidth: 1, borderRadius: 8, padding: 10, marginBottom: 12, alignItems: 'center' },
  statusBannerText: { fontSize: 14, fontWeight: '700' },

  section:      { padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 },

  row:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5,
               borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel:  { fontSize: 13, color: colors.textSecondary, flex: 1 },
  rowValue:  { fontSize: 13, fontWeight: '500', color: colors.textPrimary, textAlign: 'right', flex: 1 },

  actionsSection: { gap: 10, marginBottom: 12 },
  actionBtn:      { paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  actionBtnText:  { color: '#fff', fontSize: 15, fontWeight: '600' },

  waitBanner: { padding: 12, borderRadius: 8, backgroundColor: colors.bgSurface, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  waitText:   { color: colors.textMuted, fontSize: 13 },

  formContent: { padding: 16, paddingBottom: 32 },
  label:       { fontSize: 13, color: colors.textSecondary, marginBottom: 4, marginTop: 12 },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: colors.textPrimary, backgroundColor: colors.bgPage,
  },
  cancelBtn:     { marginTop: 10, paddingVertical: 12, alignItems: 'center' },
  cancelBtnText: { color: colors.textMuted, fontSize: 14 },

  accRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
    marginTop: 8, backgroundColor: colors.bgPage,
  },
  accRowSelected: { borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  accNumber:      { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  accBalance:     { fontSize: 13, color: colors.textSecondary },

  premiumBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: 8, backgroundColor: colors.bgPage,
    borderWidth: 1, borderColor: colors.border, marginBottom: 12,
  },
  premiumLabel: { fontSize: 13, color: colors.textSecondary },
  premiumValue: { fontSize: 14, fontWeight: '700', color: colors.textPrimary },

  sellerAcceptNote: {
    fontSize: 13, color: colors.textMuted, textAlign: 'center',
    marginVertical: 16, fontStyle: 'italic',
  },
});
