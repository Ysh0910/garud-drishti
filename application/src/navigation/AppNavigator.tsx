/**
 * Main Application Navigation Stack
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import { RootStackParamList } from '../types/navigation';
import { HomeScreen } from '../screens/HomeScreen';
import { ReportHazardScreen } from '../screens/ReportHazardScreen';
import { ReportConfirmationScreen } from '../screens/ReportConfirmationScreen';
import { MyReportsScreen } from '../screens/MyReportsScreen';
import { RiskDetailScreen } from '../screens/RiskDetailScreen';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#F4F6F9' },
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="ReportHazard" component={ReportHazardScreen} />
      <Stack.Screen name="ReportConfirmation" component={ReportConfirmationScreen} />
      <Stack.Screen name="MyReports" component={MyReportsScreen} />
      <Stack.Screen name="RiskDetail" component={RiskDetailScreen} />
    </Stack.Navigator>
  );
};

AppNavigator.displayName = 'AppNavigator';
