import { copyFileSync, mkdirSync } from "node:fs"
import { dirname, join, relative } from "node:path"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
import {
	fromCwd,
	fromHere,
	readFile,
	readPackageJson,
	rmRf,
	shell,
	walkPaths,
	writeFile
} from "../fs/index.ts"
import { bundle } from "./bundle.ts"
import { dtsGen } from "./dtsGen.ts"
import { jsDocGen } from "./jsdocGen.ts"
import { packagesByScope, type PackageScope } from "./shared.ts"

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

const dtsScopes: PackageScope[] = ["util", "schema", "regex", "type"]

const copyDtsTree = (
	fromDir: string,
	toDir: string,
	skip?: (relPath: string) => boolean
) => {
	for (const file of walkPaths(fromDir, {
		include: path => path.endsWith(".d.ts")
	})) {
		const rel = relative(fromDir, file).replace(/\\/g, "/")
		if (skip?.(rel)) continue
		const dest = join(toDir, rel)
		mkdirSync(dirname(dest), { recursive: true })
		copyFileSync(file, dest)
	}
}

const schemaSubpaths: Record<string, string> = {
	codecs: "codecs.js",
	config: "config.js",
	errors: "errors.js",
	i18n: "i18n.js",
	mutatesInput: "mutatesInput.js",
	runtime: "runtime.js",
	"runtime/none": "runtimeNone.js",
	"runtime/lean": "runtimeLean.js",
	"runtime/none-lean": "runtimeNoneLean.js",
	issueFeatures: "shared/issueFeatures.js",
	internal: "internal.js"
}

const resolveInlinedDtsTarget = (
	specifier: string,
	targets: Partial<Record<PackageScope, string>>
): string | undefined => {
	const subTarget = (scope: PackageScope, sub: string): string | undefined => {
		const base = targets[scope]
		if (!base) return undefined
		if (!sub) return join(base, "index.js")
		if (scope === "schema" && sub in schemaSubpaths)
			return join(base, schemaSubpaths[sub])
		if (sub === "internal") return join(base, "internal.js")
		if (sub.startsWith("internal/"))
			return join(base, sub.slice("internal/".length).replace(/\.ts$/, ".js"))
		return undefined
	}
	if (specifier === "@ark/util") return subTarget("util", "")
	if (specifier.startsWith("@ark/util/"))
		return subTarget("util", specifier.slice("@ark/util/".length))
	if (specifier === "@ark/schema") return subTarget("schema", "")
	if (specifier.startsWith("@ark/schema/"))
		return subTarget("schema", specifier.slice("@ark/schema/".length))
	if (specifier === "arksets") return subTarget("sets", "")
	if (specifier.startsWith("arksets/"))
		return subTarget("sets", specifier.slice("arksets/".length))
	if (specifier === "arkregex") return subTarget("regex", "")
	if (specifier.startsWith("arkregex/"))
		return subTarget("regex", specifier.slice("arkregex/".length))
	if (specifier === "arktype/schema/runtime")
		return subTarget("schema", "runtime")
	if (specifier === "./_util/index.js") return subTarget("util", "")
	return undefined
}

const rewriteDtsSpecifiers = (
	rootDir: string,
	targets: Partial<Record<PackageScope, string>>
) => {
	for (const file of walkPaths(rootDir, {
		include: path => path.endsWith(".d.ts")
	})) {
		const original = readFile(file)
		const replaceSpecifier = (specifier: string) => {
			const target = resolveInlinedDtsTarget(specifier, targets)
			if (!target) return specifier
			const rel = relative(dirname(file), target).replace(/\\/g, "/")
			return rel.startsWith(".") ? rel : `./${rel}`
		}
		const rewritten = original
			.replace(
				/(\bfrom\s+)(["'])([^"']+)\2/g,
				(_, prefix, quote, specifier) =>
					`${prefix}${quote}${replaceSpecifier(specifier)}${quote}`
			)
			.replace(
				/(\bimport\s*\(\s*)(["'])([^"']+)\2(\s*\))/g,
				(_, prefix, quote, specifier, suffix) =>
					`${prefix}${quote}${replaceSpecifier(specifier)}${quote}${suffix}`
			)
		if (rewritten !== original) writeFile(file, rewritten)
	}
}

const inlineDeclarations = () => {
	if (packageName === "arkregex") {
		const utilDest = join(outDir, "_util")
		copyDtsTree(join(packagesByScope.util.path, "out"), utilDest)
		rewriteDtsSpecifiers(outDir, { util: utilDest })
	} else if (packageName === "arktype") {
		const internalDir = join(outDir, "_internal")
		const targets: Partial<Record<PackageScope, string>> = {}
		for (const scope of ["util", "schema", "sets", "regex"] as const) {
			const dest = join(internalDir, scope)
			targets[scope] = dest
			copyDtsTree(
				join(packagesByScope[scope].path, "out"),
				dest,
				scope === "regex" ? rel => rel.startsWith("_util/") : undefined
			)
		}
		// ship issueFeatures.js/d.ts directly under out/shared/ for bundler constant folding
		const sharedDir = join(outDir, "shared")
		mkdirSync(sharedDir, { recursive: true })
		const schemaShared = join(packagesByScope.schema.path, "out", "shared")
		copyFileSync(
			join(schemaShared, "issueFeatures.js"),
			join(sharedDir, "issueFeatures.js")
		)
		copyFileSync(
			join(schemaShared, "issueFeatures.d.ts"),
			join(sharedDir, "issueFeatures.d.ts")
		)
		rewriteDtsSpecifiers(outDir, targets)
	}
}

try {
	if (packageName === "arktype") checkVersionExport()
	rmRf(outDir)
	rmRf("tsconfig.build.json")
	copyFileSync("../repo/tsconfig.esm.json", "tsconfig.build.json")
	buildCurrentProject()
	rmRf("tsconfig.build.json")
	copyFileSync(`../repo/tsconfig.dts.json`, "tsconfig.build.json")
	buildCurrentProject()
	inlineDeclarations()
	if (packageName === "arktype" || packageName === "arkregex") await bundle()
	if (packageName === "arktype") {
		jsDocGen()
		dtsGen()
	} else if (
		dtsScopes.some(scope => packagesByScope[scope].name === packageName)
	)
		dtsGen()
} finally {
	rmRf("tsconfig.build.json")
}
