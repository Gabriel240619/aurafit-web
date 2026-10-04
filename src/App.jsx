import { BackgroundDecor } from './components/BackgroundDecor';
import { BrandPanel } from './components/BrandPanel';
import { ChatPanel } from './components/ChatPanel';

export default function App() {
  return (
    <main className="app-shell">
      <BackgroundDecor />
      <div className="main-layout">
        <BrandPanel />
        <ChatPanel />
      </div>
    </main>
  );
}
