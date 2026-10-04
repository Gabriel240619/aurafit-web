import { DialogflowMessenger } from './DialogflowMessenger';

export function ChatPanel() {
  return (
    <section className="chat-panel" aria-label="Chat con AuraFit Coach">
      <div className="chat-body">
        <DialogflowMessenger />
      </div>
    </section>
  );
}
