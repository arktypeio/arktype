import { fromHere, readPackageJson } from "@arktype/fs"
import { flatMorph } from "@arktype/util"
import { join } from "node:path"
import type { PackageJson } from "type-fest"

const root = fromHere("..", "..")
const arkDir = join(root, "ark")
const docs = join(arkDir, "docs")

export const repoDirs = {
	root,
	arkDir,
	docs,
	repo: join(arkDir, "repo")
}

export const packageScopes = ["attest", "fs", "schema", "type", "util"] as const

export type PackageScope = (typeof packageScopes)[number]

export type ArkPackage = {
	scope: PackageScope
	path: string
	name: string
	version: string
	json: PackageJson
}

export const packagesByScope = flatMorph(
	packageScopes,
	(i, scope): [PackageScope, ArkPackage] => {
		const path = join(arkDir, scope)
		const json = readPackageJson(path) as PackageJson
		return [
			scope,
			{ scope, path, json, name: json.name!, version: json.version! }
		]
	}
)

export const packages = Object.values(packagesByScope)
