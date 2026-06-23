// @ts-check

// This repo contains no TypeScript syntax that requires *transformation*
// (no runtime enums, parameter properties, or value-bearing namespaces — only
// erasable `declare`/type-level forms), so native type *stripping* is
// sufficient. That lets us avoid `--experimental-transform-types`, which Node
// >= 26 rejects in NODE_OPTIONS.

/** @param {number} major @param {number} minor @returns {boolean} */
function stripsTypesByDefault(major, minor) {
	// type stripping became the default (no flag) in 23.6.0, backported to 22.18.0
	return (
		major >= 24 || (major === 23 && minor >= 6) || (major === 22 && minor >= 18)
	)
}

/** @param {number} major @param {number} minor @returns {boolean} */
function stripsTypesBehindFlag(major, minor) {
	// 22.6–22.17 and 23.0–23.5 can strip types, but only behind a flag
	return (major === 22 && minor >= 6) || (major === 23 && minor < 6)
}

/**
 * @param {number} major
 * @param {number} minor
 * @returns {string}
 */
function versionedFlagsFor(major, minor) {
	if (stripsTypesByDefault(major, minor)) return ""

	if (stripsTypesBehindFlag(major, minor))
		return "--experimental-strip-types --no-warnings"

	console.log(
		"native TypeScript support requires Node >= 22.6.0, falling back to tsx..."
	)
	return "--import tsx"
}

const [major, minor] = process.version.replace("v", "").split(".").map(Number)

const versionedFlags = versionedFlagsFor(major, minor)

export const nodeDevOptions =
	`${process.env.NODE_OPTIONS ?? ""} --conditions ark-ts ${versionedFlags}`.trimEnd()

export const addNodeDevOptions = extraOpts =>
	(process.env.NODE_OPTIONS = `${nodeDevOptions} ${extraOpts ?? ""}`.trimEnd())
