import type { conform } from "./generics.ts"
import type { keyOf } from "./records.ts"

type getKey<o, k> =
	k extends keyof o ? o[k]
	: k extends `${infer n extends number & keyof o}` ? o[n]
	: never

type getPath<o, path extends string> =
	path extends `${infer head}.${infer tail}` ? getPath<getKey<o, head>, tail>
	:	getKey<o, path>

type validatePath<o, path extends string, prefix extends string = ""> =
	path extends `${infer head}.${infer tail}` ?
		head extends keyOf<o> ?
			validatePath<getKey<o, head>, tail, `${prefix}${head}.`>
		:	`Key '${head}' is not valid following '${prefix}'`
	:	{
			// find suffixes that would make the segment valid
			[k in keyOf<o>]: k extends `${path}${string}` ? `${prefix}${k}` : never
		}[keyOf<o>]

export const get = <const o extends object, path extends string>(
	data: o,
	pathStr: conform<path, string & validatePath<o, path>>
): getPath<o, path> => {
	let target: any = data
	const path = pathStr.split(".")
	while (path.length) target = target[path.shift()!]
	return target
}
