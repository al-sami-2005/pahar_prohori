import React, { useRef } from 'react';
import { Platform, View, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Drag/tap scrubber that works on native AND web.
 * RN responder alone often ignores mouse-drag on Expo web — hence the mouse handlers.
 */
export function ScrubArea({
  onScrub, onEnd, style, children, height,
}: {
  onScrub: (x: number) => void;
  onEnd?: () => void;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
  height?: number;
}) {
  const dragging = useRef(false);
  const fromEvent = (e: { nativeEvent: { locationX?: number; offsetX?: number } }) => {
    const x = e.nativeEvent.locationX ?? e.nativeEvent.offsetX ?? 0;
    onScrub(x);
  };

  return (
    <View
      style={[{ height }, style]}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={(e) => { dragging.current = true; fromEvent(e); }}
      onResponderMove={(e) => { if (dragging.current) fromEvent(e); }}
      onResponderRelease={() => { dragging.current = false; onEnd?.(); }}
      onResponderTerminate={() => { dragging.current = false; onEnd?.(); }}
      {...(Platform.OS === 'web' ? {
        // web mouse / pointer — Expo web does not always map these through responders
        onMouseDown: (e: any) => { dragging.current = true; fromEvent(e); },
        onMouseMove: (e: any) => { if (dragging.current || e.buttons === 1) fromEvent(e); },
        onMouseUp: () => { dragging.current = false; onEnd?.(); },
        onMouseLeave: () => { if (dragging.current) { dragging.current = false; onEnd?.(); } },
        onClick: (e: any) => fromEvent(e),
      } as object : {})}
    >
      {children}
    </View>
  );
}
