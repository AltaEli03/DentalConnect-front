export type FeedbackMessage = {
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
};

const FEEDBACK_EVENT = 'dentalconnect:feedback';

export function showFeedback(detail: FeedbackMessage) {
  window.dispatchEvent(new CustomEvent<FeedbackMessage>(FEEDBACK_EVENT, { detail }));
}

export const feedbackEventName = FEEDBACK_EVENT;
