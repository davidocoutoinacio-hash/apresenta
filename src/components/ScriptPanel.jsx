import { useRef, useState } from "react";
import { PlayIcon, TrashIcon } from "./Icons";

const MIN_WIDTH = 280;
const MIN_HEIGHT = 200;

export default function ScriptPanel({
  script,
  index,
  status,
  onMinimize,
  onDelete,
  onRename,
  onAddLine,
  onUpdateLine,
  onRemoveLine,
  onPlayLine,
  onResetProgress,
  onResize,
}) {
  const [pos, setPos] = useState(() => ({
    x: 90 + (index % 3) * 36,
    y: 90 + (index % 4) * 32,
  }));
  const [size, setSize] = useState(() => ({
    width: script.width || 400,
    height: script.height || 480,
  }));
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(script.name);
  const dragRef = useRef(null);
  const resizeRef = useRef(null);

  function handlePointerDown(e) {
    if (e.target.closest("button, input")) return;
    dragRef.current = { startX: e.clientX - pos.x, startY: e.clientY - pos.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragRef.current) return;
    setPos({
      x: e.clientX - dragRef.current.startX,
      y: e.clientY - dragRef.current.startY,
    });
  }

  function handlePointerUp(e) {
    dragRef.current = null;
    e.currentTarget.releasePointerCapture?.(e.pointerId);
  }

  function handleResizePointerDown(e) {
    e.stopPropagation();
    resizeRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startWidth: size.width,
      startHeight: size.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function handleResizePointerMove(e) {
    if (!resizeRef.current) return;
    e.stopPropagation();
    const { startX, startY, startWidth, startHeight } = resizeRef.current;
    const maxWidth = window.innerWidth * 0.9;
    const maxHeight = window.innerHeight * 0.85;
    const next = {
      width: Math.min(maxWidth, Math.max(MIN_WIDTH, startWidth + (e.clientX - startX))),
      height: Math.min(maxHeight, Math.max(MIN_HEIGHT, startHeight + (e.clientY - startY))),
    };
    resizeRef.current.latest = next;
    setSize(next);
  }

  function handleResizePointerUp(e) {
    e.currentTarget.releasePointerCapture?.(e.pointerId);
    const finalSize = resizeRef.current?.latest;
    resizeRef.current = null;
    // Só persiste no fim do arraste — commitar a cada pointermove geraria um
    // JSON.stringify do roteiro inteiro (localStorage) a cada pixel arrastado.
    if (finalSize) onResize?.(finalSize);
  }

  function commitName() {
    onRename(nameDraft.trim() || script.name);
    setEditingName(false);
  }

  const total = script.lines.length;
  const nextIndex = Math.min(script.currentIndex ?? 0, total);
  const nextLine = script.lines[nextIndex];

  return (
    <div
      className="floating-panel"
      style={{ left: pos.x, top: pos.y, width: size.width, height: size.height }}
    >
      <div
        className="floating-panel-header"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {editingName ? (
          <input
            className="floating-panel-name-input"
            value={nameDraft}
            autoFocus
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === "Enter") e.currentTarget.blur();
              if (e.key === "Escape") {
                setNameDraft(script.name);
                setEditingName(false);
              }
            }}
          />
        ) : (
          <span
            className="floating-panel-name"
            title="Clique duas vezes para renomear"
            onDoubleClick={() => setEditingName(true)}
          >
            {script.name}
          </span>
        )}
        <div className="floating-panel-header-actions">
          <button title="Minimizar" onClick={onMinimize}>
            ─
          </button>
          <button title="Excluir roteiro" onClick={onDelete}>
            ×
          </button>
        </div>
      </div>

      <div className="floating-panel-body">
        <div className="script-panel-header">
          <button
            className="script-next-btn"
            onClick={() => nextLine && onPlayLine(nextLine, nextIndex)}
            disabled={status === "thinking" || !nextLine || !nextLine.text.trim()}
          >
            {nextLine ? (
              <>
                <PlayIcon size={14} /> Próxima fala ({nextIndex + 1}/{total})
              </>
            ) : (
              "Roteiro concluído"
            )}
          </button>
          <button className="script-reset-btn" onClick={onResetProgress}>
            Reiniciar
          </button>
        </div>

        <div className="script-list">
          {script.lines.map((line, i) => (
            <div
              key={line.id}
              className={`editable-line ${line.id === script.lastPlayedId ? "played" : ""}`}
            >
              <div className="editable-line-row">
                <input
                  className="editable-line-label"
                  placeholder="Rótulo (opcional)"
                  value={line.label}
                  onChange={(e) => onUpdateLine(line.id, { label: e.target.value })}
                />
                <button
                  className="editable-line-play"
                  onClick={() => onPlayLine(line, i)}
                  disabled={status === "thinking" || !line.text.trim()}
                  title="Falar essa frase"
                >
                  <PlayIcon size={14} />
                </button>
                <button
                  className="editable-line-remove"
                  onClick={() => onRemoveLine(line.id)}
                  title="Remover frase"
                >
                  <TrashIcon size={14} />
                </button>
              </div>
              <input
                className="editable-line-note"
                placeholder="Nota / deixa (opcional)"
                value={line.note}
                onChange={(e) => onUpdateLine(line.id, { note: e.target.value })}
              />
              <textarea
                className="editable-line-text"
                placeholder="Texto que a IA vai falar..."
                value={line.text}
                onChange={(e) => onUpdateLine(line.id, { text: e.target.value })}
                rows={2}
              />
            </div>
          ))}
        </div>

        <button className="editable-add-line" onClick={onAddLine}>
          + Adicionar frase
        </button>
      </div>

      <div
        className="floating-panel-resize-handle"
        onPointerDown={handleResizePointerDown}
        onPointerMove={handleResizePointerMove}
        onPointerUp={handleResizePointerUp}
        title="Arraste para redimensionar"
      />
    </div>
  );
}
