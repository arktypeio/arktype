import type { noSuggest } from "./errors.ts"
import type { Key } from "./keys.ts"
import type { Constructor } from "./objectKinds.ts"
import type { Entry } from "./records.ts"
import type { SerializationOptions } from "./serialize.ts"

// arktype reads user values only through these, so a build can answer them

// a literal, so bundles needn't keep noSuggest
export const arkKind: noSuggest<"arkKind"> = " arkKind"

export type arkKind = typeof arkKind

export const arkKindOf = (value: unknown): unknown =>
	(value as { [arkKind]?: unknown } | null | undefined)?.[arkKind]

export const isStandardSchema = (o: object): boolean => "~standard" in o

export const isDate = (value: unknown): value is Date => value instanceof Date

// a node from another copy of arktype, like 2.x, has its arkKind but not its class
export const isInstanceOf = (o: object, ctor: Function): boolean =>
	o instanceof ctor

export const prototypeOf = (o: object): object | null =>
	Object.getPrototypeOf(o)

// Types and validators read ctx, though they declare only data
export const arityOf = (fn: Function): number => {
	const proto = Object.getPrototypeOf(fn)
	return proto && Object.prototype.hasOwnProperty.call(proto, "traverse") ?
			2
		:	fn.length
}

export const functionNameOf = (fn: Function): string => fn.name

export const constructorNameOf = (o: object): string | undefined =>
	(o.constructor as Function | undefined)?.name

export const expressionOf = (o: object): string | undefined =>
	"expression" in o && typeof o.expression === "string" ?
		o.expression
	:	undefined

export const toJsonMethodOf = (o: object): (() => unknown) | undefined => {
	const toJson = (o as { toJSON?: unknown }).toJSON
	return typeof toJson === "function" ? (toJson as () => unknown) : undefined
}

export const constructorExtends = (
	ctor: Constructor,
	base: Constructor
): boolean => {
	let current = ctor.prototype

	while (current !== null) {
		if (current === base.prototype) return true

		current = Object.getPrototypeOf(current)
	}
	return false
}

export const ownEntriesOf = (
	o: object,
	opts: SerializationOptions
): Entry<Key>[] => {
	const result: Entry<Key>[] = []
	for (const k of Reflect.ownKeys(o)) {
		const descriptor = Object.getOwnPropertyDescriptor(o, k)!
		if (!descriptor.enumerable) continue
		result.push([
			k,
			"value" in descriptor ? descriptor.value
			: opts.onAccessor ? opts.onAccessor(descriptor)
			: (o as Record<Key, unknown>)[k]
		])
	}
	return result
}
