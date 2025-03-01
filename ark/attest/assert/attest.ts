import { caller, getCallStack, type SourcePosition } from "@ark/fs"
import type { ErrorMessage } from "@ark/util"
import { getBenchCtx } from "../bench/bench.ts"
import type { Measure } from "../bench/measure.ts"
import { instantiationDataHandler } from "../bench/type.ts"
import {
	getTypeAssertionsAtPosition,
	type VersionedTypeAssertion
} from "../cache/getCachedAssertions.ts"
import { getConfig, type AttestConfig } from "../config.ts"
import {
	assertEquals,
	typeEqualityMapping,
	type TypeAssertionMapping
} from "./assertions.ts"
import {
	ChainableAssertions,
	type AssertionKind,
	type rootAssertions
} from "./chainableAssertions.ts"

export type AttestFn = {
	<expected, actual extends expected = never>(
		...args: actual extends never ?
			[
				ErrorMessage<"Type-only assertion requires two explicit generic params, e.g. attest<expected, actual>">
			]
		:	[]
	): void

	<expected>(actual: expected): rootAssertions<expected, AssertionKind>

	instantiations: (count?: Measure<"instantiations"> | undefined) => void
}

export type VersionableActual = {} | null | undefined | TypeAssertionMapping

export type AssertionContext = {
	versionableActual: VersionableActual
	originalAssertedValue: unknown
	cfg: AttestConfig
	allowRegex: boolean
	position: SourcePosition
	defaultExpected?: unknown
	assertionStack: string
	typeRelationshipAssertionEntries?: VersionedTypeAssertion<"type">[]
	typeBenchmarkingAssertionEntries?: VersionedTypeAssertion<"bench">[]
	lastSnapName?: string
}

export type InternalAssertionHooks = {
	[k in keyof AssertionContext]?: k extends "cfg" ? Partial<AttestConfig>
	:	AssertionContext[k]
}

export const attestInternal = (
	value?: unknown,
	{ cfg: cfgHooks, ...ctxHooks }: InternalAssertionHooks = {}
): ChainableAssertions => {
	const position = caller()
	const cfg = { ...getConfig(), ...cfgHooks }
	const ctx: AssertionContext = {
		versionableActual: value,
		allowRegex: false,
		originalAssertedValue: value,
		position,
		cfg,
		assertionStack: getCallStack({ offset: 1 }).join("\n"),
		...ctxHooks
	}
	if (!cfg.skipTypes) {
		ctx.typeRelationshipAssertionEntries = getTypeAssertionsAtPosition(position)
		if (ctx.typeRelationshipAssertionEntries[0][1].typeArgs[0]) {
			// if there is an expected type arg, check it immediately
			assertEquals(undefined, typeEqualityMapping, ctx)
		}
	}
	return new ChainableAssertions(ctx)
}

export const attest: AttestFn = Object.assign(attestInternal, {
	instantiations: (args: Measure<"instantiations"> | undefined) => {
		const attestConfig = getConfig()
		if (attestConfig.skipTypes || attestConfig.skipInlineInstantiations) return

		const calledFrom = caller()
		const ctx = getBenchCtx([calledFrom.file])
		ctx.benchCallPosition = calledFrom
		ctx.lastSnapCallPosition = calledFrom
		instantiationDataHandler(
			{ ...ctx, lastSnapFunctionName: "instantiations" },
			args,
			false
		)
	}
}) as never
