import React, { createContext, useContext } from 'react';
import { View, ViewProps } from 'react-native';

export interface EdgeInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface Metrics {
  insets: EdgeInsets;
  frame: { x: number; y: number; width: number; height: number };
}

export const initialWindowMetrics: Metrics = {
  insets: { top: 0, right: 0, bottom: 0, left: 0 },
  frame: { x: 0, y: 0, width: 0, height: 0 },
};

export const SafeAreaInsetsContext = createContext<EdgeInsets>(initialWindowMetrics.insets);
export const SafeAreaFrameContext = createContext<Metrics['frame']>(initialWindowMetrics.frame);

export function SafeAreaProvider({ children, style, ...rest }: ViewProps & { children?: React.ReactNode }): React.JSX.Element {
  return (
    <SafeAreaFrameContext.Provider value={initialWindowMetrics.frame}>
      <SafeAreaInsetsContext.Provider value={initialWindowMetrics.insets}>
        <View style={[{ flex: 1, width: '100%', height: '100%' }, style]} {...rest}>
          {children}
        </View>
      </SafeAreaInsetsContext.Provider>
    </SafeAreaFrameContext.Provider>
  );
}

export function SafeAreaView({ children, style, ...rest }: ViewProps & { children?: React.ReactNode }): React.JSX.Element {
  return (
    <View style={[{ flex: 1 }, style]} {...rest}>
      {children}
    </View>
  );
}

export function useSafeAreaInsets(): EdgeInsets {
  return useContext(SafeAreaInsetsContext) || initialWindowMetrics.insets;
}

export function useSafeAreaFrame(): { x: number; y: number; width: number; height: number } {
  return useContext(SafeAreaFrameContext) || initialWindowMetrics.frame;
}

export function withSafeAreaInsets<T extends React.ComponentType<any>>(WrappedComponent: T): T {
  return ((props: any) => {
    const insets = useSafeAreaInsets();
    return <WrappedComponent insets={insets} {...props} />;
  }) as unknown as T;
}

export default {
  SafeAreaProvider,
  SafeAreaView,
  useSafeAreaInsets,
  useSafeAreaFrame,
  initialWindowMetrics,
  SafeAreaInsetsContext,
  SafeAreaFrameContext,
  withSafeAreaInsets,
};

