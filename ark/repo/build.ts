import { fromCwd, rmRf, shell, writeJson } from "@ark/fs"
import { symlinkSync, unlinkSync } from "fs"
import { join } from "path"

const isCjs = process.argv.includes("--cjs") || process.env.ARKTYPE_CJS
const outDir = fromCwd("out")

rmRf(outDir)

try {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync(`../repo/tsconfig.cjs.json`, "tsconfig.build.json")
	}
	shell("pnpm tsc --project tsconfig.build.json")
	if (isCjs) writeJson(join(outDir, "package.json"), { type: "commonjs" })
} finally {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync("../repo/tsconfig.esm.json", "tsconfig.build.json")
	}
}
