import express from "express";
import { getCourseData } from "../utils/uwflow.js";

const router = express.Router();

router.get("/course/:code", async (req, res) => {
  try {
    const course = await getCourseData(req.params.code);
    if (!course) return res.status(404).json({ error: "Course not found" });

    res.json({
      code: course.code,
      name: course.name,
      liked: course.rating?.liked ?? null,
      useful: course.rating?.useful ?? null,
      filledCount: course.rating?.filled_count ?? 0
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch UWFlow data" });
  }
});

export default router;
