import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { dirName, fromHere, shell } from "@re-/node"

const GH_PAGES_DIR = fromHere("..", "docs")
const redoDevDir = dirName()

rmSync(GH_PAGES_DIR, { recursive: true, force: true })
console.log(JSON.stringify(process.env, null, 4))
shell("pnpm install --ignore-workspace", { cwd: redoDevDir })
shell(`docusaurus build --out-dir ${GH_PAGES_DIR}`, { cwd: redoDevDir })
writeFileSync(join(GH_PAGES_DIR, "CNAME"), "redo.dev")
