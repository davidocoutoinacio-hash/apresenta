import { useRef, useState } from "react";

const ORBIT_DURATION = 32; // segundos para uma volta completa
const DRAG_THRESHOLD = 4; // px de movimento antes de considerar "arrastando" (vs. clique)

export default function OrbitDock({ scripts, onOpen }) {
  const [manualPositions, setManualPositions] = useState({});
  const dragRef = useRef(null);

  if (scripts.length === 0) return null;

  function handlePointerDown(e, scriptId) {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    dragRef.current = {
      scriptId,
      offsetX: e.clientX - centerX,
      offsetY: e.clientY - centerY,
      moved: false,
    };
    setManualPositions((prev) => ({ ...prev, [scriptId]: { x: centerX, y: centerY } }));
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    const drag = dragRef.current;
    if (!drag) return;

    const x = e.clientX - drag.offsetX;
    const y = e.clientY - drag.offsetY;

    if (!drag.moved) {
      const start = manualPositions[drag.scriptId];
      const dist = start ? Math.hypot(x - start.x, y - start.y) : 0;
      if (dist > DRAG_THRESHOLD) drag.moved = true;
    }

    setManualPositions((prev) => ({ ...prev, [drag.scriptId]: { x, y } }));
  }

  function handlePointerUp(e) {
    const drag = dragRef.current;
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    if (!drag) return;

    if (!drag.moved) {
      setManualPositions((prev) => {
        const next = { ...prev };
        delete next[drag.scriptId];
        return next;
      });
      onOpen(drag.scriptId);
    }
  }

  return (
    <div className="orbit-dock">
      {scripts.map((script, i) => {
        const initial = script.name.trim().charAt(0).toUpperCase() || "?";
        const title = `${script.name} (${script.lines.length} falas) — clique para abrir, arraste para mover`;
        const manual = manualPositions[script.id];

        if (manual) {
          return (
            <button
              key={script.id}
              className="orbit-icon-manual"
              style={{ left: manual.x, top: manual.y }}
              onPointerDown={(e) => handlePointerDown(e, script.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title={title}
            >
              {initial}
            </button>
          );
        }

        const delay = `-${(ORBIT_DURATION * i) / scripts.length}s`;
        return (
          <div
            key={script.id}
            className="orbit-pivot"
            style={{ animationDuration: `${ORBIT_DURATION}s`, animationDelay: delay }}
          >
            <button
              className="orbit-icon"
              style={{ animationDuration: `${ORBIT_DURATION}s`, animationDelay: delay }}
              onPointerDown={(e) => handlePointerDown(e, script.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              title={title}
            >
              {initial}
            </button>
          </div>
        );
      })}
    </div>
  );
}
