// scripts/utils/buildPrereqGraph.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { normalizeCourseKey } from "./normalize.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PREREQS_PATH = path.join(__dirname, "../../backend/course-data/prereqs.json");

function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}

export function buildPrereqGraph() {
  const data = readJSONSafe(PREREQS_PATH);

  const graph = {}; // adjacency list
  for (const [rawCode, entry] of Object.entries(data)) {
    const code = normalizeCourseKey(rawCode);
    const prereqs = (entry.prereq_codes || []).map(normalizeCourseKey);
    graph[code] = prereqs;
  }

  return graph;
}

// CLI for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  const g = buildPrereqGraph();
  console.log("Graph has", Object.keys(g).length, "courses.");
  console.log("Example:", g["MATH237"]);
}
