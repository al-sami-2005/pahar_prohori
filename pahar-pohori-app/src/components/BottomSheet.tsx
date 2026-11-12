import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, View } from 'react-native';
import { shadow, useTheme } from '../theme';

export type Snap = 0 | 1 | 2; // peek · half · full

/**
 * Draggable bottom sheet (Google-Maps style): drag the handle, tap it to cycle,
 * snaps to peek / half / full. `height` is an Animated.Value owned by the parent so
 * floating buttons can ride on top of the sheet.
 */
export function BottomSheet({ snap, onSnap, heights, height, bottom, children, header, contentKey }: {
  snap: Snap; onSnap: (s: Snap) => void; heights: [number, number, number];
  height: Animated.Value; bottom: number; children: React.ReactNode; header?: React.ReactNode; contentKey?: string;
}) {
  const c = useTheme();
  const start = useRef(0);
  const cur = useRef(heights[snap]);

  useEffect(() => {
    cur.current = heights[snap];
    Animated.spring(height, { toValue: heights[snap], useNativeDriver: false, bounciness: 4, speed: 14 }).start();
  }, [snap, heights[0], heights[1], heights[2]]); // eslint-disable-line react-hooks/exhaustive-deps

  const pan = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 4,
    onPanResponderGrant: () => { start.current = cur.current; },
    onPanResponderMove: (_, g) => {
      const v = Math.max(heights[0] - 40, Math.min(heights[2], start.current - g.dy));
      height.setValue(v);
    },
    onPanResponderRelease: (_, g) => {
      const v = start.current - g.dy - g.vy * 120;
      let best: Snap = 0;
      heights.forEach((h, i) => { if (Math.abs(h - v) < Math.abs(heights[best] - v)) best = i as Snap; });
      onSnap(best);
      cur.current = heights[best];
      Animated.spring(height, { toValue: heights[best], useNativeDriver: false, bounciness: 4, speed: 14 }).start();
    },
  }), [heights, height, onSnap]);

  return (
    <Animated.View style={[{
      position: 'absolute', left: 0, right: 0, bottom, height,
      backgroundColor: c.surface, borderTopLeftRadius: 26, borderTopRightRadius: 26, overflow: 'hidden',
      borderWidth: c.dark ? 1 : 0, borderColor: c.line,
    }, shadow]}>
      <View {...pan.panHandlers}>
        <Pressable onPress={() => onSnap(((snap + 1) % 3) as Snap)} accessibilityRole="adjustable" accessibilityLabel="Resize panel"
          style={{ alignItems: 'center', paddingTop: 10, paddingBottom: 6 }}>
          <View style={{ width: 40, height: 5, borderRadius: 3, backgroundColor: c.line }} />
        </Pressable>
        {header}
      </View>
      <ScrollView key={contentKey} contentContainerStyle={{ paddingBottom: 24 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </Animated.View>
  );
}
