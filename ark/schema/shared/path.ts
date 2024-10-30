import {
	type array,
	isDotAccessible,
	printable,
	type requireKeys,
	throwParseError
} from "@ark/util"

export type PathToPropStringOptions<stringifiable = PropertyKey> = requireKeys<
	{
		stringifySymbol?: (s: symbol) => string
		stringifyNonKey?: (o: Exclude<stringifiable, PropertyKey>) => string
	},
	stringifiable extends PropertyKey ? never : "stringifyNonKey"
>

export type PathToPropStringFn = <stringifiable>(
	path: array<stringifiable>,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: PathToPropStringOptions]
	:	NoInfer<[opts: PathToPropStringOptions<stringifiable>]>
) => string

export type AppendPropToPathStringFn = <stringifiable>(
	path: string,
	prop: stringifiable,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: PathToPropStringOptions]
	:	NoInfer<[opts: PathToPropStringOptions<stringifiable>]>
) => string

export const appendPropToPathString: AppendPropToPathStringFn = (
	path,
	prop,
	...[opts]
) => {
	const stringifySymbol = opts?.stringifySymbol ?? printable
	let propAccessChain: string = path
	switch (typeof prop) {
		case "string":
			propAccessChain =
				isDotAccessible(prop) ?
					path === "" ?
						prop
					:	`${path}.${prop}`
				:	`${path}[${JSON.stringify(prop)}]`
			break
		case "number":
			propAccessChain = `${path}[${prop}]`
			break
		case "symbol":
			propAccessChain = `${path}[${stringifySymbol(prop)}]`
			break
		default:
			if (opts?.stringifyNonKey)
				propAccessChain = `${path}[${opts.stringifyNonKey(prop as never)}]`
			throwParseError(
				`${printable(prop)} must be a PropertyKey or stringifyNonKey must be passed to options`
			)
	}
	return propAccessChain
}

export const pathToPropString: PathToPropStringFn = (path, ...opts) =>
	path.reduce<string>((s, k) => appendPropToPathString(s, k, ...opts), "")

export class TraversalPath extends Array<PropertyKey> {}
