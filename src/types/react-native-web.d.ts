import 'react-native';

// React Native Web reports hover and focus to Pressable callbacks on top of `pressed`.
declare module 'react-native' {
  interface PressableStateCallbackType {
    readonly focused?: boolean;
    readonly hovered?: boolean;
  }
}
