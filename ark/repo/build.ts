import { copyFileSync } from "node:fs"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	fromHere,
	readFile,
	readPackageJson,
	rmRf,
	shell
} from "../fs/index.ts"
import { bundle } from "./bundle.ts"
import { dtsGen } from "./dtsGen.ts"
import { jsDocGen } from "./jsdocGen.ts"
import { packagesByScope } from "./shared.ts"

const outDir = fromCwd("out")
const { name: packageName, version } = readPackageJson(process.cwd())

// precompiled modules import it, so it must name the version being built
const checkVersionExport = () => {
	const expected = `precompiledForArktype_${version.replace(/\W/g, "_")}`
	const declared = readFile(fromCwd("runtime.ts")).match(
		/precompiledForArktype_\w+/g
	)
	if (declared?.length !== 1 || declared[0] !== expected) {
		throw new Error(
			`runtime.ts must export ${expected}, naming package.json's version, in place of ${declared?.join(", ") ?? "nothing"}`
		)
	}
}

const buildCurrentProject = () =>
	shell(
		`node ${fromHere("node_modules", "typescript", "lib", "tsc.js")} --project tsconfig.build.json`
	)

try {
	if (packageName === "arktype") checkVersionExport()
	rmRf(outDir)
	rmRf("tsconfig.build.json")
	copyFileSync("../repo/tsconfig.esm.json", "tsconfig.build.json")
	buildCurrentProject()
	rmRf("tsconfig.build.json")
	copyFileSync(`../repo/tsconfig.dts.json`, "tsconfig.build.json")
	buildCurrentProject()
	if (
		packageName === "arktype" ||
		packageName in packagesByScope.type.json.dependencies!
	)
		bundle()
	if (packageName === "arktype") {
		jsDocGen()
		dtsGen()
	} else if (packageName in packagesByScope.type.json.dependencies!) dtsGen()
} finally {
	rmRf("tsconfig.build.json")
}
