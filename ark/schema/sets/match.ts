// import { type declareNode, type withAttributes } from "../base.js"
// import { type Disjoint } from "../disjoint.js"
// import { type Node, type Schema } from "../nodes.js"
// import { BaseRoot } from "../root.js"
// import { type Morph } from "./morph.js"
// import { type UnionChildKind } from "./union.js"

// export type MatchChildKind = "union" | UnionChildKind

// export type MatchNodeEntry = [
// 	when: Node<MatchChildKind>,
// 	then: Morph,
// 	out?: Node<MatchChildKind>
// ]

// // TODO: no morphs?
// export type MatchSchemaEntry = [
// 	when: Schema<MatchChildKind>,
// 	then: Morph,
// 	out?: Schema<MatchChildKind>
// ]

// export type MatchInner = withAttributes<{
// 	readonly match: readonly MatchNodeEntry[]
// }>

// export type MatchSchema = ExpandedMatchSchema | CollapsedMatchSchema

// export type ExpandedMatchSchema = withAttributes<{
// 	readonly match: readonly MatchSchemaEntry[]
// }>

// export type CollapsedMatchSchema = ExpandedMatchSchema["match"]

// export type MatchDeclaration = declareNode<{
// 	kind: "match"
// 	schema: MatchSchema
// 	inner: MatchInner
// 	intersections: {
// 		match: "match" | Disjoint
// 	}
// }>

// export class MatchNode<t = unknown> extends BaseRoot<MatchDeclaration, t> {
// 	static readonly kind = "match"
// 	static readonly declaration: MatchDeclaration

// 	static definition = this.define({
// 		kind: "match",
// 		keys: {
// 			match: {
// 				children: (entries) => entries.map((entry) => entry[0])
// 			}
// 		},
// 		intersections: {
// 			match: (l, r) => l
// 		},
// 		parseSchema: (schema) => {
// 			return schema as never
// 		},
// 		compileCondition: (inner) => "true",
// 		writeDefaultDescription: (inner) => "",
// 		children: (inner) => inner.match.map((entry) => entry[0])
// 	})
// }
