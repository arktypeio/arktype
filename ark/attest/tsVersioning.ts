import { assertPackageRoot, findPackageAncestors, readJson } from "@ark/fs"
import type { Digit } from "@ark/util"
import {
	existsSync,
	readdirSync,
	renameSync,
	statSync,
	symlinkSync,
	unlinkSync
} from "node:fs"
import { join } from "node:path"
import ts from "typescript"

/**
 * Executes a provided function for an installed set of TypeScript versions.
 *
 * Your primary TypeScript version at node_modules/typescript will be
 * temporarily renamed to node_modules/typescript-temp, and reset after each
 * version has been executed, regardless of failures.
 *
 * Throws an error if any version fails when the associated function is executed.
 *
 * fn should spawn a new process so the new symlinked version can be loaded.
 */
export const forTypeScriptVersions = (
	versions: TsVersionData[],
	fn: (version: TsVersionData) => void
): void => {
	const passedVersions: TsVersionData[] = []
	const failedVersions: TsVersionData[] = []
	const nodeModules = join(assertPackageRoot(process.cwd()), "node_modules")
	const tsPrimaryPath = join(nodeModules, "typescript")
	const tsTemporaryPath = join(nodeModules, "typescript-temp")

	if (existsSync(tsTemporaryPath)) unlinkSync(tsTemporaryPath)
	if (existsSync(tsPrimaryPath)) renameSync(tsPrimaryPath, tsTemporaryPath)

	try {
		for (const version of versions) {
			const targetPath =
				version.path === tsPrimaryPath ? tsTemporaryPath : version.path
			console.log(
				`⛵ Switching to TypeScript version ${version.alias} (${version.version})...`
			)
			try {
				if (existsSync(tsPrimaryPath)) unlinkSync(tsPrimaryPath)
				symlinkSync(targetPath, tsPrimaryPath, "junction")
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
			unlinkSync(tsPrimaryPath)
			renameSync(tsTemporaryPath, tsPrimaryPath)
		}
	}
}

export type TsVersionData = {
	alias: string
	version: string
	path: string
}

const possibleTsVersionPrefix = "typescript-"
const strictTsVersionPrefix = "attest-ts-"

/**
 * Determine the alias from the directory name
 */
const getDirAlias = (dirName: string): string | null => {
	if (dirName === "typescript") return "default"
	if (dirName.startsWith(possibleTsVersionPrefix))
		return dirName.slice(possibleTsVersionPrefix.length)
	if (dirName.startsWith(strictTsVersionPrefix))
		return dirName.slice(strictTsVersionPrefix.length)
	return null
}

/**
 * Try to get the TypeScript version from a directory
 */
const getTsVersion = (fullPath: string): string | null => {
	try {
		// Try to read package.json for version
		const packageJsonPath = join(fullPath, "package.json")
		if (existsSync(packageJsonPath)) {
			const packageJson = readJson(packageJsonPath)
			if (
				packageJson &&
				packageJson.name === "typescript" &&
				typeof packageJson.version === "string"
			)
				return packageJson.version
		}

		// As a fallback, check for the lib/typescript.js file which should exist in all TS installations
		if (existsSync(join(fullPath, "lib", "typescript.js"))) return "unknown"

		return null
	} catch {
		return null
	}
}

/**
 * Find and return the paths of all installed TypeScript versions by directly scanning
 * node_modules directories in the current package and all parent packages.
 *
 * This function only looks at directories, bypassing package.json entirely.
 *
 * @returns {TsVersionData[]} Information about each TypeScript version found
 */
export const findAttestTypeScriptVersions = (): TsVersionData[] => {
	const packagePaths = findPackageAncestors(process.cwd())
	const versions: TsVersionData[] = []
	const foundVersionAliases = new Set<string>()

	// Check each package's node_modules directory
	for (const packagePath of packagePaths) {
		const nodeModulesPath = join(packagePath, "node_modules")
		if (
			!existsSync(nodeModulesPath) ||
			!statSync(nodeModulesPath).isDirectory()
		)
			continue

		// Check for regular typescript or typescript-* directories
		const dirNames = readdirSync(nodeModulesPath)
		for (const dirName of dirNames) {
			// Skip node_modules/@* directories - we'll handle them below
			if (dirName.startsWith("@")) continue

			const fullPath = join(nodeModulesPath, dirName)
			if (!statSync(fullPath).isDirectory()) continue

			const alias = getDirAlias(dirName)
			if (!alias) continue

			// Skip if we already found this alias in a closer package
			if (foundVersionAliases.has(alias)) continue

			const version = getTsVersion(fullPath)
			if (version) {
				foundVersionAliases.add(alias)
				versions.push({
					alias,
					version,
					path: fullPath
				})
			}
		}

		// Check for @ark/attest-ts-* directories
		const arkDir = join(nodeModulesPath, "@ark")
		if (existsSync(arkDir) && statSync(arkDir).isDirectory()) {
			const arkDirs = readdirSync(arkDir)
			for (const dirName of arkDirs) {
				if (!dirName.startsWith("attest-ts-")) continue

				const fullPath = join(arkDir, dirName)
				if (!statSync(fullPath).isDirectory()) continue

				const alias = getDirAlias(dirName)
				if (!alias) continue

				// Skip if we already found this alias in a closer package
				if (foundVersionAliases.has(alias)) continue

				const version = getTsVersion(fullPath)
				if (version) {
					foundVersionAliases.add(alias)
					versions.push({
						alias,
						version,
						path: fullPath
					})
				}
			}
		}
	}

	return versions
}

/** Get the TypeScript version being used by attest as as string like "5.0"
 *  Does not include alternate versions that may be referenced by cache files
 */
export const getPrimaryTsVersionUnderTest = (): `${Digit}.${Digit}` =>
	ts.versionMajorMinor
