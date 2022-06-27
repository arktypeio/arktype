import { rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fromHere, shell } from "@re-/node"

const OUT_DIR = fromHere("dist")
const shouldPublish = process.argv.includes("--publish")

rmSync(OUT_DIR, { recursive: true, force: true })
if (shouldPublish) {
    shell("git worktree add dist gh-pages")
}
shell("pnpm run typecheck")
shell(`pnpm docusaurus build --out-dir ${OUT_DIR}`)
writeFileSync(join(OUT_DIR, "CNAME"), "redo.dev")
if (shouldPublish) {
    shell(`git config --global user.name "GitHub Actions Bot"`)
    shell(`git config --global user.email "<>"`)
    shell("git add --all", { cwd: OUT_DIR })
    shell(`git commit -m "chore: publish to https://redo.dev"`, {
        cwd: OUT_DIR
    })
    shell("git push origin gh-pages", { cwd: OUT_DIR })
}
