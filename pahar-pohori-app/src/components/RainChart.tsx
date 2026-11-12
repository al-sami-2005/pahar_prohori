import React, { useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../theme';

/** Hourly rain bars: past 24 h (faded) + next 48 h, with a "now" line. Touch to inspect. */
export default function RainChart({ times, rain, nowIndex, height = 130, locale = 'en-GB' }: {
  times: string[]; rain: number[]; nowIndex: number; height?: number; locale?: string;
}) {
  const c = useTheme();
  const [w, setW] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const start = Math.max(0, nowIndex - 24);
  const end = Math.min(rain.length, nowIndex + 48);
  const vals = rain.slice(start, end);
  const max = Math.max(4, ...vals);
  const bw = w / Math.max(vals.length, 1);
  const ch = height - 18;
  const color = (v: number) => (v >= 10 ? c.danger : v >= 4 ? c.watch : c.water);
  const i = sel ?? nowIndex - start;
  const label = times[start + i]
    ? new Date(times[start + i]).toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : '';

  const pick = (x: number) => setSel(Math.max(0, Math.min(vals.length - 1, Math.floor(x / Math.max(bw, 1)))));

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ color: c.ink, fontWeight: '700' }}>{(vals[i] ?? 0).toFixed(1)} <Text style={{ color: c.muted, fontWeight: '500' }}>mm/h</Text></Text>
        <Text style={{ color: c.muted, fontSize: 12 }}>{label}</Text>
      </View>
      <View
        style={{ height }}
        onLayout={(e) => setW(e.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onResponderGrant={(e) => pick(e.nativeEvent.locationX)}
        onResponderMove={(e) => pick(e.nativeEvent.locationX)}
        onResponderRelease={() => setTimeout(() => setSel(null), 1500)}
      >
        {w > 0 && (
          <Svg width={w} height={height}>
            {[0.5, 1].map((f) => (
              <Line key={f} x1={0} x2={w} y1={ch - ch * f} y2={ch - ch * f} stroke={c.line} strokeDasharray="2,4" />
            ))}
            {vals.map((v, k) => {
              const h = (v / max) * (ch - 4);
              return (
                <Rect key={k} x={k * bw + 1} y={ch - h} width={Math.max(bw - 2, 1)} height={Math.max(h, v > 0 ? 1.5 : 0)} rx={1.5}
                  fill={color(v)} opacity={k + start < nowIndex ? 0.35 : k === i ? 1 : 0.85} />
              );
            })}
            <Line x1={(nowIndex - start) * bw} x2={(nowIndex - start) * bw} y1={0} y2={ch} stroke={c.ink} strokeWidth={1.2} />
            <SvgText x={(nowIndex - start) * bw + 4} y={10} fontSize={10} fill={c.ink}>now</SvgText>
            <SvgText x={2} y={height - 3} fontSize={10} fill={c.muted}>-24h</SvgText>
            <SvgText x={w / 2} y={height - 3} fontSize={10} fill={c.muted} textAnchor="middle">+24h</SvgText>
            <SvgText x={w - 2} y={height - 3} fontSize={10} fill={c.muted} textAnchor="end">+48h</SvgText>
            <SvgText x={w - 2} y={10} fontSize={10} fill={c.muted} textAnchor="end">{max.toFixed(0)} mm/h</SvgText>
          </Svg>
        )}
      </View>
    </View>
  );
}
