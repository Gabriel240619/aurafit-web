import { AuraFitLogo } from '../assets/AuraFitLogo';
import { FeatureList } from './FeatureList';
import { PerformanceCard } from './PerformanceCard';

export function BrandPanel() {
  return (
    <section className="brand-panel" aria-labelledby="main-title">
      <AuraFitLogo />

      <div className="brand-panel__content">
        <p className="eyebrow eyebrow--accent">
          <span className="live-dot" aria-hidden="true" /> Tu bienestar, en movimiento
        </p>
        <h1 id="main-title">
          Entrena mejor.<br />
          Come mejor.<br />
          <span>Progresa.</span>
        </h1>
        <p className="brand-panel__description">
          Tu asistente personal para crear rutinas, registrar entrenamientos,
          seguir tu alimentación y consultar tu progreso desde una sola conversación.
        </p>

        <FeatureList />
      </div>

      <PerformanceCard />
    </section>
  );
}
