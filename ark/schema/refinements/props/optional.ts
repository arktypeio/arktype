import type { Node, TypeSchema } from "../../base.js"
import type { CompilationContext } from "../../scope.js"
import type { Problems } from "../../shared/compilation.js"
import type { declareNode, withAttributes } from "../../shared/declare.js"
import type { NodeParserImplementation, TypeKind } from "../../shared/define.js"
import { Disjoint } from "../../shared/disjoint.js"
import type { NodeIntersections } from "../../shared/intersect.js"
import type { Schema } from "../../shared/nodes.js"
import { compileSerializedValue } from "../../shared/registry.js"
import { RefinementNode } from "../shared.js"
import { compilePresentProp } from "./shared.js"

export type OptionalInner = {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type OptionalSchema = withAttributes<{
	readonly key: string | symbol
	readonly value: TypeSchema
}>

export type OptionalDeclaration = declareNode<{
	kind: "optional"
	schema: OptionalSchema
	normalizedSchema: OptionalSchema
	inner: OptionalInner
	intersections: {
		optional: "optional" | null
	}
	checks: object
}>

export class OptionalNode extends RefinementNode<OptionalDeclaration> {
	static parser: NodeParserImplementation<OptionalDeclaration> = {
		keys: {
			key: {},
			value: {
				child: true,
				parse: (schema, ctx) => ctx.scope.parseTypeNode(schema)
			}
		},
		normalize: (schema) => schema
	}

	static intersections: NodeIntersections<OptionalDeclaration> = {
		optional: (l, r) => {
			if (l.key !== r.key) {
				return null
			}
			const optional = l.key
			const value = l.value.intersect(r.value)
			return {
				key: optional,
				value:
					value instanceof Disjoint ? (l.scope.builtin.never as never) : value
			}
		}
	}

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
		return `if(${this.serializedKey} in ${ctx.arg}) {
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
