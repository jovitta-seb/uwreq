import fs from 'fs';
import path from 'path';
import csv from 'csv-parser';
import { fileURLToPath } from 'url';

// __dirname workaround in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, 'course offerings.csv');
const outputPath = path.join(__dirname, 'courses.json');

const results = [];

fs.createReadStream(inputPath, { encoding: 'utf8' })
  .pipe(csv())
  .on('data', (row) => {
    const code = row.code?.trim() || row['Course code']?.trim();
    const title = row.title?.trim() || row['Course title']?.trim();
    if (code && title) results.push({ code, title });
  })
  .on('end', () => {
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`✅ Converted ${results.length} courses`);
  })
  .on('error', (err) => console.error('❌ Error reading CSV:', err));
