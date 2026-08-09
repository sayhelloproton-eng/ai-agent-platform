#!/usr/bin/env -S node --import tsx
import { main } from "./src/cli/main.js";

await main(process.argv.slice(2));
