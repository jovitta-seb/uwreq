// scripts/scraper/scrape-all.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { chromium } from "playwright";
import { scrapeOneCourse } from "./scrape-one.js"; // reuse your single-course scraper

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LINKS_PATH = path.join(__dirname, "../../backend/course-data/course-links.json");
const OUT_PATH = path.join(__dirname, "../../backend/course-data/prereqs.json");

// read JSON safely
function readJSONSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf-8"));
  } catch {
    return {};
  }
}
function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

async function scrapeAll() {
  const links = readJSONSafe(LINKS_PATH);
  const existing = readJSONSafe(OUT_PATH);
  const codes = Object.keys(links);

  console.log(`Found ${codes.length} courses in course-links.json`);
  console.log(`${Object.keys(existing).length} already scraped in prereqs.json`);

  // launch one browser for efficiency
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: "OnTrackScraper/1.0 (+edu noncommercial)",
  });
  const page = await context.newPage();

  for (let i = 0; i < codes.length; i++) {
    const code = codes[i];
    if (existing[code]) {
      continue; // skip if already scraped
    }

    const url = links[code];
    console.log(`[${i + 1}/${codes.length}] Scraping ${code} …`);

    try {
      const entry = await scrapeOneCourse(url, page); // pass existing page
      existing[entry.code] = {
        prereq_text: entry.prereq_text,
        prereq_codes: entry.prereq_codes,
        scraped_at: entry.scraped_at,
        source: entry.source,
      };

      // save progress every 10 courses
      if (i % 10 === 0) {
        writeJSON(OUT_PATH, existing);
        console.log(`  … checkpoint saved (${i} done)`);
      }
    } catch (e) {
      console.warn(`  !! failed ${code}: ${e.message}`);
    }

    // polite delay
    await page.waitForTimeout(300);
  }

  await browser.close();

  // final save
  writeJSON(OUT_PATH, existing);
  console.log(`✅ Finished! Saved ${Object.keys(existing).length} courses → ${OUT_PATH}`);
}

scrapeAll();
