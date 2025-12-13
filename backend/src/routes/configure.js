const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const CONFIG_PATH = "D:\\tradev\\yolo-service\\configs\\video_configs.json";

router.post("/configure", (req, res) => {
  try {
    const body = req.body;

    if (!body || !Array.isArray(body.lanes)) {
      return res.status(400).json({ error: "Expected { lanes: [...] }" });
    }

    // Save EXACT array YOLO expects
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(body.lanes, null, 2));

    console.log("✔ Saved YOLO config →", CONFIG_PATH);

    return res.json({ ok: true, message: "Config saved" });
  } catch (err) {
    console.error("configure error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;
