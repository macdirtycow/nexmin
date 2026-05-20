#!/usr/bin/env node
import bcrypt from "bcryptjs";

const pass = process.argv[2];
if (!pass) {
  console.error("Usage: node scripts/hash-password.mjs <password>");
  process.exit(1);
}

const hash = await bcrypt.hash(pass, 10);
console.log(hash);
