export default function Footer({ pageLabel = "COMMAND CENTER", note = "Live pipeline · attribution → forecast → simulation, evidence-based recommendations" }) {
  return (
    <footer className="border-t border-border-nav bg-[#F7F5F1]">
      <div className="max-w-content mx-auto px-5 md:px-10 py-7 flex items-center justify-between flex-wrap gap-3.5">
        <div className="font-mono text-[11px] tracking-[.06em] text-muted-4">
          AirOS · {pageLabel} · v1.0
        </div>
        <div className="font-mono text-[11px] text-muted-5">{note}</div>
      </div>
    </footer>
  );
}
