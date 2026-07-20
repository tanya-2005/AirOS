import PagePlaceholder from "../components/layout/PagePlaceholder";
import Footer from "../components/layout/Footer";

export default function Attribution() {
  return (
    <>
      <PagePlaceholder
        eyebrow="03 · SOURCE ATTRIBUTION"
        title="AI Attribution"
        description="Per-station evidence trail: which registered sources are driving each hotspot, with confidence shares and distance-weighted scoring."
        milestone="M5"
      />
      <Footer pageLabel="ATTRIBUTION" />
    </>
  );
}
