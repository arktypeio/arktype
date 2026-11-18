import { highlight } from "../../lib/content/highlight.ts"
import { preToJsx } from "../CodeBlock.tsx"
import { CompileLive, type Try } from "./CompileLive.tsx"
import { shapeEmitted, shapeSource } from "./shape.ts"

const edited = (from: string, to: string) => {
	if (!shapeSource.includes(from))
		throw new Error(`The precompile page's Shape no longer has ${from} to edit`)
	return shapeSource.replace(from, to)
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
			source={shapeSource}
			input={preToJsx(await highlight(shapeSource))}
			initial={shapeEmitted}
			tries={tries}
		/>
	</div>
)
