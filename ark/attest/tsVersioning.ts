import { findPackageRoot, readJson } from "@arktype/fs"
import type { Digit } from "@arktype/util"
import {
	existsSync,
	lstatSync,
	readdirSync,
	renameSync,
	symlinkSync,
	unlinkSync
} from "fs"
import { join } from "path/posix"
import ts from "typescript"

export type ForEachTypeScriptVersionOptions = {
	/** The list of directories containing TypeScript versions.
	 * Defaults to versions in node_modules prefixed with `attest-ts`
	 */
	directories?: string[]
}

/**
 * Executes a provided function for each installed TypeScript version.
 *
 * Your primary TypeScript version at node_modules/typescript will be
 * temporarily renamed to node_modules/typescript-temp, and reset
 * after each version has been executed, regardless of failures.
 *
 * Throws an error if any version fails during test execution.
 * @param {function} fn - The function to execute for each TypeScript version. It should accept a version string as its only argument.
 * @param {ForEachTypeScriptVersionOptions} [opts]
 */
export const forEachTypeScriptVersion = (
	fn: (version: string) => void,
	opts?: ForEachTypeScriptVersionOptions
) => {
	const tsDirs = opts?.directories ?? findAttestTypeScriptVersions()
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
	tsDirs.forEach((path) => {
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
	})
	if (originalTsVersion) {
		console.log(
			`⏮️ Restoring original TypeScript version ${originalTsVersion}...`
		)
		renameSync(tsTemporaryPath, tsPrimaryPath)
	}

	if (failedVersions.length !== 0) {
		throw new Error(
			`❌ The following TypeScript versions threw during test execution: ${failedVersions.join(
				", "
			)}`
		)
	}
	console.log(
		`✅ Successfully tested TypeScript versions ${passedVersions.join(", ")}`
	)
}

/**
 * Find and return the paths of all installed TypeScript versions with a prefix of "attest-ts".
 * These versions can be installed using a package.json dependency like "attest-ts50": "npm:typescript@5.0"
 * Throws an error if no such versions are found.
 * @returns {string[]} An array of paths to the installed TypeScript versions.
 */
export const findAttestTypeScriptVersions = (): string[] => {
	const nodeModules = join(findPackageRoot(process.cwd()), "node_modules")
	if (!existsSync(nodeModules) || !lstatSync(nodeModules).isDirectory()) {
		throw Error(
			`To automatically locate attest versions from ${process.cwd()}, ${nodeModules} must exist and be a directory`
		)
	}

	const attestTsDirs = readdirSync(nodeModules)
		.filter((dir) => dir.startsWith("attest-ts"))
		.map((dir) => join(nodeModules, dir))

	if (attestTsDirs.length === 0) {
		throw Error(
			'At least one TypeScript version with prefix "attest-ts" must be installed via a package.json entry like "attest-ts50": "npm:typescript@5.0"'
		)
	}

	return attestTsDirs
}

/** Get the TypeScript version being used by attest as as string like "5.0" */
export const getTsVersionUnderTest = (): `${Digit}.${Digit}` =>
	ts.versionMajorMinor
