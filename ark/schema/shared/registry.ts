import {
	$ark,
	groupBy,
	register,
	type InitialRegistryContents,
	type NonNegativeIntegerLiteral
} from "@ark/util"

let _registryName = "$ark"
let suffix = 2

while (_registryName in globalThis) _registryName = `$ark${suffix++}`

export const registryName = _registryName
;(globalThis as any)[registryName] = $ark

if (suffix !== 2) {
	const g: any = globalThis
	const registries: InitialRegistryContents[] = [g.$ark]
	for (let i = 2; i < suffix; i++)
		if (g[`$ark${i}`]) registries.push(g[`$ark${i}`])

	console.warn(
		`Multiple @ark registries detected. This can lead to unexpected behavior.`
	)
	const byPath = groupBy(registries, "filename")

	const paths = Object.keys(byPath)

	for (const path of paths) {
		if (byPath[path]!.length > 1) {
			console.warn(
				`File ${path} was initialized multiple times, likely due to being imported from both CJS and ESM contexts.`
			)
		}
	}

	if (paths.length > 1) {
		console.warn(
			`Registries were initialized at the following paths:` +
				paths
					.map(
						path => `	${path} (@ark/util version ${byPath[path]![0].version})`
					)
					.join("\n")
		)
	}
}

export const reference = (name: string): RegisteredReference =>
	`${registryName}.${name}` as never

export const registeredReference = (
	value: object | symbol
): RegisteredReference => reference(register(value))

export type RegisteredReference<to extends string = string> =
	`$ark${"" | NonNegativeIntegerLiteral}.${to}`
