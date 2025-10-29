import { copyFileSync } from "node:fs"
import { join } from "node:path"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	fromHere,
	readPackageJson,
	rmRf,
	shell,
	writeJson
} from "../fs/index.ts"
import { dtsGen } from "./dtsGen.ts"
import { jsDocGen } from "./jsdocGen.ts"
import { packagesByScope } from "./shared.ts"

const buildKind =
	process.argv.includes("--cjs") || process.env.ARKTYPE_CJS ? "cjs" : "esm"
const outDir = fromCwd("out")
const packageName = readPackageJson(process.cwd()).name

const buildCurrentProject = () =>
	shell("node", [
		fromHere("node_modules", "typescript", "lib", "tsc.js"),
		"--project",
		"tsconfig.build.json"
	])

try {
	rmRf(outDir)
	rmRf("tsconfig.build.json")
	copyFileSync(`../repo/tsconfig.${buildKind}.json`, "tsconfig.build.json")
	buildCurrentProject()
	rmRf("tsconfig.build.json")
	copyFileSync(`../repo/tsconfig.dts.json`, "tsconfig.build.json")
	buildCurrentProject()
	if (buildKind === "cjs")
		writeJson(join(outDir, "package.json"), { type: "commonjs" })
	if (packageName === "arktype") {
		jsDocGen()
		dtsGen()
	} else if (packageName in packagesByScope.type.json.dependencies!) dtsGen()
} finally {
	rmRf("tsconfig.build.json")
}
