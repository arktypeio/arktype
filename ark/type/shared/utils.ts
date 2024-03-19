import { isArray, morph, type List, type mutable } from "@arktype/util"
import type { UnknownNode } from "../base.js"
import { hasArkKind } from "../util.js"

export const makeRootAndArrayPropertiesMutable = <o extends object>(
	o: o
): makeRootAndArrayPropertiesMutable<o> =>
	// TODO: this cast should not be required, but it seems TS is referencing
	// the wrong parameters here?
	morph(o as never, (k, v) => [k, isArray(v) ? [...v] : v]) as never

export type makeRootAndArrayPropertiesMutable<inner> = {
	-readonly [k in keyof inner]: inner[k] extends List | undefined
		? mutable<inner[k]>
		: inner[k]
} & unknown
