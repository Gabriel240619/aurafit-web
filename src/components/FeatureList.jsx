const features = [
  {
    name: 'Rutinas',
    detail: 'A tu nivel y objetivo',
    icon: (
      <path d="M5 9v6m3-8v10m8-10v10m3-8v6M8 12h8" />
    ),
  },
  {
    name: 'Entrenamientos',
    detail: 'Registro diario',
    icon: (
      <path d="M12 3v3m0 12v3M3 12h3m12 0h3M6.4 6.4l2.1 2.1m7 7 2.1 2.1m0-11.2-2.1 2.1m-7 7-2.1 2.1M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    ),
  },
  {
    name: 'Nutrición',
    detail: 'Calorías y comidas',
    icon: (
      <path d="M12 21c4.4-2.7 7-6.4 7-10.3C19 6.3 16.3 3 12 3S5 6.3 5 10.7C5 14.6 7.6 18.3 12 21Zm0-4V8m0 4 3-3m-3 5-3-3" />
    ),
  },
  {
    name: 'Progreso',
    detail: 'Tu resumen al instante',
    icon: (
      <path d="M5 19V9m7 10V5m7 14v-7M3 19h18" />
    ),
  },
];

export function FeatureList() {
  return (
    <ul className="feature-list" aria-label="Funciones de AuraFit">
      {features.map((feature) => (
        <li className="feature-item" key={feature.name}>
          <span className="feature-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              {feature.icon}
            </svg>
          </span>
          <span>
            <strong>{feature.name}</strong>
            <small>{feature.detail}</small>
          </span>
        </li>
      ))}
    </ul>
  );
}
