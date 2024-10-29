import type { nodeOfKind } from "@ark/schema"
import * as fc from "fast-check"
import { buildStructureArbitrary } from "../arktypeFastCheck.ts"
import type { Ctx } from "../fastCheckContext.ts"
import { buildNumberArbitrary } from "./number.ts"
import { buildStringArbitrary } from "./string.ts"

export const buildDomainArbitrary: BuildDomainArbitrary = {
	number: node => buildNumberArbitrary(node),
	string: node => buildStringArbitrary(node),
	object: (node, ctx) =>
		node.hasKind("domain") ? fc.object() : buildStructureArbitrary(node, ctx),
	symbol: () => fc.constant(Symbol()),
	bigint: () => fc.bigInt()
}

export type DomainArbitrary<t = unknown> = (
	node: DomainInputNode,
	ctx: Ctx
) => fc.Arbitrary<t>

type BuildDomainArbitrary = {
	number: DomainArbitrary<number>
	string: DomainArbitrary<string>
	symbol: DomainArbitrary<symbol>
	bigint: DomainArbitrary<bigint>
	object: DomainArbitrary
}

export type DomainInputNode = nodeOfKind<"intersection"> | nodeOfKind<"domain">
