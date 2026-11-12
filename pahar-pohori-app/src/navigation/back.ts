import type { NavigationProp, ParamListBase } from '@react-navigation/native';

/**
 * Back that always does something.
 * On web deep-links (/hill/3, /settings, …) the stack often has no history,
 * so plain goBack() is a no-op — fall back to the main tabs.
 */
export function goBackSmart(nav: NavigationProp<ParamListBase>, fallback: 'Map' | 'More' = 'Map') {
  if (nav.canGoBack()) {
    nav.goBack();
    return;
  }
  // @ts-expect-error nested tab route
  nav.navigate('Tabs', { screen: fallback });
}
