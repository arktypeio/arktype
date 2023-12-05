import type { Node } from "../../base.js"
import {
	In,
	compileSerializedValue,
	type CompilationContext,
	type Problems
} from "../../shared/compilation.js"
import type { declareNode, withAttributes } from "../../shared/declare.js"
import type { TypeKind } from "../../shared/define.js"
import type { Schema } from "../../shared/nodes.js"
import { RefinementNode } from "../shared.js"
import { compilePresentProp, type NamedPropAttachments } from "./shared.js"

export type OptionalInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type OptionalSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: Schema<TypeKind>
}>

export type OptionalDeclaration = declareNode<{
	kind: "optional"
	schema: OptionalSchema
	inner: OptionalInner
	intersections: {
		optional: "optional" | null
	}
	checks: object
}>

export class OptionalNode extends RefinementNode<typeof OptionalNode> {
	static readonly kind = "optional"
	static declaration: OptionalDeclaration
	static parser = this.composeParser({
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema
	})

	serializedKey = compileSerializedValue(this.key)

	traverseAllows = (data: object, problems: Problems) =>
		!(this.key in data) ||
		this.value.traverseAllows((data as any)[this.key], problems)

	traverseApply = (data: object, problems: Problems) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], problems)
		}
	}

	compileBody(ctx: CompilationContext): string {
		return `if(${this.serializedKey} in ${In}) {
			${compilePresentProp(this, ctx)}
		}`
	}

	compiledKey = typeof this.key === "string" ? this.key : this.serializedKey

	getCheckedDefinitions() {
		return ["object"] as const
	}

	writeDefaultDescription() {
		return `${String(this.compiledKey)}?: ${this.value}`
	}
}

// intersections: {
// 	optional: (l, r) => {
// 		if (l.key !== r.key) {
// 			return null
// 		}
// 		const optional = l.key
// 		const value = l.value.intersect(r.value)
// 		return {
// 			key: optional,
// 			value: value instanceof Disjoint ? l.scope.builtin.never : value
// 		}
// 	}
// },
