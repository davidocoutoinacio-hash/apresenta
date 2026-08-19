// Ícones de linha simples (stroke, herdam a cor do texto via currentColor) —
// substituem os emojis usados como ícone nos botões, pra um visual mais sóbrio
// e consistente entre sistemas operacionais (emoji renderiza diferente em
// cada um; SVG fica igual em qualquer navegador).
function baseProps({ size = 16, className, style }) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    style: { flexShrink: 0, ...style },
  };
}

export function MonitorIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

export function DownloadIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 3v10" />
      <path d="M7.5 9.5L12 14l4.5-4.5" />
      <path d="M4.5 19h15" />
    </svg>
  );
}

export function UploadIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <path d="M12 15V5" />
      <path d="M7.5 9.5L12 5l4.5 4.5" />
      <path d="M4.5 19h15" />
    </svg>
  );
}

export function PlayIcon(props) {
  return (
    <svg {...baseProps(props)} fill="currentColor" stroke="none">
      <path d="M8 5l11 7-11 7V5z" />
    </svg>
  );
}

export function MicIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

export function SpeakerIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor" stroke="none" />
      <path d="M16 8a5 5 0 0 1 0 8" />
      <path d="M18.5 5.5a9 9 0 0 1 0 13" />
    </svg>
  );
}

export function TrashIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <path d="M4 7h16" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export function MenuIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

export function CloseIcon(props) {
  return (
    <svg {...baseProps(props)}>
      <line x1="5" y1="5" x2="19" y2="19" />
      <line x1="19" y1="5" x2="5" y2="19" />
    </svg>
  );
}
