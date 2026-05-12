import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { listFunds } from '../../services/fundService';
import { card, colors } from '../../theme';

function fmt(v, decimals = 2) {
  return Number(v).toLocaleString('sr-RS', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function FundItem({ item, onPress }) {
  const profitColor = (item.profit ?? 0) >= 0 ? colors.success : colors.error;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.cardHeader}>
        <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
        {!item.active && (
          <View style={styles.inactiveBadge}>
            <Text style={styles.inactiveBadgeText}>Neaktivan</Text>
          </View>
        )}
      </View>
      {item.description ? (
        <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
      ) : null}
      <Text style={styles.manager}>Menadžer: {item.managerName ?? '—'}</Text>
      <View style={styles.cardFooter}>
        <View>
          <Text style={styles.footerLabel}>Vrednost fonda</Text>
          <Text style={styles.fundValue}>{fmt(item.fundValue)} RSD</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.footerLabel}>Min. ulog</Text>
          <Text style={styles.minContrib}>{fmt(item.minimumContribution)} RSD</Text>
        </View>
      </View>
      {item.profit !== undefined && (
        <Text style={[styles.profit, { color: profitColor }]}>
          Profit: {item.profit >= 0 ? '+' : ''}{fmt(item.profit)} RSD
        </Text>
      )}
    </TouchableOpacity>
  );
}

export default function InvestmentFundsScreen({ navigation }) {
  const [funds, setFunds]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError]           = useState(null);

  const load = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await listFunds();
      setFunds(data ?? []);
    } catch {
      setError('Nije moguće učitati fondove.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.primary} /></View>;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={funds}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => load(true)}
            colors={[colors.primary]} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{error || 'Nema dostupnih fondova.'}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <FundItem
            item={item}
            onPress={() => navigation.navigate('FundDetail', { fundId: item.id })}
          />
        )}
      />
      <TouchableOpacity
        style={styles.positionsBtn}
        onPress={() => navigation.navigate('MyFundPositions')}
      >
        <Text style={styles.positionsBtnText}>Moje investicije</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container:  { flex: 1, backgroundColor: colors.bgPage },
  center:     { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyText:  { color: colors.textMuted, fontSize: 14, textAlign: 'center' },
  list:       { padding: 16, paddingBottom: 8 },

  card:        { ...card, padding: 16, marginBottom: 12 },
  cardHeader:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  name:        { fontSize: 15, fontWeight: '700', color: colors.textPrimary, flex: 1, marginRight: 8 },
  inactiveBadge:     { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, backgroundColor: colors.error + '20', borderWidth: 1, borderColor: colors.error },
  inactiveBadgeText: { fontSize: 10, color: colors.error, fontWeight: '600' },
  desc:        { fontSize: 12, color: colors.textMuted, marginBottom: 6, lineHeight: 17 },
  manager:     { fontSize: 12, color: colors.textSecondary, marginBottom: 10 },
  cardFooter:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 4 },
  footerLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 2 },
  fundValue:   { fontSize: 16, fontWeight: '700', color: colors.primary },
  minContrib:  { fontSize: 13, color: colors.textSecondary },
  profit:      { fontSize: 13, fontWeight: '600', marginTop: 4 },

  positionsBtn:     { margin: 16, paddingVertical: 14, backgroundColor: colors.primary, borderRadius: 10, alignItems: 'center' },
  positionsBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
});
