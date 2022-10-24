import { execSync } from "node:child_process"
import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

const OUT_DIR = "dist"

const shell = (cmd: string) =>
    execSync(cmd, { env: process.env, stdio: "inherit" })

rmSync(OUT_DIR, { recursive: true, force: true })
shell("pnpm run typecheck")
shell(`pnpm docusaurus build --out-dir ${OUT_DIR}`)
writeFileSync(join(OUT_DIR, "CNAME"), "arktype.io")
