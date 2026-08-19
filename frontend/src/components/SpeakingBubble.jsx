export default function SpeakingBubble({ visible }) {
  return (
    <div className={`speaking-bubble ${visible ? "visible" : ""}`} aria-hidden={!visible}>
      <span className="speaking-dot" />
      <span className="speaking-dot" />
      <span className="speaking-dot" />
    </div>
  );
}
