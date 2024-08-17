import { symlinkSync, unlinkSync } from "fs"
import { join } from "path"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	rewriteFile,
	rmRf,
	shell,
	walkPaths,
	writeJson
} from "../fs/index.ts"

const isCjs = process.argv.includes("--cjs") || process.env.ARKTYPE_CJS
const outDir = fromCwd("out")

rmRf(outDir)

try {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync(`../repo/tsconfig.cjs.json`, "tsconfig.build.json")
	}
	shell("pnpm tsc --project tsconfig.build.json")
	walkPaths(outDir, { include: path => path.endsWith("js") }).forEach(jsPath =>
		rewriteFile(jsPath, src => src.replaceAll('.ts"', '.ts"'))
	)
	if (isCjs) writeJson(join(outDir, "package.json"), { type: "commonjs" })
} finally {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync("../repo/tsconfig.esm.json", "tsconfig.build.json")
	}
}
