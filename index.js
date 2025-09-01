import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import {
  checkExists,
  checkRange,
  createDescription,
  checkReq,
  checkBreadthReq,
  checkDepthReq,
  checkMajorProgress,
} from "./utils/checkMajorProgress.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "/views"));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", (req, res) => {
  res.render("layout", {
    title: "Home",
    activePage: "home",
    content: ejs.render(fs.readFileSync("views/homepage.ejs", "utf-8")),
  });
});

app.get("/features", (req, res) => {
  res.render("layout", {
    title: "Features",
    activePage: "features",
    content: ejs.render(fs.readFileSync("views/features.ejs", "utf-8")),
  });
});

app.get("/about", (req, res) => {
  res.render("layout", {
    title: "About",
    activePage: "about",
    content: ejs.render(fs.readFileSync("views/about.ejs", "utf-8")),
  });
});

app.get("/contact", (req, res) => {
  res.render("layout", {
    title: "Contact",
    activePage: "contact",
    content: ejs.render(fs.readFileSync("views/contact.ejs", "utf-8")),
  });
});

app.post("/submit", (req, res) => {
  const major = req.body.major;
  const userCourses = req.body.courses
    .split(",")
    .map((course) => course.trim().toUpperCase().replace(" ", ""));
  if (!checkExists(userCourses)) {
    return res.render("layout", {
      title: "Home",
      activePage: "home",
      content: ejs.render(fs.readFileSync("views/homepage.ejs", "utf-8"), {
        error:
          "One or more courses you entered do not exist. Please check and try again.",
      }),
    });
  }
  const progress = checkMajorProgress(major, userCourses);
  res.render("result.ejs", {
    title: "Results",
    program: progress.program,
    progress,
    userCourses: userCourses.join(", ")
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
