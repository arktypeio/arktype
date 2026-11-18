import { highlight } from "../../lib/content/highlight.ts"
import { preToJsx } from "../CodeBlock.tsx"
import { CompileLive, type Try } from "./CompileLive.tsx"
import { emit } from "./emit.ts"

const source = `const Shape = type({
	kind: "'circle'",
	radius: "number > 0"
}).or({
	kind: "'square'",
	side: "number > 0"
})`

/**
 * What ships for it: the precompiler's own output, written when the site is
 * built. Nothing here is typed by hand, so the figure can't show a check the
 * tool doesn't write, and the live editor (the same emit, in a worker) shows
 * this same code for this same text.
 */
const emitted = emit(source)
if (!emitted.ok)
	{throw new Error(
		`The precompile page's Shape doesn't precompile: ${emitted.message}`
	)}

const edited = (from: string, to: string) => {
	if (!source.includes(from))
		throw new Error(`The precompile page's Shape no longer has ${from} to edit`)
	return source.replace(from, to)
}

/** edits worth making, one press each: the last two are builds that stop */
const tries: Try[] = [
	{
		label: "add a field",
		source: edited(
			'radius: "number > 0"',
			'radius: "number > 0",\n\t"label?": "string"'
		)
	},
	{ label: "typo", source: edited('radius: "number', 'radius: "nubmer') },
	{
		label: "impossible type → build stops",
		source: edited('side: "number > 0"', 'side: "number > 5 & number < 3"')
	}
]

/**
 * A definition and what the build writes for it (the union's discriminator
 * found, one switch, each branch handed to its own check). What ships is the
 * precompiler's own output from when the site was built, so it is on the
 * page before any script runs. The definition can then be edited, and
 * CompileLive runs the precompiler itself on what the reader types.
 */
export const Compile = async () => (
	<div className="compile">
		<CompileLive
			source={source}
			input={preToJsx(await highlight(source))}
			initial={emitted}
			tries={tries}
		/>
	</div>
)
