import { fromHere, readJson } from "@ark/fs"
import { flatMorph } from "@ark/util"
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
		const json = readJson(path) as PackageJson
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
