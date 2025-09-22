// scripts/utils/checkBreadth.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- locate breadth.json robustly ----
function resolveBreadthPath() {
  const candidates = [
    "../../backend/requirements/breadth.json",
    "../backend/requirements/breadth.json",
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

// ---- explicit COMM List I exclusions ----
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
  const m = code.toUpperCase().match(/^([A-Z]{2,8})\s*0*([0-9]{2,3}[A-Z]?)$/);
  if (!m) return code.toUpperCase().trim();
  return `${m[1]} ${m[2]}`;
}

function getSubject(code) {
  return normalizeCode(code).split(" ")[0];
}

// ---- core breadth check logic ----
export function checkBreadth(studentCourses, { debug = false } = {}) {
  const breadth = readJSONSafe(BREADTH_PATH);

  if (debug) {
    console.log(`[debug] breadth loaded from: ${BREADTH_PATH}`);
  }

  const HUMANITIES = new Set(breadth.humanities || []);
  const SOCIAL = new Set(breadth.social_sciences || []);
  const PURE = new Set(breadth.pure_sciences || []);
  const APPLIED = new Set(breadth.applied_sciences || []);
  const EXCLUDED = new Set(breadth.excluded_subjects || []);

  // Normalize and filter
  const normalized = [];
  for (const raw of studentCourses) {
    const code = normalizeCode(raw);
    const subj = getSubject(code);
    if (EXCLUDED.has(subj)) {
      if (debug) console.log(`[debug] skipping ${code} (excluded subject)`);
      continue;
    }
    if (LIST1_EXCLUSIONS.has(code)) {
      if (debug) console.log(`[debug] skipping ${code} (Comm List I exclusion)`);
      continue;
    }
    normalized.push(code);
  }

  // Track usage by category
  const categories = {
    humanities: { needed: 2, units: 1.0, taken: [], met: false },
    social_sciences: { needed: 2, units: 1.0, taken: [], met: false },
    pure_sciences: { needed: 1, units: 0.5, taken: [], met: false },
    applied_sciences: { needed: 1, units: 0.5, taken: [], met: false },
  };

  // Special overlap handling for PURE vs APPLIED
  const overlap = [];

  for (const code of normalized) {
    const subj = getSubject(code);

    if (HUMANITIES.has(subj)) categories.humanities.taken.push(code);
    if (SOCIAL.has(subj)) categories.social_sciences.taken.push(code);

    if (PURE.has(subj) && APPLIED.has(subj)) {
      overlap.push(code);
    } else {
      if (PURE.has(subj)) categories.pure_sciences.taken.push(code);
      if (APPLIED.has(subj)) categories.applied_sciences.taken.push(code);
    }
  }

  // Distribute overlap courses
  if (overlap.length) {
    for (const code of overlap) {
      if (categories.pure_sciences.taken.length < categories.pure_sciences.needed) {
        categories.pure_sciences.taken.push(code);
      } else if (categories.applied_sciences.taken.length < categories.applied_sciences.needed) {
        categories.applied_sciences.taken.push(code);
      } else {
        categories.applied_sciences.taken.push(code);
      }
    }
  }

  // Check if each requirement met + build progress strings
  let overall = true;
  for (const [cat, obj] of Object.entries(categories)) {
    obj.met = obj.taken.length >= obj.needed;
    if (!obj.met) overall = false;
    obj.remaining = Math.max(0, obj.needed - obj.taken.length);
    obj.progress = `${obj.taken.length}/${obj.needed}`;
    obj.status = obj.met
      ? `${cat} satisfied (${obj.progress})`
      : `${cat} in progress (${obj.progress}, need ${obj.remaining} more)`;
  }

  // Build description with statuses
  const description = Object.entries(categories)
    .map(([_, obj]) => obj.status)
    .join(" | ");

  return { ok: overall, description, categories };
}

// ---- CLI usage ----
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const debug = args.includes("--debug");
  const arg = args.find((a) => a !== "--debug");
  if (!arg) {
    console.error('Usage: node scripts/utils/checkBreadth.js [--debug] "ECON 101,PHYS 121,PHYS 122,ENGL 210E,PHIL 145"');
    process.exit(1);
  }
  const courses = arg.split(",").map((c) => c.trim());
  const result = checkBreadth(courses, { debug });
  console.log(JSON.stringify(result, null, 2));
}
