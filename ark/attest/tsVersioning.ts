import { findPackageRoot, readJson, readPackageJson } from "@arktype/fs"
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
	/** A list of exact versions to run e.g. "5.3.2". By default, all discovered versions will be run.
	 * If a version is specified that was not installed, it will throw.
	 */
	versions?: string[]
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
 * @param {AttestTypeScriptVersionOptions} [opts]
 */
export const forEachTypeScriptVersion = (
	fn: (version: string) => void,
	opts?: AttestTypeScriptVersionOptions
) => {
	let tsDirs = opts?.directories
	if (!tsDirs) {
		const versions = findAttestTypeScriptVersions()
		if (opts?.versions) {
			tsDirs = opts.versions.map((version) => {
				if (!versions[version]) {
					throw new Error(
						`Specified TypeScript version alias ${version} does not exist.` +
							` It should probably be specified in package.json like:
	"attest-ts${version.replace(".", "")}": "npm:typescript@${version}"`
					)
				}
				return versions[version]
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
 * @returns An object with each TypeScript version as a key like "5.3.2" mapped
 * to the directory in which it is installed, e.g. "/home/ssalb/arktype/node_modules/attest-ts53"
 *
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
			const version: string = readJson(
				join(expectedLocation, "package.json")
			).version
			return [version, expectedLocation]
		}
	)
}

/** Get the TypeScript version being used by attest as as string like "5.0"
 *  Does not include alternate versions that may be referenced by cache files
 */
export const getPrimaryTsVersionUnderTest = (): `${Digit}.${Digit}` =>
	ts.versionMajorMinor
