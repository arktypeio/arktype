import {
	arkKindOf,
	domainDescriptions,
	flatMorph,
	isArray,
	objectKindDescriptions,
	printable,
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
import type { DiscriminantCases } from "../roots/union.ts"
import type { BaseScope } from "../scope.ts"
import type { ArkErrors } from "./errors.ts"

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

export interface ArkKinds {
	constraint: BaseConstraint
	root: BaseRoot
	scope: BaseScope
	generic: GenericRoot
	module: InternalModule
	errors: ArkErrors
	context: BaseParseContext
}

export type ArkKind = show<keyof ArkKinds>

export const hasArkKind = <kind extends ArkKind>(
	value: unknown,
	kind: kind
): value is ArkKinds[kind] => arkKindOf(value) === kind

export const isNode = (value: unknown): value is BaseNode => {
	const kind = arkKindOf(value)
	return kind === "root" || kind === "constraint"
}

export const inProgress: {
	definitions: number
	resolutions: number
	ioReads: number
	compositions: number
} = {
	definitions: 0,
	resolutions: 0,
	ioReads: 0,
	compositions: 0
}

export const isResolutionFinal = (): boolean =>
	!inProgress.definitions && !inProgress.resolutions

export const isIoFinal = (): boolean =>
	!inProgress.definitions && inProgress.resolutions === inProgress.ioReads

const uncheckedAssertions: (() => void)[] = []

let uncheckedKeys: Record<string, true> = {}

// a check can resolve the alias whose union queued it, so a keyed check is
// queued once until the queue drains
export const queueUnchecked = (assert: () => void, key?: string): void => {
	if (key !== undefined) {
		if (uncheckedKeys[key]) return
		uncheckedKeys[key] = true
	}
	uncheckedAssertions.push(assert)
}

let assertingUnchecked = false

export const assertUnchecked = (): void => {
	// an assertion can resolve an alias, which asserts again, so what it queues
	// runs in the outer loop
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

const discardUnchecked = (): void => {
	uncheckedAssertions.length = 0
	uncheckedKeys = {}
}

export const resolving = <t>(resolve: () => t): t => {
	inProgress.resolutions++
	let result: t
	try {
		result = resolve()
	} finally {
		inProgress.resolutions--
	}
	assertUnchecked()
	return result
}

// a check left from a parse that threw would read its unresolved aliases
export const defining = <t>(define: () => t): t => {
	if (isResolutionFinal()) discardUnchecked()
	inProgress.definitions++
	try {
		return define()
	} finally {
		inProgress.definitions--
	}
}

// a Type read while another node is built or described is nested in it
export const composing = <t>(compose: () => t): t => {
	inProgress.compositions++
	try {
		return compose()
	} finally {
		inProgress.compositions--
	}
}

// a node nested in another's expression or description prints as "..." past
// this length, so a type reused at each level of another can't double its
// length with each level
const maxNestedLength = 1000

export const elided = (nested: string): string =>
	nested.length > maxNestedLength ? "..." : nested

// prints as printedWithThis unless read while composing another node
export const printSelfAsThis = <node extends BaseRoot>(
	node: node,
	printedWithThis: BaseRoot
): node => {
	const { expression } = node
	return Object.defineProperties(node, {
		expression: {
			get: () =>
				inProgress.compositions ? expression : printedWithThis.expression
		},
		description: {
			get: () =>
				inProgress.compositions ?
					Reflect.get(Object.getPrototypeOf(node), "description", node)
				:	printedWithThis.description
		}
	})
}

export type unwrapDefault<thunkableValue> =
	thunkableValue extends Thunk<infer returnValue> ? returnValue : thunkableValue

export const valueAtPath = (
	path: array<PropertyKey>,
	data: unknown,
	end = path.length
): unknown => {
	let value: any = data
	for (let i = 0; i < end; i++) value = value?.[path[i]]
	return value
}

// whether data whose path is read from objects lacks the path's last key
export const isAbsent = (path: array<PropertyKey>, data: unknown): boolean =>
	path.length !== 0 &&
	!(
		path[path.length - 1] in
		(valueAtPath(path, data, path.length - 1) as object)
	)

export type DescribeBranchesOptions = {
	delimiter?: string
	finalDelimiter?: string
}

export const describeBranches = (
	descriptions: readonly string[],
	opts?: DescribeBranchesOptions
): string => {
	const delimiter = opts?.delimiter ?? ", "
	const finalDelimiter = opts?.finalDelimiter ?? " or "

	if (descriptions.length === 0) return "never"

	if (descriptions.length === 1) return descriptions[0]
	if (
		(descriptions.length === 2 &&
			descriptions[0] === "false" &&
			descriptions[1] === "true") ||
		(descriptions[0] === "true" && descriptions[1] === "false")
	)
		return "boolean"

	// keep track of seen descriptions to avoid duplication
	const seen: Record<string, true | undefined> = Object.create(null)
	const unique = descriptions.filter(s => (seen[s] ? false : (seen[s] = true)))
	const last = unique.pop()!

	return `${unique.join(delimiter)}${unique.length ? finalDelimiter : ""}${last}`
}

const describeExpressionOptions: DescribeBranchesOptions = {
	delimiter: " | ",
	finalDelimiter: " | "
}

export const expressBranches = (expressions: readonly string[]): string =>
	describeBranches(expressions, describeExpressionOptions)

export const describeCases = ({
	discriminantKind,
	cases
}: DiscriminantCases): string =>
	describeBranches(
		discriminantKind === "domain" ?
			cases.map(domain =>
				domain === "Array" ?
					objectKindDescriptions.Array
				:	domainDescriptions[domain]
			)
		:	cases.map(unit => printable(unit, { ownDataOnly: true }))
	)
