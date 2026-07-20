import PagePlaceholder from "../components/layout/PagePlaceholder";
import Footer from "../components/layout/Footer";

export default function Forecast() {
  return (
    <>
      <PagePlaceholder
        eyebrow="04 · 24–72H OUTLOOK"
        title="Forecast"
        description="Weather-adjusted AQI forecasts per station with confidence bands, and RMSE-vs-persistence backtesting once logged history exists."
        milestone="M6"
      />
      <Footer pageLabel="FORECAST" />
    </>
  );
}
