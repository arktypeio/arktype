import type { TraversalState } from "../io/traverse.js"

export type Morph<i = any, o = unknown> = (In: i, state: TraversalState) => o

export class Morphable {
	constructor(schema: { morphs?: readonly Morph[] }) {}
}
