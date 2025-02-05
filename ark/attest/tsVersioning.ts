import { assertPackageRoot, fsRoot, readJson } from "@ark/fs"
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
const strictTsVersionPrefix = "@ark/attest-ts-"

const parseInstalledTsAlias = (installedAlias: string): string | null => {
	if (installedAlias === "typescript") return "default"
	if (installedAlias.startsWith(possibleTsVersionPrefix))
		return installedAlias.slice(possibleTsVersionPrefix.length)
	if (installedAlias.startsWith(strictTsVersionPrefix))
		return installedAlias.slice(strictTsVersionPrefix.length)
	return null
}

/**
 * Find and return the paths of all installed TypeScript versions, including the
 * all dependencies beginning with "typescript" or "@ark/attest-ts-".
 *
 * Starts checking from the current directory and looks for node_modules in parent
 * directories up to the file system root.
 *
 * Alternate versions can be installed using a package.json dependency like:
 *
 * ```json
 * "@ark/attest-ts-min": "npm:typescript@5.1.6"
 * ```
 * @returns {TsVersionData[]} Each version mapped to data, e.g.:
 * 		{alias: "@ark/attest-ts-min", version: "5.1.6", path: "/home/ssalb/arktype/node_modules/@ark/attest-ts-min" } *
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
			...(packageJson.dependencies as object),
			...(packageJson.devDependencies as object)
		}
		for (const installedAlias in dependencies) {
			const alias = parseInstalledTsAlias(installedAlias)
			if (alias === null) continue

			const path = join(nodeModulesPath, installedAlias)
			if (!existsSync(path)) {
				throw Error(
					`TypeScript version ${installedAlias} specified in ${packageJsonPath} must be installed at ${path} `
				)
			}
			const typescriptJson = readJson(join(path, "package.json"))

			if (typescriptJson.name !== "typescript") {
				if (installedAlias.startsWith(strictTsVersionPrefix))
					throw new Error(`Package at ${path} should be named "typescript"`)
				continue
			}

			versions.push({
				alias,
				version: typescriptJson.version as string,
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
