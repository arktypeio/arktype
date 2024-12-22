// @ts-check

const [major, minor] = process.version.replace("v", "").split(".").map(Number)

const versionedFlags =
	major > 22 || (major === 22 && minor >= 7) ?
		"--experimental-transform-types --no-warnings"
	:	(console.log(
			"--experimental-transform-types requires Node >= 22.7.0, falling back to tsx..."
		),
		"--import tsx")

export const nodeDevOptions = `${process.env.NODE_OPTIONS ?? ""} --conditions ark-ts ${versionedFlags}`

/**
 * @param {string} [extraOpts]
 */
export const addNodeDevOptions = extraOpts =>
	(process.env.NODE_OPTIONS = `${nodeDevOptions} ${extraOpts ?? ""}`)
