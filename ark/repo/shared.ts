import {
	fileName,
	findPackageAncestors,
	readJson,
	readPackageJson
} from "@ark/fs"
import { flatMorph, throwInternalError } from "@ark/util"
import { join } from "node:path"
import type { PackageJson } from "type-fest"

// allow other utils invoked from build to bootstrap utils

// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * as bootstrapFs from "../fs/index.ts"
// eslint-disable-next-line @typescript-eslint/no-restricted-imports
export * as bootstrapUtil from "../util/index.ts"

const root = findPackageAncestors().find(
	dir => readPackageJson(dir).name === "ark"
)

if (!root) throwInternalError(`Can't find repo root from ${fileName()}!`)

const arkDir = join(root, "ark")
const docs = join(arkDir, "docs")

export const repoDirs = {
	root,
	arkDir,
	docs,
	repo: join(arkDir, "repo")
}

export const packageScopes = [
	"attest",
	"fs",
	"json-schema",
	"schema",
	"type",
	"util"
] as const

export type PackageScope = (typeof packageScopes)[number]

export type ArkPackage = {
	scope: PackageScope
	path: string
	packageJsonPath: string
	name: string
	version: string
	json: PackageJson
}

export const packagesByScope = flatMorph(
	packageScopes,
	(i, scope): [PackageScope, ArkPackage] => {
		const path = join(arkDir, scope)
		const packageJsonPath = join(path, "package.json")
		const json = readJson(packageJsonPath) as PackageJson
		return [
			scope,
			{
				scope,
				path,
				packageJsonPath,
				json,
				name: json.name!,
				version: json.version!
			}
		]
	}
)

export const packages = Object.values(packagesByScope)
