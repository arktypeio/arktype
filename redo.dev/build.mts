import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { dirName, fromHere, shell } from "@re-/node"

const DIST_DIR = fromHere("dist")
const GH_PAGES_DIR = fromHere("..", "docs")
const OUT_DIR = process.argv.includes("--dry-run") ? DIST_DIR : GH_PAGES_DIR
const redoDevDir = dirName()

rmSync(OUT_DIR, { recursive: true, force: true })
shell("pnpm install --ignore-workspace", { cwd: redoDevDir })
shell(`pnpm run typecheck`, {
    cwd: redoDevDir
})
shell(`pnpm docusaurus build --out-dir ${OUT_DIR}`, {
    cwd: redoDevDir
})
writeFileSync(join(OUT_DIR, "CNAME"), "redo.dev")
