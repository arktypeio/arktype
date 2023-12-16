import { findPackageRoot, readJson } from "@arktype/fs"
import { map, type Digit } from "@arktype/util"
import { existsSync, renameSync, symlinkSync, unlinkSync } from "fs"
import { join } from "path/posix"
import ts from "typescript"

export type AttestTypeScriptVersionOptions = {
	/** The list of directories containing TypeScript versions.
	 * Defaults to versions in node_modules prefixed with `attest-ts`,
	 * which can be specified like "attest-ts50": "npm:typescript@5.0"
	 *
	 * This supercedes the version discovery process and specified aliases.
	 */
	directories?: string[]
	/** A list of aliases to run. By default all discovered versions will be run.
	 * 		- The version under "typescript" should be specified as "default"
	 * 		- Alternate versions beginning with `attest-ts` should be specified with their suffixes.
	 * 		  For example, a version installed as "attest-ts50" would be "50"
	 */
	aliases?: string[]
}

/**
 * Executes a provided function for each installed TypeScript version as
 * specified in package.json under "typescript" or with a prefix "attest-ts",
 * which can be specified as follows:
 *
 * ```json
 * "attest-ts50": "npm:typescript@5.0"
 * ```
 *
 * Your primary TypeScript version at node_modules/typescript will be
 * temporarily renamed to node_modules/typescript-temp, and reset after each
 * version has been executed, regardless of failures.
 *
 * Throws an error if any version fails during test execution.
 * @param {function} fn - The function to execute for each TypeScript version.
 * It should accept a version string as its only argument.
 * @param {AttestTypeScriptVersionOptions} [opts]
 */
export const forEachTypeScriptVersion = (
	fn: (version: string) => void,
	opts?: AttestTypeScriptVersionOptions
) => {
	let tsDirs = opts?.directories
	if (!tsDirs) {
		const versions = findAttestTypeScriptVersions()
		if (opts?.aliases) {
			tsDirs = opts.aliases.map((alias) => {
				if (!versions[alias]) {
					throw new Error(
						`Specified TypeScript version alias ${alias} does not exist.` +
							` It should probably be specified in package.json like:
	"attest-ts${alias}": "npm:typescript@5.0"`
					)
				}
				return versions[alias]
			})
		} else {
			tsDirs = Object.values(versions)
		}
	}
	const passedVersions: string[] = []
	const failedVersions: string[] = []
	const nodeModules = join(findPackageRoot(process.cwd()), "node_modules")
	const tsPrimaryPath = join(nodeModules, "typescript")
	const tsTemporaryPath = join(nodeModules, "typescript-temp")
	let originalTsVersion: string | undefined
	if (existsSync(tsPrimaryPath)) {
		originalTsVersion = readJson(join(tsPrimaryPath, "package.json")).version
		renameSync(tsPrimaryPath, tsTemporaryPath)
	}
	for (const path of tsDirs) {
		const tsPackageJson = readJson(join(path, "package.json"))
		if (tsPackageJson.name !== "typescript") {
			throw new Error(`Expected to find a TypeScript version at ${path}`)
		}
		const version: string = tsPackageJson.version
		console.log(`⛵ Switching to TypeScript version ${version}...`)
		try {
			if (existsSync(tsPrimaryPath)) {
				unlinkSync(tsPrimaryPath)
			}
			symlinkSync(path, tsPrimaryPath)
			fn(version)
			passedVersions.push(version)
		} catch {
			failedVersions.push(version)
		}
	}
	if (originalTsVersion) {
		console.log(
			`⏮️ Restoring original TypeScript version ${originalTsVersion}...`
		)
		renameSync(tsTemporaryPath, tsPrimaryPath)
	}

	if (failedVersions.length !== 0) {
		throw new Error(
			`❌ The following TypeScript versions threw: ${failedVersions.join(", ")}`
		)
	}
	console.log(
		`✅ Successfully ran TypeScript versions ${passedVersions.join(", ")}`
	)
}

/**
 * Find and return the paths of all installed TypeScript versions, including the
 * primary version installed as "typescript" and all dependencies begininng with
 * "attest-ts".
 *
 * Alternate versions can be installed using a package.json dependency like:
 *
 * ```json
 * "attest-ts50": "npm:typescript@5.0"
 * ```
 * @returns An object where the keys are:
 *
 *      - suffixes of dependencies beginning with "attest-ts", e.g. "50" for "attest-ts50"
 *      - "default" for the version installed as "typescript", if one exists
 *
 *      The corresponding values are the resolved paths corresponding to those TypeScript versions.
 * @throws {Error} If a TypeScript version specified in package.json is not
 * installed at the expected location in node_modules.
 */
export const findAttestTypeScriptVersions = (): Record<string, string> => {
	const root = findPackageRoot(process.cwd())
	const packageJson = readJson(join(root, "package.json"))
	const nodeModules = join(root, "node_modules")
	return map(
		{ ...packageJson.dependencies, ...packageJson.devDependencies },
		(name: string) => {
			if (name !== "typescript" && !name.startsWith("attest-ts")) {
				return []
			}
			const expectedLocation = join(nodeModules, name)
			if (!existsSync(expectedLocation)) {
				throw Error(
					`TypeScript version ${name} specified in package.json must be installed at ${expectedLocation} `
				)
			}
			return [name === "typescript" ? "default" : name, expectedLocation]
		}
	)
}

/** Get the TypeScript version being used by attest as as string like "5.0" */
export const getTsVersionUnderTest = (): `${Digit}.${Digit}` =>
	ts.versionMajorMinor
