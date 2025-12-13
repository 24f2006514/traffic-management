// backend/src/controllers/configureController.js
const fs = require('fs');
const path = require('path');

const CONFIG_DIR = "D:/tradev/yolo-service/configs";
const CONFIG_PATH = CONFIG_DIR + "/video_configs.json";

exports.saveConfig = (req, res) => {
  try {
    const body = req.body;

    if (!Array.isArray(body.lanes))
      return res.status(400).json({ error: "Expected { lanes: [...] }" });

    const lanes = body.lanes.map((ln, i) => {
      const lane_id = ln.lane_id ?? i;

      // FRONTEND SENDS WEB PATH → CONVERT TO REAL WINDOWS PATH
      const resolvedPath = `D:/tradev/yolo-service/images/lane${lane_id}.jpeg`;

      // Ensure polygon + line exist
      if (!ln.polygon || ln.polygon.length !== 4)
        throw new Error(`lane ${lane_id}: polygon must contain 4 points`);

      if (!ln.line || !ln.line.a || !ln.line.b)
        throw new Error(`lane ${lane_id}: line must contain a and b`);

      return {
        lane_id,
        path: resolvedPath,
        polygon: ln.polygon.map(p => ({ x: Number(p.x), y: Number(p.y) })),
        line: {
          a: { x: Number(ln.line.a.x), y: Number(ln.line.a.y) },
          b: { x: Number(ln.line.b.x), y: Number(ln.line.b.y) }
        }
      };
    });

    if (!fs.existsSync(CONFIG_DIR))
      fs.mkdirSync(CONFIG_DIR, { recursive: true });

    fs.writeFileSync(CONFIG_PATH, JSON.stringify(lanes, null, 2));

    console.log("✔ Saved YOLO config →", CONFIG_PATH);

    res.json({ ok: true, saved: lanes.length });

  } catch (err) {
    console.error("saveConfig error:", err);
    res.status(500).json({ error: err.message });
  }
};
