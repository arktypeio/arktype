import { symlinkSync } from "fs"
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

const buildKind =
	process.argv.includes("--cjs") || process.env.ARKTYPE_CJS ? "cjs" : "esm"
const outDir = fromCwd("out")

const buildCurrentProject = () =>
	shell("pnpm tsc --project tsconfig.build.json")

try {
	rmRf(outDir)
	rmRf("tsconfig.build.json")
	symlinkSync(`../repo/tsconfig.${buildKind}.json`, "tsconfig.build.json")
	buildCurrentProject()
	walkPaths(outDir, { excludeDirs: true }).forEach(jsPath =>
		rewriteFile(jsPath, src => src.replaceAll('.ts"', '.js"'))
	)
	rmRf("tsconfig.build.json")
	symlinkSync(`../repo/tsconfig.dts.json`, "tsconfig.build.json")
	buildCurrentProject()
	if (buildKind === "cjs")
		writeJson(join(outDir, "package.json"), { type: "commonjs" })
} finally {
	rmRf("tsconfig.build.json")
}
