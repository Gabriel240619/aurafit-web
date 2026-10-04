export function PerformanceCard() {
  return (
    <aside className="performance-card" aria-label="Beneficio de AuraFit">
      <div className="performance-card__metric">
        <span className="eyebrow">Tu día, conectado</span>
        <strong>Entrena · Nutre · Avanza</strong>
      </div>

      <div className="activity-visual" aria-hidden="true">
        <span className="activity-visual__label">Constancia</span>
        <div className="activity-bars">
          {[42, 58, 48, 72, 63, 88, 100].map((height, index) => (
            <i
              key={index}
              style={{ '--bar-height': `${height}%` }}
              className={index === 6 ? 'is-active' : ''}
            />
          ))}
        </div>
      </div>
    </aside>
  );
}
