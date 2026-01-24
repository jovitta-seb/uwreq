// scripts/utils/checkDepth.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- locate prereqs.json robustly ----
function resolvePrereqPath() {
  const candidates = [
    "../../backend/course-data/prereqs.json",   // scripts/utils -> backend/…
    "../backend/course-data/prereqs.json",      // utils -> backend/…
    "../../../backend/course-data/prereqs.json",
    "./backend/course-data/prereqs.json",
  ];
  for (const rel of candidates) {
    const p = path.join(__dirname, rel);
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, "../../backend/course-data/prereqs.json");
}
const PREREQ_PATH = resolvePrereqPath();

// ---- locate breadth.json robustly ----
function resolveBreadthPath() {
  const candidates = [
    "../../backend/requirements/breadth.json",  // scripts/utils -> backend/…
    "../backend/requirements/breadth.json",     // utils -> backend/…
    "../../../backend/requirements/breadth.json",
    "./backend/requirements/breadth.json",
  ];
  for (const rel of candidates) {
    const p = path.join(__dirname, rel);
    if (fs.existsSync(p)) return p;
  }
  return path.join(__dirname, "../../backend/requirements/breadth.json");
}
const BREADTH_PATH = resolveBreadthPath();

// ---- explicit exclusions (COMMST List I, etc.) ----
const LIST1_EXCLUSIONS = new Set([
  "COMMST 100",
  "COMMST 223",
  "ENGL 109",
  "ENGL 129R",
  "EMLS 129R",
  "EMLS 101R",
  "EMLS 102R",
]);

// ---- helpers ----
function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

function normalizeCode(code) {
  if (!code) return "";
  const s = code.toUpperCase().trim();
  const m = s.match(/^([A-Z]{2,10})\s*0*([0-9]{2,3}[A-Z]{0,2})$/);
  if (!m) return s;
  return `${m[1]} ${m[2]}`;
}
function getSubject(code) {
  return normalizeCode(code).split(" ")[0];
}
function getLevel(code) {
  const m = normalizeCode(code).match(/\d+/);
  return m ? parseInt(m[0], 10) : 0;
}

// ---- depth check logic ----
export function checkDepth(studentCourses, { debug = false } = {}) {
  const prereqs = readJSONSafe(PREREQ_PATH);

  // load breadth categories and compute eligible subject set (union)
  const breadth = readJSONSafe(BREADTH_PATH);
  const ELIGIBLE = new Set([
    ...(breadth.humanities || []),
    ...(breadth.social_sciences || []),
    ...(breadth.pure_sciences || []),
    ...(breadth.applied_sciences || []),
  ]);
  const EXCLUDED = new Set(breadth.excluded_subjects || []);

  if (debug) {
    console.log(`[debug] prereqs: ${Object.keys(prereqs).length}`);
    console.log(`[debug] breadth loaded from: ${BREADTH_PATH}`);
    console.log(`[debug] eligible subjects: ${ELIGIBLE.size}`);
    console.log(`[debug] excluded subjects: ${EXCLUDED.size}`);
  }

  // normalize student courses and drop excluded ones
  const taken = new Set();
  for (const raw of studentCourses) {
    const code = normalizeCode(raw);
    const subj = getSubject(code);

    if (LIST1_EXCLUSIONS.has(code)) {
      if (debug) console.log(`[debug] skipping ${code} (COMMST/ENGL/EMLS List I exclusion)`);
      continue;
    }
    if (EXCLUDED.has(subj)) {
      if (debug) console.log(`[debug] skipping ${code} (subject ${subj} is excluded in breadth.json)`);
      continue;
    }
    taken.add(code);
  }

  // group by subject
  const bySubject = {};
  for (const code of taken) {
    const subj = getSubject(code);
    if (!bySubject[subj]) bySubject[subj] = [];
    bySubject[subj].push(normalizeCode(code));
  }

  // Option 1: 3+ courses, one 300+, restricted to breadth-eligible subjects
  for (const subj of Object.keys(bySubject)) {
    if (!ELIGIBLE.has(subj)) {
      if (debug) console.log(`[debug] skipping subject ${subj} (not breadth-eligible)`);
      continue;
    }
    const courses = bySubject[subj];
    if (courses.length >= 3 && courses.some((c) => getLevel(c) >= 300)) {
      return {
        ok: true,
        option: 1,
        subject: subj,
        courses,
      };
    }
  }

  // Option 2: prerequisite chain of length 3, restricted to breadth-eligible subjects
  for (const subj of Object.keys(bySubject)) {
    if (!ELIGIBLE.has(subj)) {
      if (debug) console.log(`[debug] skipping subject ${subj} (not breadth-eligible)`);
      continue;
    }
    const courses = bySubject[subj];
    const courseSet = new Set(courses.map(normalizeCode));

    function dfs(code, path) {
      if (path.length === 3) return path;
      const key = normalizeCode(code);
      const entry = prereqs[key];
      if (!entry) return null;

      const list = Array.isArray(entry.prereq_codes) ? entry.prereq_codes : [];
      for (const pre of list) {
        const normPre = normalizeCode(pre);
        if (!courseSet.has(normPre)) continue;
        const result = dfs(normPre, [...path, normPre]);
        if (result) return result;
      }
      return null;
    }

    for (const c of courses) {
      const start = normalizeCode(c);
      const chain = dfs(start, [start]);
      if (chain) {
        return {
          ok: true,
          option: 2,
          subject: subj,
          chain,
        };
      }
    }
  }

  return { ok: false };
}

// ---- CLI usage ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const debug = args.includes("--debug");
  const arg = args.find((a) => a !== "--debug");
  if (!arg) {
    console.error('Usage: node scripts/utils/checkDepth.js [--debug] "MATH 106,MATH 136,MATH 237"');
    process.exit(1);
  }
  const courses = arg.split(",").map((c) => c.trim());
  const result = checkDepth(courses, { debug });
  console.log(JSON.stringify(result, null, 2));
}
