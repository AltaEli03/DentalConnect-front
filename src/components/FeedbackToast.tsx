import { useEffect, useState } from 'react';
import { feedbackEventName, type FeedbackMessage } from '../lib/feedback';

export function FeedbackToast() {
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null);

  useEffect(() => {
    const receive = (event: Event) => {
      const customEvent = event as CustomEvent<FeedbackMessage>;
      setFeedback(customEvent.detail);
    };
    window.addEventListener(feedbackEventName, receive);
    return () => window.removeEventListener(feedbackEventName, receive);
  }, []);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(null), 6000);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  if (!feedback) return null;

  const isError = feedback.type === 'error';
  return (
    <div
      className={`feedback-toast fixed bottom-4 right-4 z-[100] flex max-w-[min(28rem,calc(100vw-2rem))] items-start gap-3 rounded-card border bg-surface p-4 shadow-xl ${isError ? 'border-danger text-danger-text' : 'border-accent text-heading'}`}
      role={isError ? 'alert' : 'region'}
      aria-label={isError ? undefined : 'Aviso de la aplicación'}
      aria-live={isError ? 'assertive' : 'polite'}
    >
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{feedback.title}</p>
        <p className="mt-1 text-sm text-muted">{feedback.message}</p>
      </div>
      <button
        type="button"
        className="min-h-8 min-w-8 rounded-control font-semibold"
        aria-label="Cerrar aviso"
        onClick={() => setFeedback(null)}
      >
        ×
      </button>
    </div>
  );
}
