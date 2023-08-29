import { Trait } from "@arktype/util"
import type { TraversalState } from "../io/traverse.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export class Morphable extends Trait {
	declare args: [unknown, { morphs?: readonly Morph[] }?]
}
