import { fileURLToPath } from "node:url"
import type { CallerOfOptions, SourcePosition } from "@arktype/fs"
import { caller, getCallStack } from "@arktype/fs"
import { type ErrorMessage } from "@arktype/util"
import type { AttestConfig } from "../config.js"
import { getConfig } from "../config.js"
import { getArgTypesAtPosition } from "../tsserver/getArgTypesAtPosition.js"
import { assertExpectedType } from "./assertEquals.js"
import {
	type AssertionKind,
	ChainableAssertions,
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
		const assertionData = getArgTypesAtPosition(position)
		if (assertionData.typeArgs[0]) {
			// if there is an expected type arg
			assertExpectedType(assertionData, ctx)
		}
	}
	return new ChainableAssertions(ctx)
}

export const attest = attestInternal as AttestFn
