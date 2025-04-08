import {
	isKeyOf,
	printable,
	throwInternalError,
	type autocomplete,
	type Constructor,
	type Domain,
	type requireKeys,
	type satisfy
} from "@ark/util"
import type { Predicate } from "../predicate.ts"
import type { ConstraintKind } from "./implement.ts"
import type { JsonSchema } from "./jsonSchema.ts"

export class Unjsonifiable<
	code extends Unjsonifiable.Code = Unjsonifiable.Code
> {
	code: code
	ctx: Unjsonifiable.ContextByCode[code]

	constructor(code: code, ctx: typeof this.ctx) {
		this.code = code
		this.ctx = ctx
	}

	throw(): never {
		throw new Unjsonifiable.Error("")
	}

	static Error = class extends Error {}
	static throwInternalOperandError = (
		kind: ConstraintKind,
		schema: JsonSchema
	): never =>
		throwInternalError(
			`Unexpected JSON Schema input for ${kind}: ${printable(schema)}`
		)

	static writeMessage = (
		description: string,
		explanation?: UnjsonifiableExplanation
	): string => {
		let message = `${description} is not convertible to JSON Schema`

		if (explanation) {
			const normalizedExplanation =
				isKeyOf(explanation, unjsonifiableExplanations) ?
					unjsonifiableExplanations[explanation]
				:	explanation
			message += ` because ${normalizedExplanation}`
		}

		return message
	}
}

export declare namespace Unjsonifiable {
	export type Error = InstanceType<typeof Unjsonifiable>

	export type Value = object | symbol | bigint | undefined

	export type PatternIntersectionContext = {
		left: string
		right: string
	}

	export type UnitContext = {
		unit: Unjsonifiable.Value
	}

	export type DomainContext = {
		domain: satisfy<Domain, "symbol" | "bigint" | "undefined">
	}
	export type ProtoContext = {
		proto: Constructor
	}

	export type SymbolKeyContext = {
		key: symbol
	}

	export type IndexContext = {
		signature: JsonSchema.String
		value: JsonSchema
	}

	export type ArrayObjectContext = {
		array: JsonSchema.Array
		object: JsonSchema.Object
	}

	export type ArrayPostfixContext = {
		base: Postfixable
		elements: readonly JsonSchema[]
	}

	export type MorphContext = {
		in: JsonSchema
		out: JsonSchema
	}

	export type PredicateContext = {
		base: JsonSchema.Constrainable
		predicate: Predicate
	}

	export interface ContextByCode {
		patternIntersection: PatternIntersectionContext
		unit: UnitContext
		domain: DomainContext
		proto: ProtoContext
		symbolKey: SymbolKeyContext
		index: IndexContext
		arrayObject: ArrayObjectContext
		arrayPostfix: ArrayPostfixContext
		morph: MorphContext
		predicate: PredicateContext
	}

	export type HandlerByCode = satisfy<
		{ [code in Code]: (ctx: ContextByCode[code]) => unknown },
		{
			patternIntersection: (
				ctx: PatternIntersectionContext
			) => JsonSchema.String
			unit: (ctx: UnitContext) => JsonSchema
			domain: (ctx: DomainContext) => JsonSchema
			proto: (ctx: ProtoContext) => JsonSchema
			symbolKey: (ctx: SymbolKeyContext) => string | null
			index: (ctx: IndexContext) => JsonSchema
			arrayObject: (ctx: ArrayObjectContext) => JsonSchema
			arrayPostfix: (ctx: ArrayPostfixContext) => Postfixable
			morph: (ctx: MorphContext) => JsonSchema
			predicate: (ctx: PredicateContext) => JsonSchema.Constrainable
		}
	>
	export type Postfixable = requireKeys<JsonSchema.Array, "items">

	export type Code = keyof ContextByCode
}

const unjsonifiableExplanations = {
	morph:
		"it represents a transformation, while JSON Schema only allows validation. Consider creating a Schema from one of its endpoints using `.in` or `.out`.",
	cyclic:
		"cyclic types are not yet convertible to JSON Schema. If this feature is important to you, please add your feedback at https://github.com/arktypeio/arktype/issues/1087"
}

type UnjsonifiableExplanation = autocomplete<"morph" | "cyclic">
