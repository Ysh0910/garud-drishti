export default function WarnBanner({ text }: { text: string }) {
  return (
    <div className="warn-banner">
      <div className="mark">!</div>
      <div className="text">{text}</div>
    </div>
  );
}
