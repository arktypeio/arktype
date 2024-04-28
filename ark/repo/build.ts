import { symlinkSync, unlinkSync } from "fs"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import { fromCwd, shell, writeJson } from "../fs/main.js"

const isCjs = process.argv.includes("--cjs") || process.env.ARKTYPE_CJS

try {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync(`../repo/tsconfig.cjs.json`, "tsconfig.build.json")
	}
	shell("pnpm tsc --project tsconfig.build.json")
	if (isCjs) writeJson(fromCwd("out", "package.json"), { type: "commonjs" })
} finally {
	if (isCjs) {
		unlinkSync("tsconfig.build.json")
		symlinkSync("../repo/tsconfig.esm.json", "tsconfig.build.json")
	}
}
