import PagePlaceholder from "../components/layout/PagePlaceholder";
import Footer from "../components/layout/Footer";

export default function CityMap() {
  return (
    <>
      <PagePlaceholder
        eyebrow="02 · SPATIAL VIEW"
        title="City Intelligence Map"
        description="MapLibre view of every station, registry source, and pollution hotspot, colored by AQI category with a live heat layer."
        milestone="M4"
      />
      <Footer pageLabel="CITY MAP" />
    </>
  );
}
