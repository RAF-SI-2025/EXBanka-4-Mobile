import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme';

const ITEMS = [
  { label: 'Verifikacija',           screen: 'Approvals' },
  { label: 'Krediti',                screen: 'Loans' },
  { label: 'Menjačnica',             screen: 'ExchangeRates' },
  { label: 'Hartije od vrednosti',   screen: 'Securities' },
  { label: 'Moj portfolio',          screen: 'Portfolio' },
  { label: 'Investicioni fondovi',   screen: 'InvestmentFunds' },
  { label: 'Profil',                 screen: 'Profile' },
];

export default function MoreScreen({ navigation }) {
  return (
    <View style={styles.container}>
      {ITEMS.map((item, index) => (
        <TouchableOpacity
          key={item.screen}
          style={[styles.row, index === ITEMS.length - 1 && styles.rowLast]}
          onPress={() => navigation.navigate(item.screen)}
          activeOpacity={0.7}
        >
          <Text style={styles.label}>{item.label}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bgPage, paddingTop: 16 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.bgSurface,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowLast:  { borderBottomWidth: 0 },
  label:    { fontSize: 15, color: colors.textPrimary },
  chevron:  { fontSize: 22, color: colors.textMuted },
});
