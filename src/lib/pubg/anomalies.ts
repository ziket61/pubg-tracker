// Pure helpers that flag *statistical anomalies* in player stats.
// Important: we explicitly do NOT label players as cheaters/banned/suspicious
// in human terms. The wording in the UI must stay neutral ("statistical
// anomaly, requires manual verification").
import { headshotRate, kd, top10Rate, winRate } from "./stats";
import type { GameModeStats } from "./types";

export type AnomalyKey =
  | "kd_extreme"
  | "headshot_extreme"
  | "winrate_extreme"
  | "top10_extreme"
  | "low_sample";

export interface Anomaly {
  key: AnomalyKey;
  severity: "info" | "high";
  metric: string;
  value: number;
  threshold: number;
}

const MIN_SAMPLE_FOR_FLAG = 30;

export function detectAnomalies(stats: GameModeStats): Anomaly[] {
  const out: Anomaly[] = [];
  if (!stats.roundsPlayed) return out;

  if (stats.roundsPlayed < MIN_SAMPLE_FOR_FLAG) {
    out.push({
      key: "low_sample",
      severity: "info",
      metric: "rounds",
      value: stats.roundsPlayed,
      threshold: MIN_SAMPLE_FOR_FLAG,
    });
    return out;
  }

  const kdValue = kd(stats);
  if (kdValue >= 6) {
    out.push({ key: "kd_extreme", severity: "high", metric: "kd", value: kdValue, threshold: 6 });
  }
  const hs = headshotRate(stats);
  if (hs >= 0.7) {
    out.push({
      key: "headshot_extreme",
      severity: "high",
      metric: "headshotRate",
      value: hs,
      threshold: 0.7,
    });
  }
  const wr = winRate(stats);
  if (wr >= 0.4) {
    out.push({ key: "winrate_extreme", severity: "high", metric: "winRate", value: wr, threshold: 0.4 });
  }
  const t10 = top10Rate(stats);
  if (t10 >= 0.85) {
    out.push({ key: "top10_extreme", severity: "high", metric: "top10Rate", value: t10, threshold: 0.85 });
  }

  return out;
}
