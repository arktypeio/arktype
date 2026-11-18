import { CompileLive, Step } from "./CompileLive.tsx"
import { HomeCode, PlainCode } from "./HomeCode.tsx"

const source = `const Shape = type({
	kind: "'circle'",
	radius: "number > 0"
}).or({
	kind: "'square'",
	side: "number > 0"
})`

const emitted = `data => {
	switch (data?.kind) {
		case "circle":
			return Number.isFinite(data.radius) && data.radius > 0
		case "square":
			return Number.isFinite(data.side) && data.side > 0
	}
	return false
}`

/** vite.config.ts with the plugin added: the lines marked true are the ones you add */
const config: [line: string, added: boolean][] = [
	['import { defineConfig } from "vite"', false],
	['import { precompile } from "@ark/aot/unplugin"', true],
	["", false],
	["export default defineConfig({", false],
	["\tplugins: [precompile.vite()]", true],
	["})", false]
]

/**
 * The whole build step, in the order it happens: the two lines that add the
 * plugin, a definition, and what the build makes of it (the union's
 * discriminator found, one switch, each branch checking only what's left).
 * landing.css plays the three in turn once the figure is seen; the markup is
 * all three, finished. The definition can then be edited, and CompileLive
 * runs the precompiler itself on what the reader types.
 */
export const Compile = () => (
	<div className="compile" data-stage="compile">
		<figure className="code-card compile-config">
			<figcaption>
				<Step n={1}>add the plugin</Step>
				<span>vite.config.ts</span>
			</figcaption>
			<pre className="diff" aria-label="vite.config.ts, with two lines added">
				{config.map(([line, added], i) => (
					<span key={i} className={added ? "diff-add" : "diff-same"}>
						<span className="diff-mark" aria-hidden>
							{added ? "+" : " "}
						</span>
						{line || " "}
					</span>
				))}
			</pre>
		</figure>
		<CompileLive
			source={source}
			input={<HomeCode code={source} />}
			output={<PlainCode code={emitted} />}
			lines={emitted.split("\n").length}
		/>
	</div>
)
