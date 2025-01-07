import { attest } from "@ark/attest"
import { flatMorph, groupBy } from "@ark/util"
import { ark, type } from "arktype"
import { SyntaxKind, type JSDocableNode } from "ts-morph"
import { getAllJsdoc } from "./jsdocGen.ts"

// type stats on attribute removal merge 12/18/2024
// {
//     "checkTime": 10.98,
//     "types": 409252,
//     "instantiations": 5066185
// }

const t = type({ name: "string" })

const docs = getAllJsdoc()

const jsdocsByName = flatMorph(docs, (i, doc) => {
	const apiGroup = doc
		.getTags()
		.find(t => t.getTagName() === "api")
		?.getCommentText()

	if (!apiGroup) return []

	return [{ group: apiGroup }, doc.getCommentText()]
})

const result = flatMorph({ a: true, b: false, c: 0, d: 1 }, (k, v) =>
	typeof v === "boolean" ?
		([{ group: "bools" }, v] as const)
	:	([{ group: "nums" }, v] as const)
)
