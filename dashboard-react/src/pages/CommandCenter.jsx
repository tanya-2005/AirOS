import PagePlaceholder from "../components/layout/PagePlaceholder";
import Footer from "../components/layout/Footer";

export default function CommandCenter() {
  return (
    <>
      <PagePlaceholder
        eyebrow="01 · CITY OVERVIEW"
        title="Command Center"
        description="Real-time hotspot ranking, AQI gauges, and top recommended actions across every monitored station."
        milestone="M3"
      />
      <Footer pageLabel="COMMAND CENTER" />
    </>
  );
}
