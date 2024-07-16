import { findPackageRoot, fsRoot, readJson } from "@ark/fs"
import type { Digit } from "@ark/util"
import { existsSync, renameSync, symlinkSync, unlinkSync } from "fs"
import { dirname } from "path"
import { join } from "path/posix"
import ts from "typescript"

/**
 * Executes a provided function for an installed set of TypeScript versions.
 *
 * Your primary TypeScript version at node_modules/typescript will be
 * temporarily renamed to node_modules/typescript-temp, and reset after each
 * version has been executed, regardless of failures.
 *
 *
 * Throws an error if any version fails when the associated function is executed.
 *
 * @param {TsVersionData[]} versions The set of versions for which to exceute the function
 * @param {function} fn - The function to execute for each TypeScript version.
 * Should spawn a new process so the new symlinked version can be loaded.
 */
export const forTypeScriptVersions = (
	versions: TsVersionData[],
	fn: (version: TsVersionData) => void
): void => {
	const passedVersions: TsVersionData[] = []
	const failedVersions: TsVersionData[] = []
	const nodeModules = join(findPackageRoot(process.cwd()), "node_modules")
	const tsPrimaryPath = join(nodeModules, "typescript")
	const tsTemporaryPath = join(nodeModules, "typescript-temp")
	if (existsSync(tsPrimaryPath)) renameSync(tsPrimaryPath, tsTemporaryPath)

	try {
		for (const version of versions) {
			const targetPath =
				version.path === tsPrimaryPath ? tsTemporaryPath : version.path
			const tsPackageJson = readJson(join(targetPath, "package.json"))
			if (tsPackageJson.name !== "typescript") {
				throw new Error(
					`Expected to find a TypeScript version ${version.version} at ${version.path}`
				)
			}
			console.log(
				`⛵ Switching to TypeScript version ${version.alias} (${version.version})...`
			)

			try {
				if (existsSync(tsPrimaryPath)) unlinkSync(tsPrimaryPath)

				symlinkSync(targetPath, tsPrimaryPath)
				fn(version)
				passedVersions.push(version)
			} catch (e) {
				console.error(e)
				failedVersions.push(version)
			}
		}

		if (failedVersions.length !== 0) {
			throw new Error(
				`❌ The following TypeScript versions threw: ${failedVersions
					.map(v => `${v.alias} (${v.version})`)
					.join(", ")}`
			)
		}
		console.log(
			`✅ Successfully ran TypeScript versions ${passedVersions
				.map(v => `${v.alias} (${v.version})`)
				.join(", ")}`
		)
	} finally {
		if (existsSync(tsTemporaryPath)) {
			console.log(`⏮️ Restoring your original TypeScript version...`)
			renameSync(tsTemporaryPath, tsPrimaryPath)
		}
	}
}

export type TsVersionData = {
	alias: string
	version: string
	path: string
}

/**
 * Find and return the paths of all installed TypeScript versions, including the
 * primary version installed as "typescript" and all dependencies beginning with
 * "typescript-".
 *
 * Starts checking from the current directory and looks for node_modules in parent
 * directories up to the file system root.
 *
 * Alternate versions can be installed using a package.json dependency like:
 *
 * ```json
 * "typescript-latest": "npm:typescript@latest"
 * ```
 * @returns {TsVersionData[]} Each version mapped to data, e.g.:
 * 		{alias: "typescript-latest", version: "5.3.3", path: "/home/ssalb/arktype/node_modules/typescript-latest" }
 *
 * @throws {Error} If a TypeScript version specified in package.json is not
 * installed at the expected location in node_modules.
 */
export const findAttestTypeScriptVersions = (): TsVersionData[] => {
	let currentDir = process.cwd()
	const versions: TsVersionData[] = []
	while (currentDir !== fsRoot) {
		const packageJsonPath = join(currentDir, "package.json")
		if (!existsSync(packageJsonPath)) {
			currentDir = dirname(currentDir)
			continue
		}
		const nodeModulesPath = join(currentDir, "node_modules")
		const packageJson = readJson(packageJsonPath)
		const dependencies: Record<string, string> = {
			...packageJson.dependencies,
			...packageJson.devDependencies
		}
		for (const alias in dependencies) {
			if (!alias.startsWith("typescript")) continue

			const path = join(nodeModulesPath, alias)
			if (!existsSync(path)) {
				throw Error(
					`TypeScript version ${alias} specified in ${packageJsonPath} must be installed at ${path} `
				)
			}
			const version: string = readJson(join(path, "package.json")).version
			versions.push({
				alias,
				version,
				path
			})
		}
		currentDir = dirname(currentDir)
	}
	return versions
}

/** Get the TypeScript version being used by attest as as string like "5.0"
 *  Does not include alternate versions that may be referenced by cache files
 */
export const getPrimaryTsVersionUnderTest = (): `${Digit}.${Digit}` =>
	ts.versionMajorMinor
