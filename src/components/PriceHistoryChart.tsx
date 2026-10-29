import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import type { AppLanguage } from '../lib/copy';
import { formatPriceValue, getLocale } from '../lib/format';
import { formatDay, HistoryRange } from '../lib/history';
import type { DailyPrices } from '../types/station';
import { colors, fonts, radius, shadows, type } from '../theme';

export type ChartLine = {
  color: string;
  key: string;
  label: string;
  /** Steps for a station: its price holds until the next change. Averages are drawn as lines. */
  step?: boolean;
  values: DailyPrices;
};

type PriceHistoryChartProps = {
  /** What the chart shows, in one sentence, for screen readers. */
  accessibilityLabel: string;
  /** Previous data kept on screen while the next one loads. */
  dimmed?: boolean;
  language: AppLanguage;
  /** The series that matters first: it is drawn on top and keeps its end label. */
  lines: ChartLine[];
  range: HistoryRange;
  /** Day of the first value. */
  start: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const PLOT_TOP = 10;
const PLOT_HEIGHT = 168;
const AXIS_HEIGHT = 26;
const Y_LABEL_WIDTH = 32;
const PLOT_LEFT = Y_LABEL_WIDTH + 8;
const END_LABEL_WIDTH = 46;
const MIN_TICK_GAP = 40;
const MIN_END_LABEL_GAP = 18;
const TOOLTIP_OFFSET = 12;
// Gridline steps in euros: the first one that gives at most four intervals wins.
const PRICE_STEPS = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.25, 0.5, 1];

/**
 * Daily prices over a period: the focus series in blue, its points of comparison after it.
 * Pointer, touch and arrow keys move a crosshair that reads every series.
 */
