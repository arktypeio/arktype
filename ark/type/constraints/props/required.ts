import { compileSerializedValue } from "@arktype/util"
import type { Node, TypeSchema } from "../../base.js"
import type { NodeCompiler } from "../../shared/compile.js"
import type { TraverseAllows, TraverseApply } from "../../shared/context.js"
import type { BaseMeta, declareNode } from "../../shared/declare.js"
import { Disjoint } from "../../shared/disjoint.js"
import type {
	ConstraintIntersection,
	TypeKind,
	nodeImplementationOf
} from "../../shared/implement.js"
import { BaseConstraint } from "../constraint.js"

export interface RequiredSchema extends BaseMeta {
	readonly key: string | symbol
	readonly value: TypeSchema
}

export interface RequiredInner extends BaseMeta {
	readonly key: string | symbol
	readonly value: Node<TypeKind>
}

export type RequiredDeclaration = declareNode<{
	kind: "required"
	schema: RequiredSchema
	normalizedSchema: RequiredSchema
	inner: RequiredInner
	errorContext: {
		code: "required"
		key: string | symbol
	}
	prerequisite: object
	intersectionIsOpen: true
	childKind: TypeKind
}>

const intersectNamed: ConstraintIntersection<
	"required",
	"required" | "optional"
> = (l, r, $) => {
	if (l.key !== r.key) {
		return null
	}
	const key = l.key
	const value = l.value.intersect(r.value)
	if (value instanceof Disjoint) {
		return value.withPrefixKey(l.compiledKey)
	}
	return $.parseSchema("required", {
		key,
		value
	})
}

export class RequiredNode extends BaseConstraint<RequiredDeclaration> {
	static implementation: nodeImplementationOf<RequiredDeclaration> =
		this.implement({
			hasAssociatedError: true,
			intersectionIsOpen: true,
			keys: {
				key: {},
				value: {
					child: true,
					parse: (schema, ctx) => ctx.$.parseTypeSchema(schema)
				}
			},
			normalize: (schema) => schema,
			defaults: {
				description(node) {
					return `${node.compiledKey}: ${node.value.description}`
				},
				expected() {
					return "provided"
				},
				actual: () => null
			},
			intersections: {
				required: intersectNamed,
				optional: intersectNamed
			}
		})

	readonly impliedBasis = this.$.tsKeywords.object
	readonly serializedKey = compileSerializedValue(this.key)
	readonly compiledKey =
		typeof this.key === "string" ? this.key : this.serializedKey
	readonly expression = `${this.compiledKey}: ${this.value}`

	readonly errorContext = Object.freeze({
		code: "required",
		description: this.description,
		key: this.key
	})

	traverseAllows: TraverseAllows<object> = (data, ctx) => {
		if (this.key in data) {
			return this.value.traverseAllows((data as any)[this.key], ctx)
		}
		return false
	}

	traverseApply: TraverseApply<object> = (data, ctx) => {
		if (this.key in data) {
			this.value.traverseApply((data as any)[this.key], ctx)
		} else {
			ctx.error(this.errorContext)
		}
	}

	compile(js: NodeCompiler) {
		js.if(`${this.serializedKey} in ${js.data}`, () =>
			js.checkLiteralKey(this.key, this.value)
		).else(() =>
			js.traversalKind === "Allows"
				? js.return(false)
				: js.line(`${js.ctx}.error(${JSON.stringify(this.errorContext)})`)
		)
		if (js.traversalKind === "Allows") {
			js.return(true)
		}
	}
}
