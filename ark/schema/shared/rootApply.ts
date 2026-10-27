import { unset } from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import { CompiledFunction } from "./compile.ts"
import { applyUnread, ArkTraversal } from "./errors.ts"
import { TransformErrors } from "./transform.ts"
import {
	addMorphErrors,
	allowsAcyclic,
	allowsInContext,
	applyCyclic,
	transformResolution
} from "./traversal.ts"

export const rootApplyRuntime = {
	Traversal: ArkTraversal,
	TransformErrors,
	addMorphErrors,
	applyCyclic,
	applyRejected: applyUnread,
	allowsAcyclic,
	allowsInContext,
	transformResolution
}

export type RootApplyRuntime = typeof rootApplyRuntime

const nodeMembers = ["allows", "traverseAllows", "traverseTransform"]

export const rootApplyParams = [
	"node",
	"config",
	...Object.keys(rootApplyRuntime)
] as const

export type RootApplyParam = "config" | keyof RootApplyRuntime

// name keys the root's resolution, so it must be what its unit names it
export const writeRootApply = (node: BaseRoot, name: string): string => {
	const [reads, rootApply] = rootApplyParts(node, name)
	return `"use strict"\nconst ${reads.join(", ")}\n${rootApply}`
}

// the node members a root apply reads, as `member = node.member`, and its body
export const rootApplyParts = (
	node: BaseRoot,
	name: string,
	// names runtime values as the artifact's module does
	refOf?: (param: RootApplyParam) => string
): [reads: string[], body: string] => {
	const ref = refOf ?? ((param: RootApplyParam) => param)
	const js = new CompiledFunction("data", "onFail").indent()
	const applyFailed = new CompiledFunction("data", "onFail").indent()
	const newCtx = `new ${ref("Traversal")}(data, ${ref("config")})`
	// a validator passes its own handler
	const handler =
		refOf ? "onFail" : "onFail === undefined ? node.onFail : onFail"
	const fallback = (body: typeof js) =>
		node.includesAlias ?
			body.return(
				`${ref("applyCyclic")}(node, data, ${newCtx}).finalize(${handler})`
			)
		:	body.return(
				`${ref("applyRejected")}(node, data, ${ref("config")}, ${handler}, ${ref("Traversal")})`
			)
	const returnResult = () =>
		node.includesMorph ?
			js
				.if(
					`result !== data && typeof result === "function" && result instanceof ${ref("TransformErrors")}`,
					() =>
						js
							.const("ctx", newCtx)
							.line(`${ref("addMorphErrors")}(ctx, result)`)
							.return(`ctx.finalize(${handler})`)
				)
				.return("result")
		:	js.return("result")
	if (node.applyStrategy === "contextual") {
		// failure path is its own function
		fallback(applyFailed)
		js.const("ctx", newCtx)
			.if("!traverseAllows(data, ctx) || ctx.hasError()", () =>
				js.return("applyFailed(data, onFail)")
			)
			.return("data")
	} else if (node.applyStrategy === "allows")
		js.if("!allows(data)", fallback).return("data")
	else if (node.applyStrategy === "contextualTransform") {
		if (node.includesAlias) {
			js.const("untracked", `${ref("allowsAcyclic")}(node, data)`)
				.if(
					`!(untracked ?? ${ref("allowsInContext")}(node, data, ${ref("config")}))`,
					fallback
				)
				.const("ctx", newCtx)
				.set("ctx.tracksMorphs", "untracked === undefined")
				.const(
					"result",
					`${ref("transformResolution")}(ctx, "${name}", data, traverseTransform)`
				)
		} else {
			js.if("!allows(data)", fallback)
				.const("ctx", newCtx)
				.const("result", "traverseTransform(data, ctx)")
		}
		js.return(`ctx.hasError() ? ctx.finalize(${handler}) : result`)
	} else if (node.hasKind("union") && !node.discriminant) {
		js.const("result", "traverseTransform(data)").if(
			`result === ${JSON.stringify(unset)}`,
			fallback
		)
		returnResult()
	} else if (node.includesMorph) {
		js.if("!allows(data)", fallback).const("result", "traverseTransform(data)")
		returnResult()
	} else js.if("!allows(data)", fallback).return("traverseTransform(data)")
	const failurePath =
		applyFailed.body ?
			`const applyFailed = function ${applyFailed.write(`${name}ApplyFailed`)}\n`
		:	""
	const rootApply = `${failurePath}return (function ${js.write(`${name}RootApply`)})`
	const reads = nodeMembers
		.filter(member => new RegExp(`\\b${member}\\b`).test(rootApply))
		.map(member => `${member} = node.${member}`)
	return [reads, rootApply]
}