export function PriceHistoryChart({ accessibilityLabel, dimmed = false, language, lines, range, start }: PriceHistoryChartProps) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const [tooltipWidth, setTooltipWidth] = useState(176);
  const containerRef = useRef<View>(null);
  const count = lines[0]?.values.length ?? 0;
  const plotWidth = Math.max(0, width - PLOT_LEFT - END_LABEL_WIDTH);
  const geometry = useRef({ count, plotWidth });

  geometry.current = { count, plotWidth };

  const scale = useMemo(() => buildScale(lines.map((line) => line.values)), [lines]);

  // Pointer (mouse, touch, pen) and keyboard, wired on the DOM node: react-native-web forwards
  // no pointer events, and the crosshair must follow touch drags across the chart.
  useEffect(() => {
    const node = containerRef.current as unknown as HTMLElement | null;

    if (!node || typeof node.addEventListener !== 'function') {
      return;
    }

    const indexAt = (clientX: number) => {
      const { count: days, plotWidth: plot } = geometry.current;
      const x = clientX - node.getBoundingClientRect().left - PLOT_LEFT;

      return days > 1 ? clamp(Math.round((x / plot) * (days - 1)), 0, days - 1) : 0;
    };
    const onPointer = (event: PointerEvent) => setActive(indexAt(event.clientX));
    // A mouse leaving hides the readout; a finger lifting leaves it, so it can be read.
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType === 'mouse') {
        setActive(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      const last = geometry.current.count - 1;
      const stepBy = event.shiftKey ? 7 : 1;
      const moves: Record<string, (index: number) => number> = {
        ArrowLeft: (index) => index - stepBy,
        ArrowRight: (index) => index + stepBy,
        End: () => last,
        Home: () => 0,
      };
      const move = moves[event.key];

      if (move) {
        event.preventDefault();
        setActive((index) => clamp(move(index ?? last), 0, last));
      }
    };
    const onFocus = () => setActive((index) => index ?? geometry.current.count - 1);
    const onBlur = () => setActive(null);

    node.addEventListener('pointerdown', onPointer);
    node.addEventListener('pointermove', onPointer);
    node.addEventListener('pointerleave', onLeave);
    node.addEventListener('keydown', onKeyDown);
    node.addEventListener('focus', onFocus);
    node.addEventListener('blur', onBlur);

    return () => {
      node.removeEventListener('pointerdown', onPointer);
      node.removeEventListener('pointermove', onPointer);
      node.removeEventListener('pointerleave', onLeave);
      node.removeEventListener('keydown', onKeyDown);
      node.removeEventListener('focus', onFocus);
      node.removeEventListener('blur', onBlur);
    };
  }, []);

  // A new period or fuel: the previous crosshair position means nothing any more.
  useEffect(() => setActive(null), [count, start.getTime()]);

  const xAt = (index: number) => PLOT_LEFT + (count > 1 ? (index / (count - 1)) * plotWidth : plotWidth / 2);
  const yAt = (value: number) =>
    scale ? PLOT_TOP + (1 - (value - scale.min) / (scale.max - scale.min)) * PLOT_HEIGHT : PLOT_TOP + PLOT_HEIGHT / 2;
  const height = PLOT_TOP + PLOT_HEIGHT + AXIS_HEIGHT;
  const dayTicks = width > 0 ? buildDayTicks(start, count, range, language, xAt, PLOT_LEFT + plotWidth) : [];
  const endLabels = width > 0 && scale ? buildEndLabels(lines, count, yAt) : [];
  const activeIndex = active != null && active < count ? active : null;
  const activeX = activeIndex != null ? xAt(activeIndex) : 0;
  const tooltipLeft =
    activeX + TOOLTIP_OFFSET + tooltipWidth <= width ? activeX + TOOLTIP_OFFSET : Math.max(0, activeX - TOOLTIP_OFFSET - tooltipWidth);

  return (
    <View>
      <View
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
        focusable
        onLayout={(event) => setWidth(Math.round(event.nativeEvent.layout.width))}
        ref={containerRef}
        style={[styles.plot, { height, opacity: dimmed ? 0.45 : 1 }]}
      >
        {width > 0 && scale ? (
          <>
            <Svg height={height} pointerEvents="none" style={StyleSheet.absoluteFill} width={width}>
              {scale.ticks.map((tick) => (
                <Line
                  key={tick}
                  stroke={colors.rule}
                  strokeWidth={1}
                  x1={PLOT_LEFT}
                  x2={PLOT_LEFT + plotWidth}
                  y1={Math.round(yAt(tick)) + 0.5}
                  y2={Math.round(yAt(tick)) + 0.5}
                />
              ))}
              {dayTicks.map((tick) => (
                <Line
                  key={tick.index}
                  stroke={colors.ruleStrong}
                  strokeWidth={1}
                  x1={Math.round(tick.x) + 0.5}
                  x2={Math.round(tick.x) + 0.5}
                  y1={PLOT_TOP + PLOT_HEIGHT}
                  y2={PLOT_TOP + PLOT_HEIGHT + 5}
                />
              ))}
              {activeIndex != null ? (
                <Line stroke={colors.grey} strokeWidth={1} x1={activeX} x2={activeX} y1={PLOT_TOP} y2={PLOT_TOP + PLOT_HEIGHT} />
              ) : null}
              {[...lines].reverse().map((line) => (
                <Path
                  d={linePath(line.values, xAt, yAt, line.step)}
                  fill="none"
                  key={line.key}
                  stroke={line.color}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                />
              ))}
              {[...lines].reverse().map((line) => {
                const index = activeIndex ?? lastIndexOf(line.values);
                const value = index != null ? line.values[index] : null;

                // End dot, or the reading under the crosshair. The white ring keeps it legible over other lines.
                return value != null && index != null && (activeIndex != null || index === count - 1) ? (
                  <Circle cx={xAt(index)} cy={yAt(value)} fill={line.color} key={line.key} r={4} stroke={colors.white} strokeWidth={2} />
                ) : null;
              })}
            </Svg>

            {scale.ticks.map((tick) => (
              <Text key={tick} style={[styles.yLabel, { top: yAt(tick) - 9 }]}>
                {formatTick(tick, scale.step, language)}
              </Text>
            ))}
            {dayTicks.map((tick) => (
              <Text key={tick.index} numberOfLines={1} style={[styles.xLabel, { left: tick.x + 4, top: PLOT_TOP + PLOT_HEIGHT + 4 }]}>
                {tick.label}
              </Text>
            ))}
            {endLabels.map((label) => (
              <Text key={label.key} style={[styles.endLabel, { left: PLOT_LEFT + plotWidth + 8, top: label.y - 10 }]}>
                {formatPriceValue(label.value, language)}
              </Text>
            ))}

            {activeIndex != null ? (
              <View
                onLayout={(event) => setTooltipWidth(Math.ceil(event.nativeEvent.layout.width))}
                pointerEvents="none"
                style={[styles.tooltip, shadows.floating, { left: tooltipLeft }]}
              >
                <Text style={styles.tooltipDate}>{formatDay(new Date(start.getTime() + activeIndex * DAY_MS), language, 'long')}</Text>
                {lines.map((line) => (
                  <View key={line.key} style={styles.tooltipRow}>
                    <View style={[styles.lineKey, { backgroundColor: line.color }]} />
                    <Text style={styles.tooltipValue}>
                      {line.values[activeIndex] != null ? formatPriceValue(line.values[activeIndex]!, language) : '—'}
                    </Text>
                    <Text style={styles.tooltipLabel}>{line.label}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      <View style={styles.legend}>
        {lines.map((line) => (
          <View key={line.key} style={styles.legendItem}>
            <View style={[styles.lineKey, { backgroundColor: line.color }]} />
            <Text style={styles.legendText}>{line.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function buildScale(series: DailyPrices[]) {
  let low = Infinity;
  let high = -Infinity;

  for (const values of series) {
    for (const value of values) {
      if (value != null) {
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
  }

  if (!Number.isFinite(low)) {
    return null;
  }

  const span = Math.max(high - low, 0.01);
  const step = PRICE_STEPS.find((candidate) => span / candidate <= 4) ?? 1;
  // A little air above and below the data, then out to the nearest gridline.
  const min = Math.floor((low - span * 0.06) / step) * step;
  const max = Math.ceil((high + span * 0.06) / step) * step;
  const ticks: number[] = [];

  for (let tick = min; tick <= max + step / 2; tick += step) {
    ticks.push(Math.round(tick * 1000) / 1000);
  }

  return { max, min, step, ticks };
}

function formatTick(value: number, step: number, language: AppLanguage) {
  const digits = step < 0.01 ? 3 : 2;

  return new Intl.NumberFormat(getLocale(language), { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(value);
}

/** Mondays over one month; the first of each month otherwise, with the year on January. */
function buildDayTicks(
  start: Date,
  count: number,
  range: HistoryRange,
  language: AppLanguage,
  xAt: (index: number) => number,
  plotRight: number,
) {
  const ticks: Array<{ index: number; label: string; x: number }> = [];

  for (let index = 0; index < count; index += 1) {
    const day = new Date(start.getTime() + index * DAY_MS);
    const isTick = range === 30 ? day.getUTCDay() === 1 : day.getUTCDate() === 1;

    if (!isTick) {
      continue;
    }

    const x = xAt(index);
    const previous = ticks[ticks.length - 1];

    // Labels sit to the right of their tick: drop one that would run past the plot or into the previous one.
    if ((previous && x - previous.x < MIN_TICK_GAP) || x > plotRight - 28) {
      continue;
    }

    ticks.push({
      index,
      label:
        range === 30
          ? formatDay(day, language, 'short')
          : day.getUTCMonth() === 0
            ? String(day.getUTCFullYear())
            : formatDay(day, language, 'month'),
      x,
    });
  }

  return ticks;
}

/** The latest value of each series that reaches today, minus those that would overlap the focus one. */
function buildEndLabels(lines: ChartLine[], count: number, yAt: (value: number) => number) {
  const labels: Array<{ key: string; value: number; y: number }> = [];

  for (const line of lines) {
    const value = line.values[count - 1];

    if (value == null) {
      continue;
    }

    const y = yAt(value);

    if (labels.every((label) => Math.abs(label.y - y) >= MIN_END_LABEL_GAP)) {
      labels.push({ key: line.key, value, y });
    }
  }

  return labels;
}

function linePath(values: DailyPrices, xAt: (index: number) => number, yAt: (value: number) => number, step = false) {
  let path = '';
  let isOpen = false;

  values.forEach((value, index) => {
    if (value == null) {
      isOpen = false;
      return;
    }

    const x = xAt(index).toFixed(1);
    const y = yAt(value).toFixed(1);

    path += !isOpen ? `M${x},${y}` : step ? `H${x}V${y}` : `L${x},${y}`;
    isOpen = true;
  });

  return path;
}

function lastIndexOf(values: DailyPrices) {
  for (let index = values.length - 1; index >= 0; index -= 1) {
    if (values[index] != null) {
      return index;
    }
  }

  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

const styles = StyleSheet.create({
  endLabel: {
    color: colors.black,
    fontFamily: fonts.condensedBold,
    fontSize: type.body,
    fontVariant: ['tabular-nums'],
    position: 'absolute',
  },
  legend: {
    columnGap: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
    rowGap: 4,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  legendText: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  lineKey: {
    borderRadius: 1,
    height: 2,
    width: 14,
  },
  plot: {
    cursor: 'crosshair',
    position: 'relative',
    touchAction: 'pan-y',
    userSelect: 'none',
  } as never,
  tooltip: {
    backgroundColor: colors.white,
    borderRadius: radius.control,
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 8,
    position: 'absolute',
    top: 0,
  },
  tooltipDate: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.meta,
    marginBottom: 2,
  },
  tooltipLabel: {
    color: colors.grey,
    fontFamily: fonts.regular,
    fontSize: type.meta,
  },
  tooltipRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  tooltipValue: {
    color: colors.black,
    fontFamily: fonts.condensedBold,
    fontSize: type.body,
    fontVariant: ['tabular-nums'],
  },
  xLabel: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
    position: 'absolute',
  },
  yLabel: {
    color: colors.greyLight,
    fontFamily: fonts.regular,
    fontSize: type.meta,
    fontVariant: ['tabular-nums'],
    left: 0,
    position: 'absolute',
    textAlign: 'right',
    width: Y_LABEL_WIDTH,
  },
});
