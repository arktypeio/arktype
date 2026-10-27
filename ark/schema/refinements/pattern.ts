import {
	ipv4Matcher,
	ipv6Matcher,
	isIpv4,
	isIpv6,
	isIso8601,
	isNumericString,
	iso8601Matcher,
	isUuid,
	isWellFormedInteger,
	numericStringMatcher,
	uuidMatcher,
	wellFormedIntegerMatcher
} from "@ark/util"
import { InternalPrimitiveConstraint } from "../constraint.ts"
import type { BaseRoot } from "../roots/root.ts"
import type { NodeCompiler } from "../shared/compile.ts"
import type {
	BaseErrorContext,
	BaseNodeInput,
	declareNode
} from "../shared/declare.ts"
import {
	implementNode,
	type nodeImplementationOf
} from "../shared/implement.ts"
import { $ark } from "../shared/registry.ts"
import { matchesRepeated } from "../shared/traversal.ts"

export declare namespace Pattern {
	export interface ExpandedSchema extends BaseNodeInput {
		readonly rule: string
		readonly flags?: string
	}

	export interface Inner {
		readonly rule: string
		readonly flags?: string
	}

	export type Schema = ExpandedSchema | string | RegExp

	export interface ErrorContext extends BaseErrorContext<"pattern">, Inner {}

	export interface Declaration
		extends declareNode<{
			kind: "pattern"
			inner: Inner
			stacks: true
			prerequisite: string
			errorCtx: ErrorContext
		}> {}

	export type Node = PatternNode
}

const implementation: nodeImplementationOf<Pattern.Declaration> =
	implementNode<Pattern.Declaration>({
		kind: "pattern",
		bareKey: "rule",
		keys: {
			rule: {},
			flags: {}
		},
		coversNoun: true,
		coversExpr: true,
		ownErr: true,
		stacks: true,
		defaults: {
			description: node => `matched by ${node.rule}`
		}
	})

// a function testing the strings a RegExp matches, by its expression
const testsByExpression: { [expression: string]: (s: string) => boolean } = {
	[`${numericStringMatcher}`]: isNumericString,
	[`${wellFormedIntegerMatcher}`]: isWellFormedInteger,
	[`${uuidMatcher}`]: isUuid,
	[`${ipv4Matcher}`]: isIpv4,
	[`${ipv6Matcher}`]: isIpv6,
	[`${iso8601Matcher}`]: isIso8601
}

// a whole string of one atom repeated without bound, e.g. /^[ab]+$/
const repeatedAtom =
	/^\^(?:\[(?:[^\\\]]|\\.)*]|\\[DSWdsw]|\\[^\dA-Za-z]|[^$()*+?[\\\]^{|}])(?:[*+]|{\d+,})\$$/

// m changes what ^ and $ match, v what a class holds and g or y where it
// starts matching
const isRepeatedAtom = (rule: string, flags: string | undefined) =>
	(flags === undefined || /^[disu]*$/.test(flags)) && repeatedAtom.test(rule)

// a string definition's regex literal reads a backslash as an escape only
// before a /, so its source is written as it is but for each / and, as a
// RegExp writes them, its line terminators
const escapesInRegexLiteral: Record<string, string> = {
	"/": "\\/",
	"\n": "\\n",
	"\r": "\\r",
	"\u2028": "\\u2028",
	"\u2029": "\\u2029"
}

const writeRegexLiteral = (rule: string, flags = ""): string =>
	`/${rule.replace(/\\.|[\n\r/\u2028\u2029]/g, token => escapesInRegexLiteral[token] ?? token)}/${flags}`

export class PatternNode extends InternalPrimitiveConstraint<Pattern.Declaration> {
	constructor(
		...args: ConstructorParameters<typeof InternalPrimitiveConstraint>
	) {
		super(...args)
		this.costly = true
	}

	readonly instance: RegExp = new RegExp(this.rule, this.flags)
	readonly expression: string = writeRegexLiteral(this.rule, this.flags)
	readonly test: ((s: string) => boolean) | undefined =
		testsByExpression[`${this.instance}`]
	private readonly isRepeated = isRepeatedAtom(this.rule, this.flags)
	// g and y make test start from lastIndex, which it also advances
	private readonly resetsLastIndex =
		this.instance.global || this.instance.sticky

	traverseAllows: (string: string) => boolean =
		this.test ??
		(this.isRepeated ? string => matchesRepeated(this.instance, string)
		: this.resetsLastIndex ?
			string => {
				this.instance.lastIndex = 0
				return this.instance.test(string)
			}
		:	this.instance.test.bind(this.instance))

	// a ref, so a pattern the engine rejects fails only its definition. A
	// size build reads the RegExp, smaller than its test with what that calls
	compileCondition(js: NodeCompiler, data: string): string {
		if (this.test && !js.shortest) return `${js.ref(this.test)}(${data})`
		const instance = js.ref(this.instance)
		if (this.isRepeated)
			return `${js.ref(matchesRepeated)}(${instance}, ${data})`
		return this.resetsLastIndex ?
				`(${instance}.lastIndex = 0, ${instance}.test(${data}))`
			:	`${instance}.test(${data})`
	}

	readonly implied: BaseRoot = $ark.intrinsic.string.internal
}

export const Pattern = {
	implementation,
	Node: PatternNode
}
