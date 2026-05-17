// @ts-check

/** @param {number} major @returns {string} */
function getFallbackReason(major) {
	if (major >= 26) {
		return "Node.js >= 26 does not allow --experimental-transform-types in NODE_OPTIONS; falling back to tsx..."
	}

	return "--experimental-transform-types requires Node >= 22.7.0, falling back to tsx..."
}

/**
 * @param {number} major
 * @param {number} minor
 * @returns {string}
 */
function versionedFlagsFor(major, minor) {
	const useExperimentalTransformTypes =
		(major > 22 && major < 26) || (major === 22 && minor >= 7)
	if (useExperimentalTransformTypes) {
		return "--experimental-transform-types --no-warnings"
	}

	console.log(getFallbackReason(major))
	return "--import tsx"
}

const [major, minor] = process.version.replace("v", "").split(".").map(Number)

const versionedFlags = versionedFlagsFor(major, minor)

export const nodeDevOptions = `${process.env.NODE_OPTIONS ?? ""} --conditions ark-ts ${versionedFlags}`

export const addNodeDevOptions = extraOpts =>
	(process.env.NODE_OPTIONS = `${nodeDevOptions} ${extraOpts ?? ""}`)
