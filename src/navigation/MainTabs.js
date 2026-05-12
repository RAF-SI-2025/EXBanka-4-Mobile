import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';

import DashboardScreen from '../screens/dashboard/DashboardScreen';
import AccountsScreen from '../screens/accounts/AccountsScreen';
import AccountDetailScreen from '../screens/accounts/AccountDetailScreen';
import RenameAccountScreen from '../screens/accounts/RenameAccountScreen';
import LimitChangeScreen from '../screens/accounts/LimitChangeScreen';
import PendingApprovalScreen from '../screens/auth/PendingApprovalScreen';
import PaymentsScreen from '../screens/payments/PaymentsScreen';
import PaymentDetailScreen from '../screens/payments/PaymentDetailScreen';
import NewPaymentScreen from '../screens/payments/NewPaymentScreen';
import AddRecipientScreen from '../screens/payments/AddRecipientScreen';
import NewTransferScreen from '../screens/payments/NewTransferScreen';
import TransfersScreen from '../screens/payments/TransfersScreen';
import TransferDetailScreen from '../screens/payments/TransferDetailScreen';
import RecipientsScreen from '../screens/recipients/RecipientsScreen';
import EditRecipientScreen from '../screens/recipients/EditRecipientScreen';
import CardsScreen from '../screens/cards/CardsScreen';
import CardDetailScreen from '../screens/cards/CardDetailScreen';
import CardRequestScreen from '../screens/cards/CardRequestScreen';
import MoreScreen from '../screens/more/MoreScreen';
import ApprovalsScreen from '../screens/approvals/ApprovalsScreen';
import ApprovalDetailScreen from '../screens/approvals/ApprovalDetailScreen';
import LoansScreen from '../screens/loans/LoansScreen';
import LoanDetailScreen from '../screens/loans/LoanDetailScreen';
import LoanApplicationScreen from '../screens/loans/LoanApplicationScreen';
import ExchangeRatesScreen from '../screens/exchange/ExchangeRatesScreen';
import ExchangeCalculatorScreen from '../screens/exchange/ExchangeCalculatorScreen';
import ExchangeHistoryScreen from '../screens/exchange/ExchangeHistoryScreen';
import ExchangeConvertScreen from '../screens/exchange/ExchangeConvertScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';
import SecuritiesScreen from '../screens/securities/SecuritiesScreen';
import SecurityDetailScreen from '../screens/securities/SecurityDetailScreen';
import OrderFormScreen from '../screens/securities/OrderFormScreen';
import OrderResultScreen from '../screens/securities/OrderResultScreen';
import PortfolioScreen from '../screens/portfolio/PortfolioScreen';
import OTCHubScreen from '../screens/otc/OTCHubScreen';
import OTCNegotiationDetailScreen from '../screens/otc/OTCNegotiationDetailScreen';
import InvestmentFundsScreen from '../screens/funds/InvestmentFundsScreen';
import FundDetailScreen from '../screens/funds/FundDetailScreen';
import MyFundPositionsScreen from '../screens/funds/MyFundPositionsScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function DashboardStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Početna' }} />
    </Stack.Navigator>
  );
}

function AccountsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Accounts"        component={AccountsScreen}       options={{ title: 'Računi' }} />
      <Stack.Screen name="AccountDetail"   component={AccountDetailScreen}  options={{ title: 'Detalji računa' }} />
      <Stack.Screen name="RenameAccount"   component={RenameAccountScreen}  options={{ title: 'Promena naziva' }} />
      <Stack.Screen name="LimitChange"     component={LimitChangeScreen}    options={{ title: 'Promena limita' }} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}

function PaymentsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Payments"        component={PaymentsScreen}       options={{ title: 'Plaćanja' }} />
      <Stack.Screen name="PaymentDetail"   component={PaymentDetailScreen}  options={{ title: 'Detalji plaćanja' }} />
      <Stack.Screen name="NewPayment"      component={NewPaymentScreen}     options={{ title: 'Novo plaćanje' }} />
      <Stack.Screen name="AddRecipient"    component={AddRecipientScreen}   options={{ title: 'Dodaj primaoca' }} />
      <Stack.Screen name="NewTransfer"     component={NewTransferScreen}    options={{ title: 'Novi transfer' }} />
      <Stack.Screen name="Transfers"       component={TransfersScreen}      options={{ title: 'Transferi' }} />
      <Stack.Screen name="TransferDetail"  component={TransferDetailScreen} options={{ title: 'Detalji transfera' }} />
      <Stack.Screen name="PendingApproval" component={PendingApprovalScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Recipients"      component={RecipientsScreen}     options={{ title: 'Primaoci plaćanja' }} />
      <Stack.Screen name="EditRecipient"   component={EditRecipientScreen}  options={{ title: 'Izmeni primaoca' }} />
    </Stack.Navigator>
  );
}

function CardsStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Cards"       component={CardsScreen}       options={{ title: 'Kartice' }} />
      <Stack.Screen name="CardDetail"  component={CardDetailScreen}  options={{ title: 'Detalji kartice' }} />
      <Stack.Screen name="CardRequest" component={CardRequestScreen} options={{ title: 'Zahtev za karticu' }} />
    </Stack.Navigator>
  );
}

function OTCStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="OTCHub"               component={OTCHubScreen}               options={{ title: 'OTC Trading' }} />
      <Stack.Screen name="OTCNegotiationDetail" component={OTCNegotiationDetailScreen} options={{ title: 'Detalji pregovora' }} />
    </Stack.Navigator>
  );
}

function MoreStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="More"               component={MoreScreen}              options={{ title: 'Više' }} />
      <Stack.Screen name="Approvals"          component={ApprovalsScreen}         options={{ title: 'Verifikacija' }} />
      <Stack.Screen name="ApprovalDetail"     component={ApprovalDetailScreen}    options={{ title: 'Detalji zahteva' }} />
      <Stack.Screen name="Loans"              component={LoansScreen}             options={{ title: 'Krediti' }} />
      <Stack.Screen name="LoanDetail"         component={LoanDetailScreen}        options={{ title: 'Detalji kredita' }} />
      <Stack.Screen name="LoanApplication"    component={LoanApplicationScreen}   options={{ title: 'Zahtev za kredit' }} />
      <Stack.Screen name="ExchangeRates"      component={ExchangeRatesScreen}      options={{ title: 'Menjačnica' }} />
      <Stack.Screen name="ExchangeCalculator" component={ExchangeCalculatorScreen} options={{ title: 'Kalkulator' }} />
      <Stack.Screen name="ExchangeHistory"    component={ExchangeHistoryScreen}    options={{ title: 'Istorija konverzija' }} />
      <Stack.Screen name="ExchangeConvert"    component={ExchangeConvertScreen}    options={{ title: 'Konverzija valuta' }} />
      <Stack.Screen name="Profile"            component={ProfileScreen}           options={{ title: 'Profil' }} />
      <Stack.Screen name="Securities"         component={SecuritiesScreen}        options={{ title: 'Hartije od vrednosti' }} />
      <Stack.Screen name="SecurityDetail"     component={SecurityDetailScreen}    options={({ route }) => ({ title: route.params?.ticker ?? 'Detalji' })} />
      <Stack.Screen name="OrderForm"          component={OrderFormScreen}         options={{ title: 'Novi nalog' }} />
      <Stack.Screen name="OrderResult"        component={OrderResultScreen}       options={{ title: 'Nalog poslat', headerBackVisible: false }} />
      <Stack.Screen name="Portfolio"          component={PortfolioScreen}         options={{ title: 'Moj portfolio' }} />
      <Stack.Screen name="InvestmentFunds"    component={InvestmentFundsScreen}   options={{ title: 'Investicioni fondovi' }} />
      <Stack.Screen name="FundDetail"         component={FundDetailScreen}        options={{ title: 'Detalji fonda' }} />
      <Stack.Screen name="MyFundPositions"    component={MyFundPositionsScreen}   options={{ title: 'Moje investicije' }} />
    </Stack.Navigator>
  );
}

export default function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.textMuted,
      tabBarStyle: { borderTopColor: colors.border },
    }}>
      <Tab.Screen name="DashboardTab" component={DashboardStack} options={{ title: 'Početna' }} />
      <Tab.Screen name="AccountsTab"  component={AccountsStack}  options={{ title: 'Računi' }} />
      <Tab.Screen name="PaymentsTab"  component={PaymentsStack}  options={{ title: 'Plaćanja' }} />
      <Tab.Screen name="CardsTab"     component={CardsStack}     options={{ title: 'Kartice' }} />
      <Tab.Screen name="OTCTab"       component={OTCStack}       options={{ title: 'OTC' }} />
      <Tab.Screen name="MoreTab"      component={MoreStack}      options={{ title: 'Više' }} />
    </Tab.Navigator>
  );
}
