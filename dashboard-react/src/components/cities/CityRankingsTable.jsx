import { useState } from "react";
import { ChevronDown } from "lucide-react";
import Card from "../ui/Card";
import Badge from "../ui/Badge";
import DataSourceBadge from "../ui/DataSourceBadge";
import { categoryFor } from "../../lib/aqi";
import { sourceMeta } from "../../lib/sources.jsx";
import { EMERGENCY_TONE, groupMeta } from "../../lib/healthAdvisory";
import { rankCities } from "../../lib/cityComparison";

/**
 * Ranked city-by-city table — Priority / City / Current AQI / 24h Forecast
 * / Incidents / Emergency Level are the columns worth scanning at a
 * glance; Dominant Source and Most Vulnerable Group move into an
 * expandable row (click to open) rather than adding two more columns to
 * an already-wide table. Shared by the City Comparison page and the
 * Intelligence Report's Multiple Cities / National Comparison modes.
 */
export default function CityRankingsTable({ rows, selectedCity, onJumpToCity }) {
  const ranked = rankCities(rows);
  const [expanded, setExpanded] = useState(null);

  return (
    <Card padding="p-0" hover={false} className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[760px]">
          <thead>
            <tr className="border-b border-border bg-search/60">
              <Th>Priority</Th>
              <Th>City</Th>
              <Th>Current AQI</Th>
              <Th>24h Forecast</Th>
              <Th>Incidents</Th>
              <Th>Emergency Level</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {ranked.map((row, i) => (
              <ComparisonRow
                key={row.city}
                row={row}
                rank={i + 1}
                isSelected={row.city === selectedCity}
                onJump={onJumpToCity ? () => onJumpToCity(row.city) : null}
                isExpanded={expanded === row.city}
                onToggleExpand={() => setExpanded((prev) => (prev === row.city ? null : row.city))}
              />
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({ children }) {
  return (
    <th className="px-5 py-3 text-[11px] font-mono uppercase tracking-wider text-muted-2 font-medium">
      {children}
    </th>
  );
}

function Td({ children, className = "" }) {
  return <td className={`px-5 py-4 text-[14px] text-ink align-middle ${className}`}>{children}</td>;
}

function ComparisonRow({ row, rank, isSelected, onJump, isExpanded, onToggleExpand }) {
  const hasData = row.data_source === "live_pipeline";
  const cat = hasData ? categoryFor(row.current_aqi) : null;
  const src = row.dominant_source ? sourceMeta(row.dominant_source) : null;
  const group = row.most_vulnerable_group ? groupMeta(row.most_vulnerable_group) : null;

  return (
    <>
      <tr
        className={`border-b border-border transition-colors ${
          isSelected ? "bg-accent-tint/40" : onJump ? "hover:bg-search/60" : ""
        } ${isExpanded ? "" : "last:border-b-0"}`}
      >
        <Td className="font-mono text-[13px] text-muted-2">{hasData ? `#${rank}` : "—"}</Td>
        <Td>
          {onJump ? (
            <button onClick={onJump} className="text-left group">
              <div className="font-medium group-hover:text-accent transition-colors">{row.label}</div>
              <div className="text-[12px] text-muted-3">{row.state}</div>
            </button>
          ) : (
            <>
              <div className="font-medium">{row.label}</div>
              <div className="text-[12px] text-muted-3">{row.state}</div>
            </>
          )}
        </Td>
        <Td>
          {hasData ? (
            <span className="inline-flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cat.color }} />
              <span className="font-mono tabular-nums">{Math.round(row.current_aqi)}</span>
              <span className="text-[12px] text-muted-2">{cat.label}</span>
            </span>
          ) : (
            <DataSourceBadge source={row.data_source} />
          )}
        </Td>
        <Td>
          {hasData && row.forecast_aqi != null ? (
            <span className="font-mono tabular-nums">{Math.round(row.forecast_aqi)}</span>
          ) : (
            "—"
          )}
        </Td>
        <Td>
          {hasData ? (
            <span>
              {row.active_incident_count} active <span className="text-muted-3">/ {row.incident_count} total</span>
            </span>
          ) : (
            "—"
          )}
        </Td>
        <Td>{row.emergency_level ? <Badge tone={EMERGENCY_TONE[row.emergency_level]}>{row.emergency_level}</Badge> : "—"}</Td>
        <Td className="w-10">
          {hasData && (
            <button
              onClick={onToggleExpand}
              aria-expanded={isExpanded}
              aria-label="Show more details"
              className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-search transition-colors cursor-pointer"
            >
              <ChevronDown size={14} className={`text-muted-3 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
            </button>
          )}
        </Td>
      </tr>
      {isExpanded && hasData && (
        <tr className="border-b border-border last:border-b-0 bg-search/30">
          <td colSpan={7} className="px-5 py-4">
            <div className="flex items-center gap-8 flex-wrap text-[13px]">
              <div>
                <span className="font-mono text-[10px] text-muted-3 uppercase tracking-wider mr-2">Dominant source</span>
                {src ? <Badge tone={src.tone}>{src.label}</Badge> : "—"}
              </div>
              <div>
                <span className="font-mono text-[10px] text-muted-3 uppercase tracking-wider mr-2">Most vulnerable</span>
                <span className="text-ink font-medium">{group ? group.label : "—"}</span>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
