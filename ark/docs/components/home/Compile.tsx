import { CompileLive, Step, type Try } from "./CompileLive.tsx"
import { emit } from "./emit.ts"
import { HomeCode } from "./HomeCode.tsx"

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
	throw new Error(`The homepage's Shape doesn't precompile: ${emitted.message}`)

const edited = (from: string, to: string) => {
	if (!source.includes(from))
		throw new Error(`The homepage's Shape no longer has ${from} to edit`)
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

type ConfigLine = {
	text: string
	/** a line you add */
	added?: true
	/** the one line a phone keeps, where the whole file doesn't fit a glance */
	key?: true
}

/** vite.config.ts with the plugin added */
const config: ConfigLine[] = [
	{ text: 'import { defineConfig } from "vite"' },
	{ text: 'import { precompile } from "@ark/aot/unplugin"', added: true },
	{ text: "" },
	{ text: "export default defineConfig({" },
	{ text: "\tplugins: [precompile.vite()]", added: true, key: true },
	{ text: "})" }
]

/**
 * The whole build step, in the order it happens: the two lines that add the
 * plugin, a definition, and what the build makes of it (the union's
 * discriminator found, one switch, each branch handed to its own check).
 * The markup is all three, finished, with the output dimmed until
 * landing.css has read the definition: the payoff is on screen from the
 * first frame. The definition can then be edited, and CompileLive runs
 * the precompiler itself on what the reader types.
 */
export const Compile = () => (
	<div className="compile" data-stage="compile">
		<figure className="code-card compile-config">
			<figcaption>
				<Step n={1}>add the plugin</Step>
				<span>vite.config.ts</span>
			</figcaption>
			<pre className="diff" aria-label="vite.config.ts, with two lines added">
				{config.map((line, i) => (
					<span
						key={i}
						className={line.added ? "diff-add" : "diff-same"}
						data-key={line.key ? "" : undefined}
					>
						<span className="diff-mark" aria-hidden>
							{line.added ? "+" : " "}
						</span>
						{line.text || " "}
					</span>
				))}
			</pre>
		</figure>
		<CompileLive
			source={source}
			input={<HomeCode code={source} />}
			initial={emitted}
			tries={tries}
		/>
	</div>
)
