import { buildPageTree, type PageTree } from "./pageTree.ts"
import { contentDir } from "./paths.ts"
import { checkRedirects } from "./redirects.ts"

let cached: PageTree | undefined
let lastReport = ""

const report = (problems: string[]) => {
	const text = problems.join("\n- ")
	if (!text || text === lastReport) return
	console.warn(`Docs problems:\n- ${text}`)
	lastReport = text
}

/**
 * The docs' page tree. A production build fails on any error; in
 * development errors are logged so one bad page doesn't take down the rest,
 * and the tree is rebuilt on every call so edits show up.
 */
export const getPageTree = (): PageTree => {
	if (cached) return cached
	const tree = buildPageTree(contentDir)
	const errors = [...tree.errors, ...checkRedirects(tree)]
	if (process.env.NODE_ENV !== "production") {
		report([...errors, ...tree.warnings])
		return tree
	}
	if (errors.length)
		throw new Error(`The docs have problems:\n- ${errors.join("\n- ")}`)
	report(tree.warnings)
	return (cached = tree)
}
