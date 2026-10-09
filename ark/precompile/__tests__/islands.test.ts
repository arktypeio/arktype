import { attest, contextualize } from "@ark/attest"
import { diagnosticsOf, precompile, statusesOf } from "./utils.ts"

contextualize(() => {
	it("leaves a marked site to arktype", () => {
		const source = `import { type } from "arktype"
import * as ark from "arktype"
export const A = type("string")
// @ark-runtime
export const B = type({ name: process.argv[2] })
export const C = process.argv.length > 2 ?
	// @ark-runtime
	ark.type(process.argv[2])
:	type("number")
// @ark-runtime
export const parsers = { type }`
		attest(statusesOf(source)).snap([
			"3:18 accepted string",
			"5:18 island",
			"8:2 island",
			"9:3 accepted number"
		])
		attest(precompile(source).code).snap(`import "arktype/internal/island.js"
import * as $ark$island from "arktype/internal"
import "arktype"
import "arktype"
export const A = $arkek65jf4484
// @ark-runtime
export const B = $ark$island.type({ name: process.argv[2] })
export const C = process.argv.length > 2 ?
	// @ark-runtime
	$ark$island.type(process.argv[2])
:	$ark1bp5ims0ip5
// @ark-runtime
export const parsers = { type: $ark$island.type }
import { vek65jf4484 as $arkek65jf4484 } from "~arktype/11mj219p8ni"
import { v1bp5ims0ip5 as $ark1bp5ims0ip5 } from "~arktype/11mj219p8ni"`)
	})

	it("means nothing in cache mode", () => {
		const source = `import { type } from "arktype"
// @ark-runtime
export const A = type({ name: process.argv[2] })`
		attest(statusesOf(source, {}, { runtime: "arktype" })).snap([
			"3:18 rejected\n  `process` is a global the build does not read"
		])
		attest(
			precompile(source, {}, { runtime: "arktype" }).code.includes("island")
		).equals(false)
	})

	it("marks what follows it", () => {
		attest(
			statusesOf(`import { type } from "arktype"
// @ark-runtime
// a comment between the marker and the site
export const A = type("string")
export const B = type({
	// @ark-runtime
	name: "string"
})
export const C = type("number") // @ark-runtime
export const D = type("boolean")`)
		).snap([
			"4:18 island",
			"5:18 accepted { name: string }",
			"9:18 accepted number",
			"10:18 island"
		])
	})

	it("fails for what an island reads that the build precompiles", () => {
		attest(
			diagnosticsOf(
				`import { type } from "arktype"
import { Base, makeId, makeName } from "./b.ts"
import * as b from "./b.ts"
export const User = type({ name: "string" })
// @ark-runtime
export const Admin = User.and({ role: process.argv[2] })
// @ark-runtime
export const Parsed = type("string").pipe(s => User.assert(JSON.parse(s)))
// @ark-runtime
export const Named = makeName(process.argv[2])
// @ark-runtime
export const Identified = makeId(process.argv[2])
// @ark-runtime
export const Extended = Base.and({ role: process.argv[2] })
// @ark-runtime
export const Wrapped = type({ shared: b.Shared, name: process.argv[2] })`,
				{
					"/b.ts": `import { type } from "arktype"
export const makeName = (def: string) => type({ name: def })
export const makeId = (def: string) =>
	// @ark-runtime
	type({ id: def })
// @ark-runtime
export const Base = type({ name: process.argv[2] })
export const Shared = type("string")`
				}
			)
		).snap([
			'/b.ts:2:42  `type` is arktype/runtime\'s outside a runtime island\n  the runtime island at /main.ts:10:1 reaches it through `makeName` (/b.ts:2:14)\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:6:22  `User` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".',
			'/main.ts:16:39  `b.Shared` is a precompiled validator, which a runtime island can only validate with\n  A runtime island runs on arktype, as must what it reads. Mark that definition // @ark-runtime too, or build with runtime: "arktype".'
		])
	})
})
