import { useEffect, useRef } from 'react';
import { dialogflowConfig, isDialogflowConfigured } from '../config/dialogflow';

const shellStyles = `
  .df-messenger-wrapper {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    background: transparent !important;
    z-index: 1 !important;
  }

  #widgetIcon,
  #topFocusTrap,
  #bottomFocusTrap {
    display: none !important;
    visibility: hidden !important;
  }

  df-messenger-chat {
    display: block !important;
    width: 100% !important;
    height: 100% !important;
  }
`;

const chatStyles = `
  .chat-wrapper,
  .chat-wrapper.chat-open {
    position: absolute !important;
    inset: 0 !important;
    width: 100% !important;
    height: 100% !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    opacity: 1 !important;
    transform: none !important;
    transition: none !important;
  }
`;

const auraFitThemeStyles = `
  #messageList {
    scrollbar-color: #344250 #101720;
    scrollbar-width: thin;
  }

  #messageList::-webkit-scrollbar {
    width: 10px;
  }

  #messageList::-webkit-scrollbar-track {
    background: #101720;
  }

  #messageList::-webkit-scrollbar-thumb {
    background: #344250;
    border: 2px solid #101720;
    border-radius: 999px;
  }

  #messageList::-webkit-scrollbar-thumb:hover {
    background: #b7f34a;
  }

  #messageList::-webkit-scrollbar-corner {
    background: #101720;
  }

  .input-container,
  .input-box-wrapper,
  .input-container input {
    background: #151d27 !important;
  }

  .input-box-wrapper {
    border-top: 1px solid #263241 !important;
  }

  .input-container input {
    color: #f4f7fa !important;
  }

  .input-container input::placeholder {
    color: #788592 !important;
  }

  .df-chips-wrapper .chip {
    background: #151d27 !important;
    border-color: #344250 !important;
    box-shadow: none !important;
  }

  .df-chips-wrapper .chip:hover {
    background: #243a1f !important;
    border-color: #b7f34a !important;
  }

  .df-chips-wrapper a,
  .df-chips-wrapper button {
    color: #f4f7fa !important;
  }

  .card-wrapper,
  #descriptionWrapper,
  .title-card-elements,
  #dfButtonAnchorWrapper,
  #dfButtonWrapper {
    background: #151d27 !important;
    border-color: #263241 !important;
    box-shadow: none !important;
  }

  .title,
  .subtitle,
  .description-line,
  #dfLinkText,
  #dfButtonText {
    color: #f4f7fa !important;
  }

  .subtitle {
    color: #9aa7b5 !important;
  }

  hr,
  .divider {
    border-color: #263241 !important;
  }
`;

function injectStyles(shadowRoot, id, css) {
  if (!shadowRoot || shadowRoot.getElementById(id)) return;

  const style = document.createElement('style');
  style.id = id;
  style.textContent = css;
  shadowRoot.append(style);
}

function observeShadowTree(root, observers, observedRoots) {
  if (!root || observedRoots.has(root)) return;

  observedRoots.add(root);
  injectStyles(root, 'aurafit-theme-styles', auraFitThemeStyles);

  const discoverShadowRoots = () => {
    root.querySelectorAll('*').forEach((element) => {
      if (element.shadowRoot) {
        observeShadowTree(element.shadowRoot, observers, observedRoots);
      }
    });
  };

  discoverShadowRoots();

  const observer = new MutationObserver(discoverShadowRoots);
  observer.observe(root, { childList: true, subtree: true });
  observers.push(observer);
}

function embedMessenger(messenger, observers, observedRoots) {
  if (!messenger?.shadowRoot) return false;

  injectStyles(messenger.shadowRoot, 'aurafit-shell-styles', shellStyles);
  observeShadowTree(messenger.shadowRoot, observers, observedRoots);

  const chat = messenger.shadowRoot.querySelector('df-messenger-chat');
  if (!chat?.shadowRoot) return false;

  chat.opened = true;
  chat.requestUpdate?.();
  injectStyles(chat.shadowRoot, 'aurafit-chat-styles', chatStyles);

  const titlebar = chat.shadowRoot.querySelector('df-messenger-titlebar');
  if (titlebar?.shadowRoot) {
    injectStyles(
      titlebar.shadowRoot,
      'aurafit-titlebar-styles',
      `
        #minimizeIconButton {
          display: none !important;
          visibility: hidden !important;
        }

        #dfTitleBar,
        #dfTitleBar:focus,
        #dfTitleBar:focus-visible {
          outline: none !important;
          box-shadow: none !important;
        }

        #dfTitleBar:focus::after,
        #dfTitleBar:focus-visible::after {
          content: none !important;
          border: 0 !important;
          display: none !important;
        }
      `,
    );

    const title = titlebar.shadowRoot.querySelector('#dfTitleBar');
    if (title) {
      title.tabIndex = -1;
      title.blur();
    }
  }

  return Boolean(titlebar?.shadowRoot);
}

function SetupPreview() {
  return (
    <div className="setup-preview" role="status">
      <div className="coach-avatar coach-avatar--large" aria-hidden="true">
        <span>AF</span>
      </div>
      <div className="setup-preview__copy">
        <span className="setup-preview__eyebrow">LISTO PARA CONECTAR</span>
        <h3>Activa tu AuraFit Coach</h3>
        <p>
          Añade el ID de tu agente de Dialogflow para empezar a conversar.
        </p>
      </div>
      <code>VITE_DIALOGFLOW_AGENT_ID</code>
      <div className="preview-message" aria-hidden="true">
        <span>Mientras tanto, tu interfaz ya está preparada.</span>
      </div>
    </div>
  );
}

export function DialogflowMessenger() {
  const messengerRef = useRef(null);

  useEffect(() => {
    if (!isDialogflowConfigured) return undefined;

    let attempts = 0;
    let timerId;
    const observers = [];
    const observedRoots = new WeakSet();

    const applyPermanentMode = () => {
      const complete = embedMessenger(messengerRef.current, observers, observedRoots);
      attempts += 1;

      if (!complete && attempts < 80) {
        timerId = window.setTimeout(applyPermanentMode, 100);
      }
    };

    const handleLoaded = () => applyPermanentMode();
    window.addEventListener('dfMessengerLoaded', handleLoaded);
    customElements.whenDefined('df-messenger').then(applyPermanentMode);

    return () => {
      window.removeEventListener('dfMessengerLoaded', handleLoaded);
      window.clearTimeout(timerId);
      observers.forEach((observer) => observer.disconnect());
    };
  }, []);

  if (!isDialogflowConfigured) {
    return <SetupPreview />;
  }

  return (
    <df-messenger
      ref={messengerRef}
      intent={dialogflowConfig.intent}
      chat-title={dialogflowConfig.chatTitle}
      agent-id={dialogflowConfig.agentId}
      language-code={dialogflowConfig.languageCode}
      expand="true"
    />
  );
}
