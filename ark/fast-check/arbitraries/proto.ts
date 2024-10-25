import type { nodeOfKind } from "@ark/schema"
import { anything, array, uniqueArray, type Arbitrary } from "fast-check"
import { buildStructureArbitrary } from "../arktypeFastCheck.ts"
import type { Ctx } from "../fastCheckContext.ts"
import { buildDateArbitrary } from "./date.ts"
import type { DomainInputNode } from "./domain.ts"

export const buildProtoArbitrary: BuildProtoArbitrary = {
	Array: (node, ctx) =>
		node.hasKind("proto") ?
			array(anything())
		:	buildStructureArbitrary(node as never, ctx),
	Set: () => uniqueArray(anything()).map(arr => new Set(arr)),
	Date: node => buildDateArbitrary(node)
}

type BuildProtoArbitrary = {
	Array: ProtoArbitrary
	Set: ProtoArbitrary<Set<unknown>>
	Date: ProtoArbitrary<Date>
	[key: string]: ProtoArbitrary
}

type ProtoArbitrary<t = unknown> = (
	node: ProtoInputNode | DomainInputNode,
	ctx: Ctx
) => Arbitrary<t>

export type ProtoInputNode = nodeOfKind<"intersection"> | nodeOfKind<"domain">
