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
		symlinkSync(`../repo/tsconfig.cjs.json`, "tsconfig.js.json")
	}
	shell("pnpm tsc --project tsconfig.js.json")
	walkPaths(outDir).forEach(jsPath =>
		rewriteFile(jsPath, src => src.replaceAll('.ts"', '.ts"'))
	)
	shell("pnpm tsc --project tsconfig.dts.json")
	if (isCjs) writeJson(join(outDir, "package.json"), { type: "commonjs" })
} finally {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync("../repo/tsconfig.esm.json", "tsconfig.js.json")
	}
}
