import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { makeStyles, useTheme } from '../theme';
import { ScrubArea } from './ScrubArea';

interface Props {
  values: number[];
  times: string[];
  color: string;
  threshold?: number;
  thresholdLabel?: string;
  unit: string;
  decimals?: number;
  height?: number;
  locale?: string;
}

const PAD_T = 14;
const PAD_B = 22;

/** Lightweight SVG line chart with touch/mouse scrubbing. */
export default function LineChart({
  values, times, color, threshold, thresholdLabel, unit, decimals = 2, height = 170, locale = 'en-GB',
}: Props) {
  const [w, setW] = useState(0);
  const colors = useTheme();
  const styles = useStyles();
  const [idx, setIdx] = useState<number | null>(null);

  const geo = useMemo(() => {
    if (!values.length || !w) return null;
    let lo = Math.min(...values);
    let hi = Math.max(...values);
    if (threshold != null) { lo = Math.min(lo, threshold); hi = Math.max(hi, threshold); }
    const span = hi - lo || 1;
    lo -= span * 0.08; hi += span * 0.08;
    const h = height - PAD_T - PAD_B;
    const x = (i: number) => (i / Math.max(values.length - 1, 1)) * w;
    const y = (v: number) => PAD_T + (1 - (v - lo) / (hi - lo)) * h;
    let d = '';
    values.forEach((v, i) => { d += `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`; });
    const area = `${d}L${w},${height - PAD_B}L0,${height - PAD_B}Z`;
    const ticks: { x: number; label: string }[] = [];
    let lastDay = '';
    times.forEach((t, i) => {
      const dt = new Date(t);
      const day = dt.toDateString();
      if (day !== lastDay) {
        if (lastDay) ticks.push({ x: x(i), label: dt.toLocaleDateString(locale, { weekday: 'short' }) });
        lastDay = day;
      }
    });
    return { x, y, d, area, ticks, lo, hi };
  }, [values, times, w, height, threshold, locale]);

  const i = idx ?? values.length - 1;
  const cur = values[i];
  const curTime = times[i] ? new Date(times[i]) : null;
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const scrub = (lx: number) => {
    if (!w || !values.length) return;
    const k = Math.round((Math.min(Math.max(lx, 0), w) / w) * (values.length - 1));
    setIdx(k);
  };

  return (
    <View>
      <View style={styles.head}>
        <Text style={[styles.value, { color }]}>
          {cur != null ? cur.toFixed(decimals) : '—'}
          <Text style={styles.unit}> {unit}</Text>
        </Text>
        <Text style={styles.time}>
          {curTime ? curTime.toLocaleString(locale, { weekday: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
          {idx != null ? ' · drag' : ''}
        </Text>
      </View>
      <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
        <ScrubArea
          height={height}
          onScrub={scrub}
          onEnd={() => setTimeout(() => setIdx(null), 1800)}
        >
          {geo && (
            <Svg width={w} height={height} pointerEvents="none">
              <Defs>
                <LinearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={color} stopOpacity={0.28} />
                  <Stop offset="1" stopColor={color} stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Line x1={0} x2={w} y1={height - PAD_B} y2={height - PAD_B} stroke={colors.line} strokeWidth={1} />
              {geo.ticks.map((t) => (
                <React.Fragment key={t.x}>
                  <Line x1={t.x} x2={t.x} y1={PAD_T} y2={height - PAD_B} stroke={colors.line} strokeWidth={1} strokeDasharray="2,4" />
                  <SvgText x={t.x + 3} y={height - 6} fontSize={10} fill={colors.muted}>{t.label}</SvgText>
                </React.Fragment>
              ))}
              {threshold != null && (
                <>
                  <Line x1={0} x2={w} y1={geo.y(threshold)} y2={geo.y(threshold)} stroke={colors.danger} strokeWidth={1.2} strokeDasharray="5,4" />
                  <SvgText x={w - 4} y={geo.y(threshold) - 5} fontSize={10} fill={colors.danger} textAnchor="end">
                    {thresholdLabel ?? ''} {threshold}
                  </SvgText>
                </>
              )}
              <Path d={geo.area} fill="url(#g)" />
              <Path d={geo.d} stroke={color} strokeWidth={2} fill="none" strokeLinejoin="round" />
              {cur != null && (
                <>
                  {idx != null && <Line x1={geo.x(i)} x2={geo.x(i)} y1={PAD_T} y2={height - PAD_B} stroke={colors.ink} strokeWidth={1} opacity={0.3} />}
                  <Circle cx={geo.x(i)} cy={geo.y(cur)} r={5} fill="#fff" stroke={color} strokeWidth={2.5} />
                </>
              )}
            </Svg>
          )}
        </ScrubArea>
      </View>
      <View style={styles.foot}>
        <Text style={styles.footText}>Min {min.toFixed(decimals)}</Text>
        <Text style={styles.footText}>Max {max.toFixed(decimals)}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 6 },
  value: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  unit: { fontSize: 13, fontWeight: '500', color: colors.muted },
  time: { fontSize: 12, color: colors.muted },
  foot: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  footText: { fontSize: 11, color: colors.muted },
}));
