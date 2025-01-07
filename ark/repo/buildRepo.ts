import { shell } from "@ark/fs"
import { jsDocgen } from "./jsDocgen.ts"
import { repoDirs } from "./shared.ts"

// shell(`pnpm rmBuild && pnpm -r build`, { cwd: repoDirs.root })

jsDocgen()
