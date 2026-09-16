import React from 'react';
import { View } from 'react-native';

export const enableScreens = (): boolean => false;
export const screensEnabled = (): boolean => false;
export const Screen = View;
export const ScreenContainer = View;
export const NativeScreen = View;
export const NativeScreenContainer = View;
export const ScreenStack = View;

export default {
  enableScreens,
  screensEnabled,
  Screen,
  ScreenContainer,
  NativeScreen,
  NativeScreenContainer,
  ScreenStack,
};
