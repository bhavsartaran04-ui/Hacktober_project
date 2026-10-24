export default function SafetyBanner({ text }) {
  return (
    <aside className="banner" role="note">
      {text}
    </aside>
  );
}
