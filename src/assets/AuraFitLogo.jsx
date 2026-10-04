export function AuraFitLogo({ compact = false }) {
  return (
    <div className={`brand-lockup${compact ? ' brand-lockup--compact' : ''}`}>
      <svg
        className="brand-mark"
        viewBox="0 0 48 48"
        role="img"
        aria-label="Isotipo AuraFit"
      >
        <path
          className="brand-mark__ring"
          d="M38.7 34.4A18 18 0 1 1 39.2 14"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="3.4"
        />
        <path
          className="brand-mark__pulse"
          d="M8.5 25h8l2.9-7.2 5 14.2 3.5-9h11.7"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3.4"
        />
      </svg>
      <span className="brand-name">AuraFit</span>
    </div>
  );
}
