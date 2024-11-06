import {
	type array,
	isDotAccessible,
	printable,
	ReadonlyArray,
	type requireKeys,
	throwParseError
} from "@ark/util"

export type StringifyPathOptions<stringifiable = PropertyKey> = requireKeys<
	{
		stringifySymbol?: (s: symbol) => string
		stringifyNonKey?: (o: Exclude<stringifiable, PropertyKey>) => string
	},
	stringifiable extends PropertyKey ? never : "stringifyNonKey"
>

export type StringifyPathFn = <stringifiable>(
	path: array<stringifiable>,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: StringifyPathOptions]
	:	NoInfer<[opts: StringifyPathOptions<stringifiable>]>
) => string

export type AppendStringifiedKeyFn = <stringifiable>(
	path: string,
	prop: stringifiable,
	...[opts]: [stringifiable] extends [PropertyKey] ?
		[opts?: StringifyPathOptions]
	:	NoInfer<[opts: StringifyPathOptions<stringifiable>]>
) => string

export const appendStringifiedKey: AppendStringifiedKeyFn = (
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

export const stringifyPath: StringifyPathFn = (path, ...opts) =>
	path.reduce<string>((s, k) => appendStringifiedKey(s, k, ...opts), "")

export class ReadonlyTraversalPath extends ReadonlyArray<PropertyKey> {
	cloneAndFreeze(): ReadonlyTraversalPath {
		return new ReadonlyTraversalPath(...this)
	}

	cloneToMutable(): MutableTraversalPath {
		return new ReadonlyTraversalPath(...this) as never
	}

	private _stringified: string | undefined
	stringify(): string {
		if (this._stringified) return this._stringified
		return (this._stringified = stringifyPath(this))
	}

	private _stringifiedAncestors: string[] | undefined
	stringifyAncestors(): string[] {
		if (this._stringifiedAncestors) return this._stringifiedAncestors
		let propString = ""
		const result: string[] = [propString]
		this.forEach(path => {
			propString = appendStringifiedKey(propString, path)
			result.push(propString)
		})
		return (this._stringifiedAncestors = result)
	}
}

export interface MutableTraversalPath
	extends Array<PropertyKey>,
		Pick<ReadonlyTraversalPath, "cloneAndFreeze"> {}

export const MutableTraversalPath: new (
	...args: ConstructorParameters<typeof ReadonlyTraversalPath>
) => MutableTraversalPath = ReadonlyTraversalPath as never
