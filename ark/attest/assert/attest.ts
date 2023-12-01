import type { SerializedAssertionData } from "@arktype/attest"
import { caller, getCallStack, type SourcePosition } from "@arktype/fs"
import { getConfig, type AttestConfig } from "../config.js"
import { getAssertionDataAtPosition } from "../tsserver/getAssertionDataAtPosition.js"
import { assertExpectedType } from "./assertEquals.js"
import {
	ChainableAssertions,
	type AssertionKind,
	type rootAssertions
} from "./chainableAssertions.js"

export type AttestFn = {
	<expected, actual extends expected = never>(
		...args: [actual] extends [never] ? [value: expected] : []
	): [expected] extends [never]
		? rootAssertions<unknown, AssertionKind>
		: rootAssertions<expected, AssertionKind>
}

export type AssertionContext = {
	actual: unknown
	originalAssertedValue: unknown
	cfg: AttestConfig
	allowRegex: boolean
	position: SourcePosition
	defaultExpected?: unknown
	assertionStack: string
	assertionData?: SerializedAssertionData
	lastSnapName?: string
}

export type InternalAssertionHooks = {
	[k in keyof AssertionContext]?: k extends "cfg"
		? Partial<AttestConfig>
		: AssertionContext[k]
}

export const attestInternal = (
	value?: unknown,
	{ cfg: cfgHooks, ...ctxHooks }: InternalAssertionHooks = {}
) => {
	const position = caller()
	const cfg = { ...getConfig(), ...cfgHooks }
	const ctx: AssertionContext = {
		actual: value,
		allowRegex: false,
		originalAssertedValue: value,
		position,
		cfg,
		assertionStack: getCallStack({ offset: 1 }).join("\n"),
		...ctxHooks
	}
	if (!cfg.skipTypes) {
		const assertionData = getAssertionDataAtPosition(position)
		if (assertionData.typeArgs[0]) {
			// if there is an expected type arg
			assertExpectedType(assertionData, ctx)
		}
		ctx.assertionData = assertionData
	}
	return new ChainableAssertions(ctx)
}

export const attest = attestInternal as AttestFn
