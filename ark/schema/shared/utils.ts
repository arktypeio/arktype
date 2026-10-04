import {
	flatMorph,
	isArray,
	noSuggest,
	type array,
	type mutable,
	type show,
	type Thunk
} from "@ark/util"
import type { BaseConstraint } from "../constraint.ts"
import type { GenericRoot } from "../generic.ts"
import type { InternalModule } from "../module.ts"
import type { BaseNode } from "../node.ts"
import type { BaseParseContext } from "../parse.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { BaseScope } from "../scope.ts"
import type { ArkError, ArkErrors } from "./errors.ts"

export const makeRootAndArrayPropertiesMutable = <o extends object>(
	o: o
): makeRootAndArrayPropertiesMutable<o> =>
	// this cast should not be required, but it seems TS is referencing
	// the wrong parameters here?
	flatMorph(o as never, (k, v) => [k, isArray(v) ? [...v] : v]) as never

export type makeRootAndArrayPropertiesMutable<inner> = {
	-readonly [k in keyof inner]: inner[k] extends array | undefined ?
		mutable<inner[k]>
	:	inner[k]
} & unknown

export type internalImplementationOf<
	external,
	typeOnlyKey extends keyof external = never
> = {
	// ensure functions accept compatible numbers of args
	[k in Exclude<keyof external, typeOnlyKey>]: external[k] extends (
		(...args: infer args) => unknown
	) ?
		(...args: { [i in keyof args]: never }) => unknown
	:	unknown
}

export type arkKind = typeof arkKind

export const arkKind = noSuggest("arkKind")

export interface ArkKinds {
	constraint: BaseConstraint
	root: BaseRoot
	scope: BaseScope
	generic: GenericRoot
	module: InternalModule
	error: ArkError
	errors: ArkErrors
	context: BaseParseContext
}

export type ArkKind = show<keyof ArkKinds>

export const hasArkKind = <kind extends ArkKind>(
	value: unknown,
	kind: kind
): value is ArkKinds[kind] => (value as any)?.[arkKind] === kind

export const isNode = (value: unknown): value is BaseNode =>
	hasArkKind(value, "root") || hasArkKind(value, "constraint")

export const inProgress: {
	definitions: number
	resolutions: number
	ioReads: number
} = {
	definitions: 0,
	resolutions: 0,
	ioReads: 0
}

export const isResolutionFinal = (): boolean =>
	!inProgress.definitions && !inProgress.resolutions

// an input or output alias is built once final, so reading it reads what it reaches as final
export const isIoFinal = (): boolean =>
	!inProgress.definitions && inProgress.resolutions === inProgress.ioReads

const uncheckedAssertions: (() => void)[] = []

let uncheckedKeys: Record<string, true> = {}

// a check can resolve the alias whose union queued it, so a keyed check is queued once until the queue drains
export const queueUnchecked = (assert: () => void, key?: string): void => {
	if (key !== undefined) {
		if (uncheckedKeys[key]) return
		uncheckedKeys[key] = true
	}
	uncheckedAssertions.push(assert)
}

let assertingUnchecked = false

export const assertUnchecked = (): void => {
	// an assertion can resolve an alias, which asserts again, so what it queues runs in the outer loop
	if (!isResolutionFinal() || assertingUnchecked) return
	assertingUnchecked = true
	try {
		for (let i = 0; i < uncheckedAssertions.length; i++)
			uncheckedAssertions[i]()
	} finally {
		assertingUnchecked = false
		discardUnchecked()
	}
}

export const discardUnchecked = (): void => {
	uncheckedAssertions.length = 0
	uncheckedKeys = {}
}

export type unwrapDefault<thunkableValue> =
	thunkableValue extends Thunk<infer returnValue> ? returnValue : thunkableValue
