import { unset } from "@ark/util"
import type { BaseRoot } from "../roots/root.ts"
import { CompiledFunction } from "./compile.ts"
import { ArkTraversal } from "./errors.ts"
import { TransformErrors } from "./transform.ts"
import {
	addTransformErrors,
	allowsAcyclic,
	allowsInContext,
	applyCyclic,
	applyRejected,
	transformResolution
} from "./traversal.ts"

export const rootApplyRuntime = {
	Traversal: ArkTraversal,
	TransformErrors,
	addTransformErrors,
	applyCyclic,
	applyRejected,
	allowsAcyclic,
	allowsInContext,
	transformResolution
}

const nodeMembers = ["allows", "traverseAllows", "traverseTransform"]

export const rootApplyParams = [
	"node",
	"config",
	...Object.keys(rootApplyRuntime)
] as const

export type RootApplyParam = "config" | keyof typeof rootApplyRuntime

// name keys the root's resolution, so it must be what its unit names it
export const writeRootApply = (
	node: BaseRoot,
	name: string,
	// an artifact writing the apply into its own code names what it reads as its module does
	refOf?: (param: RootApplyParam) => string
): string => {
	const ref = refOf ?? ((param: RootApplyParam) => param)
	const js = new CompiledFunction("data", "onFail").indent()
	const applyFailed = new CompiledFunction("data", "onFail").indent()
	const newCtx = `new ${ref("Traversal")}(data, ${ref("config")})`
	// a node called without a handler fails with its own, which a validator passes itself
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
	// a valid result is often data itself, which is cheaper to compare than instanceof
	const returnResult = () =>
		node.includesMorph ?
			js
				.if(
					`result !== data && result instanceof ${ref("TransformErrors")}`,
					() =>
						js
							.const("ctx", newCtx)
							.line(`${ref("addTransformErrors")}(ctx, result)`)
							.return(`ctx.finalize(${handler})`)
				)
				.return("result")
		:	js.return("result")
	// a valid result is returned last, as V8 weighs a return by its offset when optimizing
	if (node.rootApplyStrategy === "contextual") {
		// failing in its own function lets V8 inline Allows and remove the ctx it allocates
		fallback(applyFailed)
		js.const("ctx", newCtx)
			.if("!traverseAllows(data, ctx) || ctx.hasError()", () =>
				js.return("applyFailed(data, onFail)")
			)
			.return("data")
	} else if (node.rootApplyStrategy === "allows")
		js.if("!allows(data)", fallback).return("data")
	else if (node.rootApplyStrategy === "contextualTransform") {
		if (node.includesAlias) {
			js.const("untracked", `${ref("allowsAcyclic")}(node, data)`)
				.if(
					`!(untracked ?? ${ref("allowsInContext")}(node, data, ${ref("config")}))`,
					fallback
				)
				.const("ctx", newCtx)
				.set("ctx.tracksTransforms", "untracked === undefined")
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
	} else if (node.hasKind("union") && !node.compiledDiscriminant) {
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
	const read = nodeMembers.filter(member =>
		new RegExp(`\\b${member}\\b`).test(rootApply)
	)
	// a Function's body is sloppy unless it says otherwise, where an artifact's module decides for the code in it
	return `${refOf ? "" : `"use strict"\n`}const ${read.map(member => `${member} = node.${member}`).join(", ")}
${rootApply}`
}
