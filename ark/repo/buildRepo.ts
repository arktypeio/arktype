import { shell } from "@ark/fs"
import { jsdocGen } from "./jsdocGen.ts"
import { repoDirs } from "./shared.ts"

shell(`pnpm rmBuild && pnpm -r build`, { cwd: repoDirs.root })

jsdocGen()
