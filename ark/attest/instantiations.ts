// import { caller } from "@arktype/fs"
// import { getBenchCtx } from "./bench/bench.js"
// import type { Measure, TypeUnit } from "./bench/measure.js"
// import { instantiationDataHandler } from "./bench/type.js"
// import { getConfig } from "./config.js"

// export const instantiations = () => ({
// 	instantiations: (
// 		...args: [instantiations?: Measure<TypeUnit> | undefined]
// 	) => {
// 		const attestConfig = getConfig()
// 		if (attestConfig.skipInlineInstantiations) {
// 			return
// 		}
// 		const calledFrom = caller()
// 		const ctx = getBenchCtx([calledFrom.file])
// 		ctx.isInlineBench = true
// 		ctx.benchCallPosition = calledFrom
// 		ctx.lastSnapCallPosition = calledFrom
// 		instantiationDataHandler({ ...ctx, kind: "instantiations" }, args[0], false)
// 	}
// })
