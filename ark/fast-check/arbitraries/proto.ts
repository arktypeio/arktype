import type { nodeOfKind, RootSchema } from "arktype/schema"
import { isEmptyObject, throwError, type Constructor } from "arktype/util"
import * as fc from "fast-check"
import { buildStructureArbitrary } from "../buildArbitrary.ts"
import type { Ctx } from "../fastCheckContext.ts"
import { buildDateArbitrary } from "./date.ts"

const basicProtoAllowedKeys = [
	"proto",
	"notEqual",
	"predicate",
	"structure"
] as const
const dateProtoAllowedKeys = [
	"proto",
	"after",
	"before",
	"notEqual",
	"predicate",
	"structure"
] as const

const nonNegIntSchema = { domain: "number", divisor: 1, min: 0 } as const

const errorGuaranteedStructure: RootSchema = {
	domain: "object",
	required: [
		{ key: "message", value: "string" },
		{ key: "name", value: { unit: "Error" } }
	]
}

const collectionGuaranteedStructure: RootSchema = {
	domain: "object",
	required: [{ key: "size", value: nonNegIntSchema }]
}

const regExpGuaranteedStructure: RootSchema = {
	domain: "object",
	required: [
		{ key: "source", value: "string" },
		{ key: "flags", value: { unit: "" } }
	]
}

const urlGuaranteedStructure: RootSchema = {
	domain: "object",
	required: [
		{ key: "href", value: "string" },
		{ key: "origin", value: "string" },
		{ key: "protocol", value: "string" },
		{ key: "username", value: "string" },
		{ key: "password", value: "string" },
		{ key: "host", value: "string" },
		{ key: "hostname", value: "string" },
		{ key: "port", value: "string" },
		{ key: "pathname", value: "string" },
		{ key: "search", value: "string" },
		{ key: "hash", value: "string" }
	]
}

const isStructureSatisfied = (
	node: nodeOfKind<"intersection">,
	guaranteedStructure?: RootSchema
): boolean => {
	const structure = node.structure
	if (!structure || isEmptyObject(structure.inner)) return true
	if (!guaranteedStructure) return false
	const guaranteed = node.$.schema(guaranteedStructure)
	const required = node.$.schema({ domain: "object", structure })
	return guaranteed.extends(required)
}

const assertSupportedProtoConstraints = (
	node: ProtoInputNode,
	allowedKeys: readonly string[],
	guaranteedStructure?: RootSchema
): void => {
	if (!node.is("intersection")) return
	const unsupported = Object.keys(node.inner).filter(key => {
		if (node.inner[key as keyof typeof node.inner] === undefined) return false
		if (key === "structure")
			return !isStructureSatisfied(node, guaranteedStructure)
		return !allowedKeys.includes(key)
	})
	if (unsupported.length) {
		throwError(
			`${(node.basis as nodeOfKind<"proto">).proto.name} instances with ${unsupported.join(", ")} constraints can't be generated.`
		)
	}
}

const protoArbitraries = new Map<Constructor, ProtoArbitrary>([
	[
		Array,
		(node, ctx) =>
			node.is("proto") ?
				fc.array(fc.anything())
			:	buildStructureArbitrary(node, ctx)
	],
	[
		Set,
		node => {
			assertSupportedProtoConstraints(
				node,
				basicProtoAllowedKeys,
				collectionGuaranteedStructure
			)
			return fc.uniqueArray(fc.anything()).map(arr => new Set(arr))
		}
	],
	[
		Map,
		node => {
			assertSupportedProtoConstraints(
				node,
				basicProtoAllowedKeys,
				collectionGuaranteedStructure
			)
			return fc
				.array(fc.tuple(fc.anything(), fc.anything()))
				.map(entries => new Map(entries))
		}
	],
	[
		Date,
		node => {
			assertSupportedProtoConstraints(node, dateProtoAllowedKeys)
			return buildDateArbitrary(node)
		}
	],
	[
		RegExp,
		node => {
			assertSupportedProtoConstraints(
				node,
				basicProtoAllowedKeys,
				regExpGuaranteedStructure
			)
			return fc
				.string()
				.map(s => new RegExp(s.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")))
		}
	],
	[
		URL,
		node => {
			assertSupportedProtoConstraints(
				node,
				basicProtoAllowedKeys,
				urlGuaranteedStructure
			)
			return fc.webUrl().map(u => new URL(u))
		}
	],
	[
		Error,
		node => {
			assertSupportedProtoConstraints(
				node,
				basicProtoAllowedKeys,
				errorGuaranteedStructure
			)
			return fc.string().map(m => new Error(m))
		}
	]
])

export const buildProtoArbitrary = (
	proto: Constructor,
	node: ProtoInputNode,
	ctx: Ctx
): fc.Arbitrary<unknown> => {
	const builder = protoArbitraries.get(proto)
	if (!builder) throwError(`${proto.name} instances can't be generated`)
	return builder(node, ctx)
}

type ProtoArbitrary<t = unknown> = (
	node: ProtoInputNode,
	ctx: Ctx
) => fc.Arbitrary<t>

export type ProtoInputNode = nodeOfKind<"intersection"> | nodeOfKind<"proto">
