import type { nodeOfKind } from "arktype/schema"
import * as fc from "fast-check"
import { buildStructureArbitrary } from "../buildArbitrary.ts"
import type { Ctx } from "../fastCheckContext.ts"
import { buildDateArbitrary } from "./date.ts"
import type { DomainInputNode } from "./domain.ts"

export const buildProtoArbitrary: BuildProtoArbitrary = {
	Array: (node, ctx) =>
		node.is("proto") ?
			fc.array(fc.anything())
		:	buildStructureArbitrary(node as never, ctx),
	Set: () => fc.uniqueArray(fc.anything()).map(arr => new Set(arr)),
	Map: () =>
		fc
			.array(fc.tuple(fc.anything(), fc.anything()))
			.map(entries => new Map(entries)),
	Date: node => buildDateArbitrary(node),
	RegExp: () =>
		fc.string().map(s => new RegExp(s.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&"))),
	URL: () => fc.webUrl().map(u => new URL(u)),
	Error: () => fc.string().map(m => new Error(m))
}

type BuildProtoArbitrary = {
	Array: ProtoArbitrary
	Set: ProtoArbitrary<Set<unknown>>
	Map: ProtoArbitrary<Map<unknown, unknown>>
	Date: ProtoArbitrary<Date>
	RegExp: ProtoArbitrary<RegExp>
	URL: ProtoArbitrary<URL>
	Error: ProtoArbitrary<Error>
	[key: string]: ProtoArbitrary
}

type ProtoArbitrary<t = unknown> = (
	node: ProtoInputNode | DomainInputNode,
	ctx: Ctx
) => fc.Arbitrary<t>

export type ProtoInputNode = nodeOfKind<"intersection"> | nodeOfKind<"domain">
