import { throwError } from "arktype/util"
import { createRequire } from "node:module"
import ts from "typescript"
import { getConfig, type Checker } from "./config.ts"
import { isTs7 } from "./utils.ts"

// resolved relative to attest so the API matches the installed typescript
const requireTypeScript = createRequire(import.meta.url)

const isResolvable = (require: NodeJS.Require, specifier: string) => {
	try {
		require.resolve(specifier)
		return true
	} catch {
		return false
	}
}

// tsrs's binary ships in a per-platform optional dependency, so it installs
// without one on unsupported platforms like Windows
const hasTsrsBinary = () => {
	if (!isResolvable(requireTypeScript, "tsrs/package.json")) return false
	if (process.env.TSRS_BINARY) return true
	const packagePath = requireTypeScript.resolve("tsrs/package.json")
	const requireTsrs = createRequire(packagePath)
	const { optionalDependencies = {} } = requireTsrs(packagePath)
	return Object.keys(optionalDependencies).some(name =>
		isResolvable(requireTsrs, `${name}/package.json`)
	)
}

/** the checker from attest's config, or the best one installed */
export const getChecker = (): Checker => {
	const { checker } = getConfig()
	if (checker === undefined) {
		return (
			!isTs7 ? "tsjs"
			: hasTsrsBinary() ? "tsrs"
			: "tsgo"
		)
	}
	if (checker !== "tsjs" && checker !== "tsgo" && checker !== "tsrs")
		throwError(`checker must be "tsjs", "tsgo" or "tsrs" (was "${checker}")`)
	if ((checker === "tsjs") === isTs7) {
		throwError(
			`checker "${checker}" requires TypeScript ${checker === "tsjs" ? "<7" : "7+"} (found ${ts.version})`
		)
	}
	return checker
}
