import { copyFileSync } from "fs"
import { join } from "path"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	fromHere,
	rewriteFile,
	rmRf,
	shell,
	walkPaths,
	writeJson
} from "../fs/index.ts"

const buildKind =
	process.argv.includes("--cjs") || process.env.ARKTYPE_CJS ? "cjs" : "esm"
const outDir = fromCwd("out")

const buildCurrentProject = () =>
	shell(
		`node ${fromHere("node_modules", "typescript", "lib", "tsc.js")} --project tsconfig.build.json`
	)

try {
	rmRf(outDir)
	rmRf("tsconfig.build.json")
	copyFileSync(`../repo/tsconfig.${buildKind}.json`, "tsconfig.build.json")
	buildCurrentProject()
	walkPaths(outDir, { excludeDirs: true }).forEach(jsPath =>
		rewriteFile(jsPath, src =>
			src.replaceAll(
				/(import|export\s+.*?from\s+["'])(.*?\.ts)(["'])/g,
				(match, p1, p2, p3) => `${p1}${p2.replace(".ts", ".js")}${p3}`
			)
		)
	)
	rmRf("tsconfig.build.json")
	copyFileSync(`../repo/tsconfig.dts.json`, "tsconfig.build.json")
	buildCurrentProject()
	if (buildKind === "cjs")
		writeJson(join(outDir, "package.json"), { type: "commonjs" })
} finally {
	rmRf("tsconfig.build.json")
}
