export default function ProgressBar({ progress, status }) {
  return (
    <div style={{ textAlign: "center" }}>
      <div style={{ height: 4, borderRadius: 2, background: "#e8e2d8", overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", borderRadius: 2, transition: "width 0.5s ease", background: "linear-gradient(90deg, #7a6344, #a6916e)", width: `${progress}%` }} />
      </div>
      <p style={{ fontSize: 13, color: "#5a4e3e", margin: 0 }}>{status}</p>
    </div>
  );
}
