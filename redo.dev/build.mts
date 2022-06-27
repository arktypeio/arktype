import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fromHere, shell } from "@re-/node"

const OUT_DIR = fromHere("dist")

rmSync(OUT_DIR, { recursive: true, force: true })
shell("pnpm run typecheck")
shell(`pnpm docusaurus build --out-dir ${OUT_DIR}`)
writeFileSync(join(OUT_DIR, "CNAME"), "redo.dev")
