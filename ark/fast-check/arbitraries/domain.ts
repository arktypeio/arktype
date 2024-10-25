import type { nodeOfKind } from "@ark/schema"
import { bigInt, constant, object, type Arbitrary } from "fast-check"
import { buildStructureArbitrary } from "../arktypeFastCheck.ts"
import type { Ctx } from "../fastCheckContext.ts"
import { buildNumberArbitrary } from "./number.ts"
import { buildStringArbitrary } from "./string.ts"

export const buildDomainArbitrary: BuildDomainArbitrary = {
	number: node => buildNumberArbitrary(node),
	string: node => buildStringArbitrary(node),
	object: (node, ctx) =>
		node.hasKind("domain") ? object() : buildStructureArbitrary(node, ctx),
	symbol: () => constant(Symbol()),
	bigint: () => bigInt()
}

export type DomainArbitrary<t = unknown> = (
	node: DomainInputNode,
	ctx: Ctx
) => Arbitrary<t>

type BuildDomainArbitrary = {
	number: DomainArbitrary<number>
	string: DomainArbitrary<string>
	symbol: DomainArbitrary<symbol>
	bigint: DomainArbitrary<bigint>
	object: DomainArbitrary
}

export type DomainInputNode = nodeOfKind<"intersection"> | nodeOfKind<"domain">
