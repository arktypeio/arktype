import { fileURLToPath } from "node:url"
import type { SourcePosition } from "@arktype/fs"
import { caller, getCallStack } from "@arktype/fs"
import { type ErrorMessage } from "@arktype/util"
import type { AttestConfig } from "../config.js"
import { getConfig } from "../config.js"
import { getTypeDataAtPos } from "../tsserver/getAssertionAtPos.js"
import {
	assertExpectedType,
	type AssertionKind,
	ChainableAssertions,
	type rootAssertions
} from "./chainableAssertions.js"

export type AttestFn = {
	<expected>(
		value: expected
	): [expected] extends [never]
		? rootAssertions<unknown, AssertionKind>
		: rootAssertions<expected, AssertionKind>
	<expected, actual extends expected = never>(
		...args: [actual] extends [never]
			? [
					ErrorMessage<`Either pass actual as a type param like attest<expected, actual>() or a value like attest<expected>(actual)`>
			  ]
			: []
	): rootAssertions<expected, "type">
}

export type AssertionContext = {
	actual: unknown
	originalAssertedValue: unknown
	cfg: AttestConfig
	isReturn: boolean
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
	if (position.file.startsWith("file:///")) {
		position.file = fileURLToPath(position.file)
	}
	const cfg = { ...getConfig(), ...cfgHooks }
	const ctx: AssertionContext = {
		actual: value,
		isReturn: false,
		allowRegex: false,
		originalAssertedValue: value,
		position,
		cfg,
		assertionStack: getCallStack({ offset: 1 }).join("\n"),
		...ctxHooks
	}
	if (!cfg.skipTypes) {
		const assertionData = getTypeDataAtPos(ctx.position)
		assertExpectedType(assertionData)
	}
	return new ChainableAssertions(ctx)
}

export const attest = attestInternal as AttestFn
