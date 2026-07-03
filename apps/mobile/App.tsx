/**
 * App shell: three-tab layout (Recommend / Knowledgebase / Wallet) with a
 * fixed bottom tab bar. Navigation stays dependency-free for v1.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { initI18n } from './src/i18n';
import { refreshSnapshot } from './src/store/kb';
import { RecommendScreen } from './src/screens/Recommend';
import { CardListScreen } from './src/screens/CardList';
import { WalletScreen } from './src/screens/Wallet';
import { color, space } from './src/ui/theme';

initI18n();

type Tab = 'recommend' | 'kb' | 'wallet';
const TAB_ICONS: Record<Tab, string> = { recommend: '✦', kb: '▤', wallet: '▣' };

export default function App(): React.JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('recommend');

  useEffect(() => {
    void refreshSnapshot(); // refresh KB cache when newer (offline-safe)
  }, []);

  const tabs: Array<{ id: Tab; label: string }> = [
    { id: 'recommend', label: t('recommend.title') },
    { id: 'kb', label: t('kb.title') },
    { id: 'wallet', label: t('wallet.title') },
  ];

  return (
    <SafeAreaView style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        {tab === 'recommend' ? <RecommendScreen onGoToWallet={() => setTab('wallet')} /> : null}
        {tab === 'kb' ? <CardListScreen /> : null}
        {tab === 'wallet' ? <WalletScreen /> : null}
      </View>
      <View accessibilityRole="tablist" style={styles.tabBar}>
        {tabs.map(({ id, label }) => (
          <Pressable
            key={id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === id }}
            onPress={() => setTab(id)}
            style={styles.tabItem}
          >
            <Text style={[styles.tabIcon, tab === id && styles.tabActive]}>{TAB_ICONS[id]}</Text>
            <Text numberOfLines={1} style={[styles.tabLabel, tab === id && styles.tabActive]}>
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.bg },
  content: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: color.tabBar,
    borderTopWidth: 1,
    borderTopColor: color.border,
    paddingVertical: space.sm,
    paddingBottom: space.md,
  },
  tabItem: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  tabIcon: { fontSize: 18, color: color.inkMuted },
  tabLabel: { fontSize: 11, color: color.inkMuted },
  tabActive: { color: color.primary, fontWeight: '600' },
});
