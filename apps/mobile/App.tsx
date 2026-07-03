/**
 * App shell: minimal three-tab layout (Recommend / Knowledgebase / Wallet).
 * Navigation stays dependency-free for v1; the KB and Wallet tabs are wired
 * in their own user-story phases.
 */
import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useTranslation } from 'react-i18next';
import { initI18n } from './src/i18n';
import { refreshSnapshot } from './src/store/kb';
import { RecommendScreen } from './src/screens/Recommend';
import { CardListScreen } from './src/screens/CardList';
import { WalletScreen } from './src/screens/Wallet';

initI18n();

type Tab = 'recommend' | 'kb' | 'wallet';

export default function App(): React.JSX.Element {
  const { t } = useTranslation();
  const [tab, setTab] = useState<Tab>('recommend');

  useEffect(() => {
    void refreshSnapshot(); // refresh KB cache when newer (offline-safe)
  }, []);

  return (
    <SafeAreaView>
      <StatusBar style="auto" />
      <View>
        {tab === 'recommend' ? <RecommendScreen onGoToWallet={() => setTab('wallet')} /> : null}
        {tab === 'kb' ? <CardListScreen /> : null}
        {tab === 'wallet' ? <WalletScreen /> : null}
      </View>
      <View accessibilityRole="tablist">
        <Pressable accessibilityRole="tab" onPress={() => setTab('recommend')}>
          <Text>{t('recommend.title')}</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" onPress={() => setTab('kb')}>
          <Text>{t('kb.title')}</Text>
        </Pressable>
        <Pressable accessibilityRole="tab" onPress={() => setTab('wallet')}>
          <Text>{t('wallet.title')}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
