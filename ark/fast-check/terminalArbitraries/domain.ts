import { bigInt, constant, object, type Arbitrary } from "fast-check"
import type { Ctx } from "../fastCheckContext.ts"
import { buildNumberArbitrary } from "./number.ts"
import { buildStringArbitrary } from "./string.ts"

export const buildDomainArbitrary: buildDomainArbitrary = {
	number: ctx => buildNumberArbitrary(ctx),
	string: ctx => buildStringArbitrary(ctx),
	symbol: () => constant(Symbol()),
	object: () => object(),
	bigint: () => bigInt()
}

export type buildArbitrary<t = unknown> = (ctx: Ctx) => Arbitrary<t>

type buildDomainArbitrary = {
	number: buildArbitrary<number>
	string: buildArbitrary<string>
	symbol: buildArbitrary<symbol>
	object: buildArbitrary<Record<string, unknown>>
	bigint: buildArbitrary<bigint>
}
