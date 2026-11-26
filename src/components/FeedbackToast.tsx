import { useEffect, useState } from 'react';
import { feedbackEventName, type FeedbackMessage } from '../lib/feedback';
import { Icon } from './ui/Icon';

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
      className={`fixed bottom-4 right-4 z-[100] flex max-w-[min(28rem,calc(100vw-2rem))] items-start gap-3 rounded-panel border bg-surface p-4 shadow-[var(--shadow-overlay)] ${
        isError ? 'border-danger text-danger-text' : 'border-accent text-heading'
      }`}
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
        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-control text-muted hover:bg-surface-soft hover:text-heading focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-accent"
        aria-label="Cerrar aviso"
        onClick={() => setFeedback(null)}
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  );
}
