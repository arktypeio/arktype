import type { TypeNode } from "../base.js"
import { ScopeNode } from "../scope.js"
import type { schema } from "./keywords.js"

export namespace TsKeywords {
	export interface resolutions {
		any: TypeNode<any, "intersection">
		bigint: TypeNode<bigint, "domain">
		boolean: TypeNode<boolean, "union">
		false: TypeNode<false, "unit">
		never: TypeNode<never, "union">
		null: TypeNode<null, "unit">
		number: TypeNode<number, "domain">
		object: TypeNode<object, "domain">
		string: TypeNode<string, "domain">
		symbol: TypeNode<symbol, "domain">
		true: TypeNode<true, "unit">
		unknown: TypeNode<unknown, "intersection">
		void: TypeNode<void, "unit">
		undefined: TypeNode<undefined, "unit">
	}

	export type infer = (typeof TsKeywords)["infer"]
}

export const TsKeywords: ScopeNode<TsKeywords.resolutions> = ScopeNode.from(
	{
		any: {} as schema.cast<any, "intersection">,
		bigint: "bigint",
		// since we know this won't be reduced, it can be safely cast to a union
		boolean: [{ unit: false }, { unit: true }] as schema.cast<boolean, "union">,
		false: { unit: false },
		never: [],
		null: { unit: null },
		number: "number",
		object: "object",
		string: "string",
		symbol: "symbol",
		true: { unit: true },
		unknown: {},
		void: { unit: undefined } as schema.cast<void, "unit">,
		undefined: { unit: undefined }
	},
	{ prereducedAliases: true }
)
