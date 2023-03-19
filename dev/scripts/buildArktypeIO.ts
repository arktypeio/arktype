import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { shell } from "../runtime/shell.ts"

rmSync("dist", { recursive: true, force: true })
shell("pnpm run typecheck")
shell(`pnpm docusaurus build --out-dir dist`)
writeFileSync(join("dist", "CNAME"), "arktype.io")
