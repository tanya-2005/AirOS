import { AlertTriangle, RotateCw } from "lucide-react";
import Button from "./Button";

/**
 * Wraps a react-query result: shows `loading` while fetching, an error card
 * with retry on failure, or `children` once data has arrived. Used on every
 * page so the loading/error path is consistent instead of ad hoc per page.
 */
export default function QueryState({ isLoading, isError, error, onRetry, loading, empty, isEmpty, children }) {
  if (isLoading) return loading;

  if (isError) {
    return (
      <div className="rounded-card border border-danger/30 bg-danger-bg p-8 flex flex-col items-center text-center gap-3">
        <AlertTriangle size={22} className="text-danger" strokeWidth={1.8} />
        <div className="text-[15px] text-ink font-medium">Couldn't reach the AirOS backend</div>
        <div className="text-[13px] text-muted-1 max-w-[420px]">
          {error?.message || "The request failed. Check that the FastAPI service is running."}
        </div>
        {onRetry && (
          <Button variant="ghost" size="sm" onClick={onRetry} icon={<RotateCw size={14} />}>
            Retry
          </Button>
        )}
      </div>
    );
  }

  if (isEmpty) return empty;

  return children;
}
