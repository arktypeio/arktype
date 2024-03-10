import { isArray, morph, type List, type mutable } from "@arktype/util"

export const makeRootAndArrayPropertiesMutable = <o extends object>(o: o) =>
	// TODO: this cast should not be required, but it seems TS is referencing
	// the wrong parameters here?
	morph(o as never, (k, v) => [
		k,
		isArray(v) ? [...v] : v
	]) as makeRootAndArrayPropertiesMutable<o>

export type makeRootAndArrayPropertiesMutable<inner> = {
	-readonly [k in keyof inner]: inner[k] extends List | undefined
		? mutable<inner[k]>
		: inner[k]
} & unknown
