import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
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
  getOTCMarket,
  getMyNegotiations,
  createNegotiation,
  getMyContracts,
  exerciseContract,
} from '../../services/otcService';
import { getMyAccounts } from '../../services/accountService';
import { useAuth } from '../../context/AuthContext';
import { card, colors } from '../../theme';

// ─── helpers ────────────────────────────────────────────────────────────────

function fmt(v, decimals = 2) {
  return Number(v).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function fmtDate(s) {
  if (!s) return '—';
  return s.slice(0, 10);
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
function isFutureDate(s) {
  if (!DATE_RE.test(s)) return false;
  return s > new Date().toISOString().slice(0, 10);
}

function isMyTurnFn(neg, userId) {
  const id = String(userId);
  return (
    (neg.status === 'PENDING_SELLER' && neg.sellerType === 'CLIENT' && String(neg.sellerId) === id) ||
    (neg.status === 'PENDING_BUYER'  && neg.buyerType  === 'CLIENT' && String(neg.buyerId)  === id)
  );
}

// ─── top tab bar ─────────────────────────────────────────────────────────────

const TABS = [
  { key: 'negotiations', label: 'Pregovori' },
  { key: 'market',       label: 'Tržište' },
  { key: 'contracts',    label: 'Ugovori' },
];

function TopTabBar({ active, onChange }) {
  return (
    <View style={tabStyles.bar}>
      {TABS.map(tab => (
        <TouchableOpacity
          key={tab.key}
          style={[tabStyles.tab, active === tab.key && tabStyles.tabActive]}
          onPress={() => onChange(tab.key)}
          activeOpacity={0.7}
        >
          <Text style={[tabStyles.tabText, active === tab.key && tabStyles.tabTextActive]}>
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const tabStyles = StyleSheet.create({
  bar:         { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSurface },
  tab:         { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:   { borderBottomColor: colors.primary },
  tabText:     { fontSize: 12, fontWeight: '600', color: colors.textMuted, letterSpacing: 0.5 },
  tabTextActive:{ color: colors.primary },
});

// ─── NEGOTIATIONS tab ────────────────────────────────────────────────────────

function NegotiationRow({ neg, userId, onPress }) {
  const isActive = neg.status === 'PENDING_SELLER' || neg.status === 'PENDING_BUYER';
  const myTurn   = isActive && isMyTurnFn(neg, userId);
  const isSeller = neg.sellerType === 'CLIENT' && String(neg.sellerId) === String(userId);

  return (
    <TouchableOpacity style={negStyles.row} onPress={onPress} activeOpacity={0.75}>
      <View style={negStyles.col1}>
        <Text style={negStyles.ticker}>{neg.ticker}</Text>
        <Text style={negStyles.meta}>
          {isSeller ? 'Prodajem' : 'Kupujem'} · {isSeller ? neg.buyerName : neg.sellerName}
        </Text>
      </View>
      <View style={negStyles.col2}>
        <Text style={negStyles.price}>{fmt(neg.pricePerStock)} {neg.currency}</Text>
        <Text style={negStyles.amount}>{fmt(neg.amount, 0)} kom · {fmtDate(neg.settlementDate)}</Text>
      </View>
      <View style={negStyles.col3}>
        {isActive ? (
          <Text style={[negStyles.turnLabel, { color: myTurn ? colors.primary : colors.textMuted }]}>
            {myTurn ? '● Moj red' : '○ Čekam'}
          </Text>
        ) : (
          <Text style={[negStyles.turnLabel, { color: neg.status === 'ACCEPTED' ? colors.success : colors.error }]}>
            {neg.status === 'ACCEPTED' ? 'Prihvaćeno' : 'Odbijeno'}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

const negStyles = StyleSheet.create({
  row:       { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
               borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSurface },
  col1:      { flex: 1 },
  col2:      { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  col3:      { width: 72, alignItems: 'flex-end' },
  ticker:    { fontSize: 15, fontWeight: '700', color: colors.textPrimary, fontVariant: ['tabular-nums'] },
  meta:      { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  price:     { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
  amount:    { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  turnLabel: { fontSize: 12, fontWeight: '600', textAlign: 'right' },
});

function NegotiationsTab({ userId, onOpen }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const all = (await getMyNegotiations()) ?? [];
      setItems(all.filter(n => n.sellerType === 'CLIENT' && n.buyerType === 'CLIENT'));
    }
    catch { setError('Nije moguće učitati pregovore.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <FlatList
      data={items}
      keyExtractor={i => String(i.id)}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} tintColor={colors.primary} />}
      ListEmptyComponent={<View style={s.center}><Text style={s.empty}>{error || 'Nemate aktivnih pregovora.'}</Text></View>}
      renderItem={({ item }) => (
        <NegotiationRow neg={item} userId={userId} onPress={() => onOpen(item.id)} />
      )}
    />
  );
}

// ─── MARKET tab ──────────────────────────────────────────────────────────────

function OfferModal({ item, onClose, onSubmit }) {
  const [amount,    setAmount]    = useState('');
  const [price,     setPrice]     = useState('');
  const [premium,   setPremium]   = useState('');
  const [settlement, setSettlement] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const qty = parseInt(amount, 10);
    const pps = parseFloat(price.replace(',', '.'));
    if (!qty || qty <= 0 || isNaN(pps) || pps <= 0) {
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
      await onSubmit({
        ticker:        item.ticker,
        amount:        qty,
        pricePerStock: pps,
        premium:       premium ? parseFloat(premium.replace(',', '.')) : 0,
        settlementDate: settlement,
        sellerId:      item.ownerId,
        sellerType:    item.ownerType,
        currency:      item.currency,
      });
      onClose();
    } catch (e) {
      Alert.alert('Greška', e?.response?.data?.error ?? 'Nije moguće poslati ponudu.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <TouchableOpacity activeOpacity={1}>
            <View style={modalStyles.sheet}>
              <Text style={modalStyles.title}>Pošalji ponudu</Text>
              <Text style={modalStyles.subtitle}>
                <Text style={{ fontWeight: '700' }}>{item.ticker}</Text> · {item.name ?? ''} · {item.ownerName}
              </Text>

              <Text style={modalStyles.label}>Količina (max {item.amount})*</Text>
              <TextInput style={modalStyles.input} value={amount} onChangeText={setAmount}
                keyboardType="number-pad" placeholder={String(item.amount)} placeholderTextColor={colors.textMuted} />

              <Text style={modalStyles.label}>Cena po akciji ({item.currency})*</Text>
              <TextInput style={modalStyles.input} value={price} onChangeText={setPrice}
                keyboardType="decimal-pad" placeholder={fmt(item.pricePerStock)} placeholderTextColor={colors.textMuted} />

              <Text style={modalStyles.label}>Premija ({item.currency})</Text>
              <TextInput style={modalStyles.input} value={premium} onChangeText={setPremium}
                keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={colors.textMuted} />

              <Text style={modalStyles.label}>Datum poravnanja (GGGG-MM-DD)*</Text>
              <TextInput style={modalStyles.input} value={settlement} onChangeText={setSettlement}
                placeholder="2026-06-30" placeholderTextColor={colors.textMuted} />

              <View style={modalStyles.btnRow}>
                <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
                  <Text style={modalStyles.cancelText}>Odustani</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[modalStyles.submitBtn, submitting && { opacity: 0.5 }]}
                  onPress={handleSubmit} disabled={submitting}
                >
                  <Text style={modalStyles.submitText}>{submitting ? 'Slanje...' : 'Pošalji'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </TouchableOpacity>
    </Modal>
  );
}

function MarketRow({ item, onOffer }) {
  return (
    <View style={mktStyles.row}>
      <View style={mktStyles.col1}>
        <Text style={mktStyles.ticker}>{item.ticker}</Text>
        <Text style={mktStyles.name} numberOfLines={1}>{item.name ?? '—'}</Text>
      </View>
      <View style={mktStyles.col2}>
        <Text style={mktStyles.price}>{fmt(item.pricePerStock)} {item.currency}</Text>
        <Text style={mktStyles.meta}>{fmt(item.amount, 0)} kom · {item.ownerName}</Text>
      </View>
      <TouchableOpacity style={mktStyles.offerBtn} onPress={() => onOffer(item)}>
        <Text style={mktStyles.offerBtnText}>Ponudi</Text>
      </TouchableOpacity>
    </View>
  );
}

const mktStyles = StyleSheet.create({
  row:        { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
                borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSurface },
  col1:       { flex: 1 },
  col2:       { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  ticker:     { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  name:       { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  price:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
  meta:       { fontSize: 11, color: colors.textMuted, marginTop: 2, textAlign: 'right' },
  offerBtn:   { paddingHorizontal: 14, paddingVertical: 7, backgroundColor: colors.primary, borderRadius: 8 },
  offerBtnText:{ fontSize: 12, fontWeight: '600', color: '#fff' },
});

function MarketTab({ onNegotiationCreated }) {
  const [items, setItems]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);
  const [offerItem, setOfferItem]   = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try { setItems((await getOTCMarket()) ?? []); }
    catch { setError('Nije moguće učitati tržište.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleOffer(payload) {
    await createNegotiation(payload);
    setOfferItem(null);
    onNegotiationCreated();
  }

  if (loading) return <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>;

  return (
    <>
      <FlatList
        data={items}
        keyExtractor={(item, i) => `${item.ticker}-${i}`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={<View style={s.center}><Text style={s.empty}>{error || 'Nema dostupnih akcija na tržištu.'}</Text></View>}
        renderItem={({ item }) => <MarketRow item={item} onOffer={setOfferItem} />}
      />
      {offerItem && (
        <OfferModal
          item={offerItem}
          onClose={() => setOfferItem(null)}
          onSubmit={handleOffer}
        />
      )}
    </>
  );
}

// ─── CONTRACTS tab ───────────────────────────────────────────────────────────

const CONTRACT_TABS = [
  { key: 'ACTIVE',  label: 'Aktivni' },
  { key: 'EXPIRED', label: 'Istorija' },
];

function ExerciseModal({ contract, onClose, onConfirm }) {
  const [accounts, setAccounts]         = useState([]);
  const [selected, setSelected]         = useState(null);
  const [loadingAccs, setLoadingAccs]   = useState(true);
  const [submitting, setSubmitting]     = useState(false);
  const total = (contract.strikePrice ?? 0) * (contract.amount ?? 0);

  useFocusEffect(useCallback(() => {
    getMyAccounts()
      .then(a => { setAccounts(a ?? []); setSelected(a?.[0] ?? null); })
      .catch(() => {})
      .finally(() => setLoadingAccs(false));
  }, []));

  async function handleConfirm() {
    if (!selected) { Alert.alert('Greška', 'Izaberite račun.'); return; }
    setSubmitting(true);
    try { await onConfirm(contract.id, selected.accountId); onClose(); }
    catch (e) {
      const msg = e?.response?.data?.error ?? e?.response?.data?.message ?? 'Nije moguće izvršiti ugovor.';
      Alert.alert('Greška', msg);
    }
    finally { setSubmitting(false); }
  }

  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={modalStyles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1}>
          <View style={modalStyles.sheet}>
            <Text style={modalStyles.title}>Izvršavanje ugovora</Text>

            <View style={exStyles.infoRow}><Text style={exStyles.infoLabel}>Ticker</Text><Text style={exStyles.infoValue}>{contract.ticker}</Text></View>
            <View style={exStyles.infoRow}><Text style={exStyles.infoLabel}>Količina</Text><Text style={exStyles.infoValue}>{contract.amount}</Text></View>
            <View style={exStyles.infoRow}><Text style={exStyles.infoLabel}>Strike cena</Text><Text style={exStyles.infoValue}>{fmt(contract.strikePrice)} {contract.currency}</Text></View>
            <View style={exStyles.infoRow}><Text style={exStyles.infoLabel}>Premija</Text><Text style={exStyles.infoValue}>{fmt(contract.premium ?? 0)} {contract.currency}</Text></View>
            <View style={[exStyles.infoRow, exStyles.infoRowTotal]}>
              <Text style={exStyles.infoLabelBold}>Ukupno</Text>
              <Text style={exStyles.infoValueBold}>{fmt(total)} {contract.currency}</Text>
            </View>

            <Text style={[modalStyles.label, { marginTop: 14 }]}>Račun za plaćanje</Text>
            {loadingAccs ? (
              <ActivityIndicator size="small" color={colors.primary} style={{ marginVertical: 8 }} />
            ) : (
              accounts.map(acc => (
                <TouchableOpacity
                  key={acc.accountId}
                  style={[exStyles.accRow, selected?.accountId === acc.accountId && exStyles.accRowSelected]}
                  onPress={() => setSelected(acc)}
                >
                  <Text style={exStyles.accNum}>{acc.accountNumber}</Text>
                  <Text style={exStyles.accBal}>{fmt(acc.availableBalance)} {acc.currency}</Text>
                </TouchableOpacity>
              ))
            )}

            <View style={modalStyles.btnRow}>
              <TouchableOpacity style={modalStyles.cancelBtn} onPress={onClose}>
                <Text style={modalStyles.cancelText}>Odustani</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[modalStyles.submitBtn, submitting && { opacity: 0.5 }]}
                onPress={handleConfirm} disabled={submitting}
              >
                <Text style={modalStyles.submitText}>{submitting ? 'Slanje...' : 'Potvrdi'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const exStyles = StyleSheet.create({
  infoRow:       { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6,
                   borderBottomWidth: 1, borderBottomColor: colors.border },
  infoRowTotal:  { borderBottomWidth: 0, marginTop: 4 },
  infoLabel:     { fontSize: 13, color: colors.textSecondary },
  infoValue:     { fontSize: 13, color: colors.textPrimary, fontWeight: '500' },
  infoLabelBold: { fontSize: 13, fontWeight: '600', color: colors.textPrimary },
  infoValueBold: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  accRow:        { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                   padding: 10, borderRadius: 8, borderWidth: 1, borderColor: colors.border,
                   marginTop: 8, backgroundColor: colors.bgPage },
  accRowSelected:{ borderColor: colors.primary, backgroundColor: colors.primary + '10' },
  accNum:        { fontSize: 12, color: colors.textPrimary, fontWeight: '500' },
  accBal:        { fontSize: 12, color: colors.textSecondary },
});

function ContractRow({ contract, userId, onExercise }) {
  const profitColor = contract.profit == null
    ? colors.textMuted
    : contract.profit >= 0 ? colors.success : colors.error;
  const isBuyer = contract.buyerType === 'CLIENT' && String(contract.buyerId) === String(userId);

  return (
    <View style={ctStyles.row}>
      <View style={ctStyles.col1}>
        <Text style={ctStyles.ticker}>{contract.ticker}</Text>
        <Text style={ctStyles.meta}>{contract.sellerName ?? '—'}</Text>
      </View>
      <View style={ctStyles.col2}>
        <Text style={ctStyles.strike}>{fmt(contract.strikePrice)} {contract.currency}</Text>
        <Text style={ctStyles.meta}>{fmt(contract.amount, 0)} kom · {fmtDate(contract.settlementDate)}</Text>
      </View>
      <View style={ctStyles.col3}>
        {contract.profit != null && (
          <Text style={[ctStyles.profit, { color: profitColor }]}>
            {contract.profit >= 0 ? '+' : ''}{fmt(contract.profit)}
          </Text>
        )}
        {contract.status === 'ACTIVE' && isBuyer && (
          <TouchableOpacity style={ctStyles.exerciseBtn} onPress={() => onExercise(contract)}>
            <Text style={ctStyles.exerciseBtnText}>Izvrši</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const ctStyles = StyleSheet.create({
  row:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14,
                 borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSurface },
  col1:        { flex: 1 },
  col2:        { flex: 1, alignItems: 'flex-end', marginRight: 12 },
  col3:        { width: 64, alignItems: 'flex-end' },
  ticker:      { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  meta:        { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  strike:      { fontSize: 13, fontWeight: '600', color: colors.textPrimary, textAlign: 'right' },
  profit:      { fontSize: 12, fontWeight: '600', textAlign: 'right', marginBottom: 6 },
  exerciseBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.primary, borderRadius: 6 },
  exerciseBtnText: { fontSize: 11, fontWeight: '600', color: '#fff' },
});

function ContractsTab({ userId }) {
  const [activeTab,    setActiveTab]    = useState(CONTRACT_TABS[0]);
  const [contracts,    setContracts]    = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [error,        setError]        = useState(null);
  const [exerciseItem, setExerciseItem] = useState(null);

  const load = useCallback(async (tab, refresh = false) => {
    if (refresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      if (tab.key === 'ACTIVE') {
        setContracts((await getMyContracts('ACTIVE')) ?? []);
      } else {
        const [expired, exercised] = await Promise.all([
          getMyContracts('EXPIRED').then(d => d ?? []),
          getMyContracts('EXERCISED').then(d => d ?? []),
        ]);
        setContracts([...expired, ...exercised]);
      }
    } catch {
      setError('Nije moguće učitati ugovore.');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(activeTab); }, [load, activeTab]));

  async function handleExercise(id, accountId) {
    await exerciseContract(id, accountId);
    await load(activeTab);
  }

  return (
    <View style={{ flex: 1 }}>
      {/* subtabs */}
      <View style={ctTabStyles.bar}>
        {CONTRACT_TABS.map(tab => (
          <TouchableOpacity
            key={tab.key}
            style={[ctTabStyles.tab, activeTab.key === tab.key && ctTabStyles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[ctTabStyles.tabText, activeTab.key === tab.key && ctTabStyles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color={colors.primary} /></View>
      ) : (
        <FlatList
          data={contracts}
          keyExtractor={(c, i) => String(c.id ?? i)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(activeTab, true)} colors={[colors.primary]} tintColor={colors.primary} />}
          ListEmptyComponent={<View style={s.center}><Text style={s.empty}>{error || 'Nema ugovora.'}</Text></View>}
          renderItem={({ item }) => (
            <ContractRow
              contract={item}
              userId={userId}
              onExercise={setExerciseItem}
            />
          )}
        />
      )}

      {exerciseItem && (
        <ExerciseModal
          contract={exerciseItem}
          onClose={() => setExerciseItem(null)}
          onConfirm={handleExercise}
        />
      )}
    </View>
  );
}

const ctTabStyles = StyleSheet.create({
  bar:          { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.bgSurface },
  tab:          { flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive:    { borderBottomColor: colors.primary },
  tabText:      { fontSize: 12, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  tabTextActive:{ color: colors.primary },
});

// ─── modal shared styles ─────────────────────────────────────────────────────

const modalStyles = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: colors.bgSurface, borderTopLeftRadius: 16, borderTopRightRadius: 16,
                 padding: 24, paddingBottom: 36 },
  title:       { fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 },
  subtitle:    { fontSize: 13, color: colors.textMuted, marginBottom: 16 },
  label:       { fontSize: 12, color: colors.textSecondary, marginBottom: 4, marginTop: 12, letterSpacing: 0.5 },
  input:       { borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingHorizontal: 12,
                 paddingVertical: 10, fontSize: 14, color: colors.textPrimary, backgroundColor: colors.bgPage },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 20 },
  cancelBtn:   { flex: 1, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, alignItems: 'center' },
  cancelText:  { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  submitBtn:   { flex: 1, paddingVertical: 12, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  submitText:  { fontSize: 14, color: '#fff', fontWeight: '600' },
});

// ─── shared styles ───────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  empty:  { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
});

// ─── HUB ─────────────────────────────────────────────────────────────────────

export default function OTCHubScreen({ navigation }) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('negotiations');
  const [negKey, setNegKey] = useState(0);

  function switchToNegotiations() {
    setActiveTab('negotiations');
    setNegKey(k => k + 1);
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bgPage }}>
      <TopTabBar active={activeTab} onChange={setActiveTab} />

      {activeTab === 'negotiations' && (
        <NegotiationsTab
          key={negKey}
          userId={user?.id}
          onOpen={id => navigation.navigate('OTCNegotiationDetail', { negotiationId: id })}
        />
      )}
      {activeTab === 'market' && (
        <MarketTab onNegotiationCreated={switchToNegotiations} />
      )}
      {activeTab === 'contracts' && (
        <ContractsTab userId={user?.id} />
      )}
    </View>
  );
}
