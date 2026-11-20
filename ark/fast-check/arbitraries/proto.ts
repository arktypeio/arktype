import type { nodeOfKind } from "arktype/schema"
import { throwError, type Constructor } from "arktype/util"
import * as fc from "fast-check"
import { buildStructureArbitrary } from "../buildArbitrary.ts"
import type { Ctx } from "../fastCheckContext.ts"
import { buildDateArbitrary } from "./date.ts"

const basicProtoAllowedKeys = ["proto", "notEqual"] as const
const dateProtoAllowedKeys = ["proto", "after", "before", "notEqual"] as const

const assertSupportedProtoConstraints = (
	node: ProtoInputNode,
	allowedKeys: readonly string[]
): void => {
	if (!node.is("intersection")) return
	const unsupported = Object.keys(node.inner).filter(
		key =>
			node.inner[key as keyof typeof node.inner] !== undefined &&
			!allowedKeys.includes(key)
	)
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
			assertSupportedProtoConstraints(node, basicProtoAllowedKeys)
			return fc.uniqueArray(fc.anything()).map(arr => new Set(arr))
		}
	],
	[
		Map,
		node => {
			assertSupportedProtoConstraints(node, basicProtoAllowedKeys)
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
			assertSupportedProtoConstraints(node, basicProtoAllowedKeys)
			return fc
				.string()
				.map(s => new RegExp(s.replace(/[$()*+.?[\\\]^{|}]/g, "\\$&")))
		}
	],
	[
		URL,
		node => {
			assertSupportedProtoConstraints(node, basicProtoAllowedKeys)
			return fc.webUrl().map(u => new URL(u))
		}
	],
	[
		Error,
		node => {
			assertSupportedProtoConstraints(node, basicProtoAllowedKeys)
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
