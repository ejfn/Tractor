/**
 * Type declarations for expo-router
 */
declare module 'expo-router' {
  import { ComponentType, ReactNode } from 'react';
  import { 
    GestureResponderEvent, 
    StyleProp, 
    TextStyle, 
    ViewStyle 
  } from 'react-native';

  export interface StackProps {
    children?: ReactNode;
    screenOptions?: Record<string, any>;
    initialRouteName?: string;
  }

  export interface ScreenProps {
    name?: string;
    options?: Record<string, any>;
    initialParams?: Record<string, any>;
    children?: ReactNode;
  }

  export interface StackComponent extends React.FC<StackProps> {
    Screen: React.FC<ScreenProps>;
  }

  export const Stack: StackComponent;
  
  export interface LinkProps {
    href: string;
    asChild?: boolean;
    children?: ReactNode;
    style?: StyleProp<TextStyle | ViewStyle>;
    onPress?: (e: GestureResponderEvent) => void;
  }

  export const Link: ComponentType<LinkProps>;
  
  export interface RouterOptions {
    push: <T = Record<string, string>>(href: string, options?: any) => void;
    replace: <T = Record<string, string>>(href: string, options?: any) => void;
    back: () => void;
    setParams: (params?: Record<string, string>) => void;
  }
  
  export function useRouter(): RouterOptions;
  
  export function useSegments<T extends string = string>(): string[];
  
  export function useLocalSearchParams<T = Record<string, string | string[]>>(): T;
  
  export function useGlobalSearchParams<T = Record<string, string | string[]>>(): T;
}