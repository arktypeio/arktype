import {
	entriesOf,
	hasDomain,
	includes,
	isArray,
	printable,
	throwParseError,
	transform,
	type Dict
} from "@arktype/util"
import type { BaseAttachments, Node, UnknownNode } from "./base.js"
import { maybeGetBasisKind } from "./bases/basis.js"
import type { Schema } from "./schema.js"
import type { parseSchemaBranches, validateSchemaBranch } from "./sets/union.js"
import {
	defaultInnerKeySerializer,
	refinementKinds,
	type NodeKind,
	type SchemaKind,
	type SchemaParseContext,
	type SchemaParseContextInput,
	type UnknownNodeImplementation
} from "./shared/define.js"
import {
	NodeImplementationByKind,
	type Definition,
	type NormalizedDefinition,
	type reducibleKindOf
} from "./shared/nodes.js"
import { isNode } from "./shared/registry.js"

export class SchemaScope<resolutions extends Dict = Dict> {
	declare infer: resolutions
	resolutions: Record<string, Schema> = {}

	private constructor(aliases: Dict<string, Definition<SchemaKind>>) {
		transform(aliases, ([k, v]) => {
			return [k, parseSchemaFromKinds(schemaKinds, v)]
		})
	}

	parseUnion<const branches extends readonly unknown[]>(
		input: {
			branches: {
				[i in keyof branches]: validateSchemaBranch<branches[i], resolutions>
			}
		} & NormalizedDefinition<"union">
	): parseSchemaBranches<branches> {
		return this.parseNode("union", input, { scope: this }) as never
	}

	parseBranches<const branches extends readonly unknown[]>(
		...branches: {
			[i in keyof branches]: validateSchemaBranch<branches[i], resolutions>
		}
	): parseSchemaBranches<branches> {
		return this.parseNode("union", branches) as never
	}

	parseUnits<const branches extends readonly unknown[]>(
		...values: branches
	): branches["length"] extends 1
		? Node<"unit", branches[0]>
		: Node<"union" | "unit", branches[number]> {
		const uniqueValues: unknown[] = []
		for (const value of values) {
			if (!uniqueValues.includes(value)) {
				uniqueValues.push(value)
			}
		}
		const branches = uniqueValues.map((unit) =>
			this.parsePrereducedSchema("unit", { is: unit })
		)
		if (branches.length === 1) {
			return branches[0]
		}
		return this.parsePrereducedSchema("union", {
			branches
		}) as never
	}

	parsePrereducedSchema<kind extends SchemaKind>(
		kind: kind,
		input: Definition<kind>
	): Node<kind> {
		return this.parseNode(kind, input, {
			prereduced: true
		}) as never
	}

	parseSchemaFromKinds<defKind extends SchemaKind>(
		allowedKinds: readonly defKind[],
		input: unknown
	): Node<reducibleKindOf<defKind>> {
		const kind = schemaKindOf(input)
		if (!allowedKinds.includes(kind as never)) {
			return throwParseError(
				`Schema of kind ${kind} should be one of ${allowedKinds}`
			)
		}
		return this.parseNode(kind, input as never, {}) as never
	}

	static parseCache: Record<string, Node> = {}

	parseNode<defKind extends NodeKind>(
		kind: defKind,
		input: Definition<defKind>,
		ctxInput?: SchemaParseContextInput
	): Node<reducibleKindOf<defKind>> {
		if (isNode(input)) {
			return input as never
		}
		const implementation: UnknownNodeImplementation = NodeImplementationByKind[
			kind
		] as never
		const inner: Record<string, unknown> = {}
		const normalizedInput: any = implementation.normalize?.(input) ?? input
		const ctx: SchemaParseContext<any> = {
			...ctxInput,
			input: normalizedInput,
			scope: this
		}
		implementation.addContext?.(ctx)
		const schemaEntries = entriesOf(normalizedInput).sort((l, r) =>
			l[0] < r[0] ? -1 : 1
		)
		let json: Record<string, unknown> = {}
		let typeJson: Record<string, unknown> = {}
		const children: UnknownNode[] = []
		for (const [k, v] of schemaEntries) {
			const keyDefinition = implementation.keys[k]
			if (!(k in implementation.keys)) {
				return throwParseError(`Key ${k} is not valid on ${kind} schema`)
			}
			const innerValue = keyDefinition.parse ? keyDefinition.parse(v, ctx) : v
			if (innerValue === undefined && !keyDefinition.preserveUndefined) {
				continue
			}
			inner[k] = innerValue
			if (isNode(innerValue)) {
				json[k] = innerValue.collapsibleJson
				children.push(innerValue)
			} else if (
				isArray(innerValue) &&
				innerValue.every((_): _ is UnknownNode => isNode(_))
			) {
				json[k] = innerValue.map((node) => node.collapsibleJson)
				children.push(...innerValue)
			} else {
				json[k] = keyDefinition.serialize
					? keyDefinition.serialize(v)
					: defaultInnerKeySerializer(v)
			}
			if (!keyDefinition.meta) {
				typeJson[k] = json[k]
			}
		}
		if (!ctx.prereduced) {
			if (implementation.reduce) {
				const reduced = implementation.reduce(inner, ctx)
				if (reduced) {
					return reduced as never
				}
			}
		}
		const innerEntries = entriesOf(inner)
		let collapsibleJson = json
		if (
			innerEntries.length === 1 &&
			innerEntries[0][0] === implementation.collapseKey
		) {
			collapsibleJson = json[implementation.collapseKey] as never
			if (hasDomain(collapsibleJson, "object")) {
				json = collapsibleJson
				typeJson = collapsibleJson
			}
		}
		const id = kind + JSON.stringify(json)
		if (id in SchemaScope.parseCache) {
			return SchemaScope.parseCache[id] as never
		}
		const typeId = kind + JSON.stringify(typeJson)
		if (
			$ark.BaseNode.isInitialized &&
			$ark.BaseNode.builtins.unknownUnion.typeId === typeId
		) {
			return $ark.BaseNode.builtins.unknown as never
		}
		const attachments = {
			kind,
			inner,
			entries: innerEntries,
			json,
			typeJson,
			collapsibleJson,
			children,
			id,
			typeId,
			scope: this
		} satisfies Record<keyof BaseAttachments<any>, unknown>
		return includes(refinementKinds, kind)
			? new ($ark.BaseNode as any)(attachments)
			: new ($ark.SchemaNode as any)(attachments)
	}
}

const schemaKindOf = (input: unknown): SchemaKind => {
	const basisKind = maybeGetBasisKind(input)
	if (basisKind) {
		return basisKind
	}
	if (typeof input === "object" && input !== null) {
		if (isNode(input)) {
			if (input.isSchema()) {
				return input.kind
			}
			// otherwise, error at end of function
		} else if ("morph" in input) {
			return "morph"
		} else if ("branches" in input || isArray(input)) {
			return "union"
		} else {
			return "intersection"
		}
	}
	return throwParseError(`${printable(input)} is not a valid type schema`)
}

export type validateAliases<aliases> = {
	[k in keyof aliases]: "branches" extends keyof aliases[k]
		? NormalizedDefinition<"union">
		: aliases[k] extends readonly [...infer branches]
		  ? { [i in keyof branches]: validateSchemaBranch<branches[i], aliases> }
		  : validateSchemaBranch<aliases[k], aliases>
}

export const parseSchemaScope = <const aliases>(
	aliases: validateAliases<aliases>
) => new (SchemaScope as any)(aliases)

const z = parseSchemaScope({
	number: ["number", "string"],
	ordered: {
		ordered: true,
		branches: ["string"]
	}
})
