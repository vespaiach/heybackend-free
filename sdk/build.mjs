import { mkdirSync } from "node:fs";
import { build } from "esbuild";

mkdirSync("sdk/dist", { recursive: true });

await build({
  entryPoints: ["sdk/src/index.ts"],
  bundle: true,
  format: "iife",
  globalName: "__HB",
  minify: true,
  sourcemap: false,
  target: ["es2020"],
  outfile: "sdk/dist/hb.min.js",
});

console.log("SDK built → sdk/dist/hb.min.js");
