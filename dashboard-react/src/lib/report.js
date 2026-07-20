// Templated narrative synthesis for the AI Intelligence Report page.
//
// Per the implementation plan, this starts as deterministic string
// templating over real pipeline output (attribution + forecast +
// enforcement) rather than a live LLM call — that's a separate scope
// question (needs a new Anthropic API key + prompt design) flagged for a
// later milestone. Every number here comes straight from the agents; only
// the sentence structure around it is templated. Nothing is invented.

import { categoryFor } from "./aqi";
import { sourceMeta } from "./sources";

export function citySummary(stations, forecasts, enforcement) {
  if (!stations.length) return null;

  const avgAqi = stations.reduce((sum, s) => sum + s.aqi, 0) / stations.length;
  const worst = stations[0];

  const sourceTotals = {};
  for (const s of stations) {
    for (const a of s.attribution ?? []) {
      sourceTotals[a.source_type] = (sourceTotals[a.source_type] || 0) + a.confidence;
    }
  }
  const topSourceEntry = Object.entries(sourceTotals).sort((a, b) => b[1] - a[1])[0];
  const topSource = topSourceEntry ? sourceMeta(topSourceEntry[0]) : null;

  let forecastDelta = null;
  if (forecasts.length) {
    const deltas = forecasts.map((f) => f.forecast_24h.predicted_aqi - f.current_aqi);
    forecastDelta = deltas.reduce((sum, d) => sum + d, 0) / deltas.length;
  }
  const direction = forecastDelta == null ? null : forecastDelta > 2 ? "worsen" : forecastDelta < -2 ? "improve" : "hold steady";

  const activeGaps = enforcement.filter((e) => e.evidence?.active).length;

  return {
    avgAqi: Math.round(avgAqi),
    avgCategory: categoryFor(avgAqi),
    worst,
    worstCategory: categoryFor(worst.aqi),
    topSource,
    forecastDelta: forecastDelta == null ? null : Math.round(forecastDelta),
    direction,
    activeGaps,
    stationCount: stations.length,
  };
}

export function stationNarrative(station, forecast, enforcementForStation) {
  const cat = categoryFor(station.aqi);
  const top = station.attribution?.[0];
  const second = station.attribution?.[1];
  const topMeta = top ? sourceMeta(top.source_type) : null;
  const secondMeta = second ? sourceMeta(second.source_type) : null;

  const sentences = [];
  sentences.push(
    `${station.station} is currently at AQI ${Math.round(station.aqi)} (${cat.label}).`
  );

  if (topMeta) {
    sentences.push(
      `The dominant attributed source is ${topMeta.label.toLowerCase()}, carrying ${Math.round(
        top.confidence * 100
      )}% of the explained signal${
        secondMeta ? `, followed by ${secondMeta.label.toLowerCase()} at ${Math.round(second.confidence * 100)}%` : ""
      }.`
    );
  } else {
    sentences.push("No registry source falls within the 3km attribution radius for this station.");
  }

  if (forecast) {
    const delta = forecast.forecast_24h.predicted_aqi - station.aqi;
    const verb = delta > 2 ? "climb toward" : delta < -2 ? "ease toward" : "hold near";
    sentences.push(
      `Absent intervention, the 24h forecast has it ${verb} ${Math.round(forecast.forecast_24h.predicted_aqi)} (${Math.round(
        forecast.forecast_24h.confidence * 100
      )}% confidence).`
    );
  }

  const gapCount = enforcementForStation?.length ?? 0;
  if (gapCount > 0) {
    const unaddressed = enforcementForStation.filter((e) => e.permit_status !== "valid").length;
    sentences.push(
      `${gapCount} enforcement action${gapCount > 1 ? "s are" : " is"} queued nearby${
        unaddressed > 0 ? `, ${unaddressed} against an unregistered or expired-permit source` : ""
      }.`
    );
  }

  return sentences.join(" ");
}
