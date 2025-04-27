// test.js
// Basic test: Runs the crawler and checks output shape
import { spawn } from 'child_process';

function runCrawler() {
  return new Promise((resolve, reject) => {
    const proc = spawn('node', ['dothething.js'], { env: { ...process.env, LOAD_IMAGES: 'false', CI: 'true' } });
    let output = '';
    let error = '';
    proc.stdout.on('data', (data) => {
      output += data.toString();
    });
    proc.stderr.on('data', (data) => {
      error += data.toString();
    });
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Crawler exited with code ${code}: ${error}`));
      } else {
        resolve(output);
      }
    });
  });
}

(async () => {
  try {
    const output = await runCrawler();
    let deals;
    const jsonPrefix = '__JSON__';
    const idx = output.lastIndexOf(jsonPrefix);
    if (idx !== -1) {
      // Extract JSON after the last __JSON__ prefix
      let jsonStr = output.slice(idx + jsonPrefix.length).trim();
      // Find the substring that is a valid JSON array (from first '[' to last ']')
      const firstBracket = jsonStr.indexOf('[');
      const lastBracket = jsonStr.lastIndexOf(']');
      if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
        jsonStr = jsonStr.slice(firstBracket, lastBracket + 1);
      }
      deals = JSON.parse(jsonStr);
    } else {
      // Fallback: try previous regex
      const jsonMatch = output.match(/\[\s*{[\s\S]*?}\s*\]/);
      if (!jsonMatch) {
        throw new Error('No JSON array found in output');
      }
      deals = JSON.parse(jsonMatch[0]);
    }
    if (!Array.isArray(deals) || deals.length === 0) {
      throw new Error('Output JSON is not a non-empty array');
    }
    for (const deal of deals) {
      if (!deal.title || !deal.link || !deal.isbn) {
        throw new Error('Deal missing required fields');
      }
    }
    console.log('TEST PASS');
    process.exit(0);
  } catch (err) {
    console.error('TEST FAIL:', err.message);
    process.exit(1);
  }
})();
