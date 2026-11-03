import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { printablePathOf, throwBuildError } from "./host.ts"
import { writeArktypeHint, writeVersionHint } from "./messages.ts"

// the arktype the precompiler is released with, which `pnpm bump` sets
export const arktypeVersion = "2.2.9"

// a package manager may resolve the arktype @ark/aot peers to a version
// lacking what the precompiler imports, as arktype 2 lacks arktype/codecs, so
// each entry checks it before loading a module that imports arktype
export const checkArktypeVersion = (): void => {
	for (
		let root = dirname(fileURLToPath(import.meta.resolve("arktype")));
		root !== dirname(root);
		root = dirname(root)
	) {
		const path = join(root, "package.json")
		if (!existsSync(path)) continue
		const { name, version, arkAotVersion } = JSON.parse(
			readFileSync(path, "utf8")
		)
		if (name !== "arktype") continue
		if (version === arktypeVersion) return
		throwBuildError(
			`arktype resolves to ${version}, but @ark/aot runs on ${arktypeVersion}\n  ${version} at ${printablePathOf(process.cwd(), root)}, which @ark/aot imports\n  ${arkAotVersion ? writeVersionHint(version, arkAotVersion) : writeArktypeHint(arktypeVersion)}`
		)
	}
}
