/** Workshop tools drawn as faint line art behind the landing page. Decorative only. */

const polar = (cx: number, cy: number, r: number, a: number) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`;

/** Circular saw blade: ramp-shaped teeth, arbor hole and expansion slots. Its gap is the kerf. */
function Blade({ r, teeth, accent }: { r: number; teeth: number; accent?: boolean }) {
  const step = (Math.PI * 2) / teeth;
  let d = '';
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    d += `${i ? 'L' : 'M'}${polar(0, 0, r * 0.9, a)} L${polar(0, 0, r, a + step * 0.9)} `;
  }
  return (
    <g className={accent ? 'tool accent' : 'tool'}>
      <path d={`${d}Z`} />
      <circle r={r * 0.62} />
      <circle r={r * 0.17} />
      {[0, 1, 2, 3].map((i) => (
        <path key={i} d={`M${polar(0, 0, r * 0.66, i * 1.57 + 0.4)} L${polar(0, 0, r * 0.82, i * 1.57 + 0.4)}`} />
      ))}
    </g>
  );
}

function Handsaw() {
  const n = 22;
  const step = 300 / n;
  let teeth = '';
  for (let i = n; i >= 1; i--) teeth += ` L${((i - 0.5) * step).toFixed(1)} 13 L${((i - 1) * step).toFixed(1)} 0`;
  return (
    <g className="tool">
      <path d={`M0 -50 L300 -34 L300 0${teeth} Z`} />
      <path d="M-4 -58 h-72 q-26 0 -26 26 v44 q0 26 26 26 h72 z" />
      <ellipse cx="-52" cy="-6" rx="22" ry="10" />
      <circle cx="40" cy="-26" r="5" />
    </g>
  );
}

function Tape() {
  const ticks = Array.from({ length: 19 }, (_, i) => i);
  return (
    <g className="tool">
      <circle r="64" />
      <circle r="24" />
      <circle r="8" />
      <rect x="40" y="38" width="250" height="26" rx="3" />
      {ticks.map((i) => (
        <path key={i} d={`M${70 + i * 12} 38 v${i % 5 === 0 ? 14 : 8}`} />
      ))}
      <path d="M52 64 h-20 v-14" />
    </g>
  );
}

function Pencil() {
  return (
    <g className="tool accent">
      <path d="M0 -11 H250 V11 H0 Z" />
      <path d="M0 -11 L-48 0 L0 11" />
      <path d="M-30 -4.5 L-48 0 L-30 4.5" />
      <path d="M222 -11 V11 M236 -11 V11" />
      <path d="M250 -11 q16 0 16 11 t-16 11" />
    </g>
  );
}

function TrySquare() {
  const ticks = Array.from({ length: 14 }, (_, i) => i);
  return (
    <g className="tool">
      <path d="M0 0 H260 V32 H32 V260 H0 Z" />
      {ticks.map((i) => (
        <path key={`a${i}`} d={`M${48 + i * 15} 32 v${i % 5 === 0 ? 14 : 8}`} />
      ))}
      {ticks.map((i) => (
        <path key={`b${i}`} d={`M32 ${48 + i * 15} h${i % 5 === 0 ? 14 : 8}`} />
      ))}
      <circle cx="16" cy="16" r="5" />
    </g>
  );
}

/** A measuring scale with numbered ticks. */
function Ruler({ length }: { length: number }) {
  const n = Math.floor(length / 12);
  return (
    <g className="tool">
      <rect width={length} height={36} rx="3" />
      {Array.from({ length: n + 1 }, (_, i) => (
        <path key={i} d={`M${i * 12} 0 v${i % 5 === 0 ? 18 : 10}`} />
      ))}
      {Array.from({ length: Math.floor(n / 5) }, (_, i) => (
        <text key={i} className="tool-text" x={(i + 1) * 60 - 6} y={31}>
          {(i + 1) * 10}
        </text>
      ))}
    </g>
  );
}

/** Cut parts with their sizes, as on a sheet layout. */
function Pieces() {
  return (
    <g className="tool">
      <rect width="210" height="130" rx="4" />
      <text className="tool-text big" x="105" y="72" textAnchor="middle">
        720 × 560
      </text>
      <rect x="222" y="30" width="150" height="100" rx="4" />
      <text className="tool-text big" x="297" y="86" textAnchor="middle">
        564 × 560
      </text>
      <rect x="40" y="142" width="170" height="86" rx="4" />
      <text className="tool-text big" x="125" y="192" textAnchor="middle">
        597 × 717
      </text>
    </g>
  );
}

/**
 * The drawing is 2400 wide but only as much of it as fits the screen is shown (height-driven, centered),
 * so the tools near the middle always show and the ones at the ends fill the empty sides of wide screens.
 */
export default function ToolsBackdrop({ flip = false }: { flip?: boolean }) {
  return (
    <svg className={`tools-bg${flip ? " flip" : ""}`} viewBox="0 0 2400 1000" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
      {/* middle: always visible */}
      <g transform="translate(1710 190)">
        <Blade r={175} teeth={44} accent />
      </g>
      <g transform="translate(570 160) rotate(-9)">
        <Tape />
      </g>
      <g transform="translate(670 870) rotate(-17)">
        <Handsaw />
      </g>
      <g transform="translate(1640 800) rotate(-30)">
        <Pencil />
      </g>
      <g transform="translate(1820 940) rotate(180) scale(0.8)">
        <TrySquare />
      </g>
      <g transform="translate(970 880)">
        <Blade r={70} teeth={26} />
      </g>

      {/* left end: wide screens */}
      <g transform="translate(70 120) rotate(-4)">
        <Ruler length={420} />
      </g>
      <g transform="translate(90 330) scale(0.95)">
        <TrySquare />
      </g>
      <g transform="translate(70 740) rotate(-6)">
        <Pieces />
      </g>
      <g transform="translate(400 560) rotate(-78)">
        <Pencil />
      </g>

      {/* right end: wide screens */}
      <g transform="translate(2250 520)">
        <Blade r={135} teeth={36} accent />
      </g>
      <g transform="translate(1990 150) rotate(12)">
        <Handsaw />
      </g>
      <g transform="translate(1960 800) rotate(-5)">
        <Ruler length={380} />
      </g>
      <g transform="translate(2120 880) rotate(-22)">
        <Pencil />
      </g>
    </svg>
  );
}
