#!/usr/bin/env node
/** Set zoneFile on one row in data/native-domains.json */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const qadbakDir = process.env.QADBAK_DIR || "/opt/qadbak";
const domain = process.argv[2];
const zoneFile = process.argv[3];
if (!domain || !zoneFile) {
  process.stderr.write("usage: patch-registry-zone.mjs <domain> <zonePath>\n");
  process.exit(1);
}

const reg = path.join(qadbakDir, "data", "native-domains.json");
const rows = JSON.parse(await readFile(reg, "utf8"));
let found = false;
for (const row of rows) {
  if (String(row.name).toLowerCase() === domain.toLowerCase()) {
    row.zoneFile = zoneFile;
    found = true;
  }
}
if (!found) {
  process.stderr.write(`domain not in ${reg}: ${domain}\n`);
  process.exit(1);
}
await writeFile(reg, `${JSON.stringify(rows, null, 2)}\n`, "utf8");
process.stdout.write(`OK — zoneFile for ${domain}\n`);
