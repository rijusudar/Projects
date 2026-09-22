import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SensingProvider } from './src/sensing/SensingProvider';
import { NavProvider } from './src/navigation';
import { RootNavigator } from './src/navigation/RootNavigator';
import { colors } from './src/theme/theme';

export default function App(): React.JSX.Element {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
      <SensingProvider>
        <NavProvider>
          <RootNavigator />
        </NavProvider>
      </SensingProvider>
    </SafeAreaProvider>
  );
}
