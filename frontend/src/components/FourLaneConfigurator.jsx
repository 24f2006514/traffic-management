// frontend/src/components/FourLaneConfigurator.jsx
import React, { useRef, useState, useEffect } from "react";

const IMG_SRC = [
  "/images/lane0.jpeg",
  "/images/lane1.jpeg",
  "/images/lane2.jpeg",
  "/images/lane3.jpeg"
];

// IMPORTANT: Absolute path for YOLO
const YOLO_IMAGE_PATH = "D:/tradev/yolo-service/images";

function LaneEditor({ laneIndex, imgSrc, onChange }) {
  const imgRef = useRef(null);
  const canvasRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [status, setStatus] = useState("Click 4 polygon points");

  /** On resize → redraw canvas */
  useEffect(() => {
    const resize = () => {
      const img = imgRef.current, c = canvasRef.current;
      if (!img || !c) return;
      c.width = img.clientWidth;
      c.height = img.clientHeight;
      draw();
    };
    window.addEventListener("resize", resize);
    resize();
    return () => window.removeEventListener("resize", resize);
  }, [points]);

  useEffect(() => draw(), [points]);

  /** Handle clicks on canvas */
  function handleClick(e) {
    const img = imgRef.current, c = canvasRef.current;
    if (!img || !c) return;

    const rect = c.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Real resolution
    const naturalW = img.naturalWidth;
    const naturalH = img.naturalHeight;

    // Display resolution (contain mode)
    const dispW = img.clientWidth;
    const dispH = img.clientHeight;

    const scaleX = naturalW / dispW;
    const scaleY = naturalH / dispH;

    const display = { x: Math.round(clickX), y: Math.round(clickY) };
    const scaled = { x: Math.round(clickX * scaleX), y: Math.round(clickY * scaleY) };

    if (points.length >= 6) return;

    const next = [...points, { display, scaled }];
    setPoints(next);

    if (next.length === 1) setStatus("Click 3 more polygon points");
    if (next.length === 4) setStatus("Now click 2 points for the count line");
    if (next.length === 6) setStatus("Done");

    if (next.length >= 6) {
      const polygon = next.slice(0, 4).map(p => p.scaled);
      const line = { a: next[4].scaled, b: next[5].scaled };

      onChange(laneIndex, {
        polygon,
        line,
        path: `${YOLO_IMAGE_PATH}/lane${laneIndex}.jpeg`
      });
    } else {
      onChange(laneIndex, {
        polygon: next.length >= 4 ? next.slice(0, 4).map(p => p.scaled) : [],
        line: null
      });
    }
  }

  /** Draw polygon + line overlays */
  function draw() {
    const c = canvasRef.current;
    const ctx = c?.getContext?.("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, c.width, c.height);

    const poly = points.slice(0, 4).map(p => p.display);

    if (poly.length) {
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y);
      if (poly.length === 4) ctx.closePath();

      ctx.fillStyle = "rgba(0,200,0,0.15)";
      ctx.fill();
      ctx.strokeStyle = "lime";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "lime";
      poly.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (points.length >= 5) {
      const a = points[4].display;
      const b = points[5]?.display || a;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "yellow";
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = "yellow";
      ctx.beginPath();
      ctx.arc(a.x, a.y, 5, 0, Math.PI * 2);
      ctx.fill();

      if (points[5]) {
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function reset() {
    setPoints([]);
    setStatus("Click 4 polygon points");
    onChange(laneIndex, { polygon: [], line: null });
  }

  return (
    <div style={{ width: 360, margin: 8 }}>
      <div style={{ fontWeight: 600 }}>Lane {laneIndex + 1}</div>

      <div style={{
        position: "relative",
        width: 360,
        height: 200,
        border: "1px solid #ccc",
        overflow: "hidden"
      }}>
        <img
          ref={imgRef}
          src={imgSrc}
          alt={`lane${laneIndex}`}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain"   // FIXED FOR ACCURATE POLYGON
          }}
          onLoad={() => {
            const c = canvasRef.current;
            if (c) {
              c.width = imgRef.current.clientWidth;
              c.height = imgRef.current.clientHeight;
              draw();
            }
          }}
        />

        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "auto"
          }}
          onClick={handleClick}
        />
      </div>

      <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
        <div style={{ color: "#666" }}>{status}</div>
        <button onClick={reset}>Reset</button>
      </div>
    </div>
  );
}

export default function FourLaneConfigurator() {
  const [laneConfigs, setLaneConfigs] = useState(
    Array.from({ length: 4 }, () => ({ polygon: [], line: null }))
  );

  const [msg, setMsg] = useState("");
  const [saving, setSaving] = useState(false);

  function onChange(i, cfg) {
    const next = [...laneConfigs];
    next[i] = cfg;
    setLaneConfigs(next);
  }

  function allConfigured() {
    return laneConfigs.every(
      l =>
        Array.isArray(l.polygon) &&
        l.polygon.length === 4 &&
        l.line?.a &&
        l.line?.b
    );
  }

  async function save() {
    if (!allConfigured()) {
      alert("Please complete all lanes before saving.");
      return;
    }

    setSaving(true);
    setMsg("");

    const payload = {
      lanes: laneConfigs.map((lc, i) => ({
        lane_id: i,
        path: `${YOLO_IMAGE_PATH}/lane${i}.jpeg`,
        polygon: lc.polygon,
        line: lc.line
      }))
    };

    try {
      const resp = await fetch("/api/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!resp.ok) throw new Error(await resp.text());
      setMsg("Configuration saved. Now press Run Analysis.");
    } catch (err) {
      setMsg("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  }

  async function runAnalysis() {
    setMsg("Running YOLO image processing…");

    const r = await fetch("/api/run_images", { method: "POST" });

    if (r.ok) setMsg("YOLO started! Dashboard will update soon.");
    else setMsg("Failed to run YOLO.");
  }

  return (
    <div style={{ padding: 12 }}>
      <h3>Configure 4 Lanes</h3>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {IMG_SRC.map((s, i) => (
          <LaneEditor key={i} laneIndex={i} imgSrc={s} onChange={onChange} />
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button onClick={save} disabled={saving}>
          {saving ? "Saving..." : "Save Config"}
        </button>

        <button onClick={runAnalysis} style={{ marginLeft: 12 }}>
          Run Analysis
        </button>

        <div style={{ marginTop: 8 }}>{msg}</div>
      </div>
    </div>
  );
}
