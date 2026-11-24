import { highlight } from "../../lib/content/highlight.ts"
import { preToJsx } from "../CodeBlock.tsx"
import { CompileLive, type Try } from "../precompile/CompileLive.tsx"
import { shapeEmitted, shapeSource } from "../precompile/shape.ts"
import { Guarantee } from "./Guarantee.tsx"

const edited = (from: string, to: string) => {
	if (!shapeSource.includes(from))
		throw new Error(`The homepage's Shape no longer has ${from} to edit`)
	return shapeSource.replace(from, to)
}

const loginPreset = `const Login = type({
	email: "string.email",
	password: "string >= 8"
})`

const mcpPreset = `const SearchArgs = type({
	query: "string > 0",
	"limit?": "1 <= number.integer <= 50"
})`

const impossiblePreset = edited(
	'side: "number > 0"',
	'side: "number > 5 & number < 3"'
)

const homeTries: Try[] = [
	{ label: "login form", source: loginPreset },
	{ label: "MCP tool", source: mcpPreset },
	{ label: "impossible type → build stops", source: impossiblePreset }
]

/**
 * The homepage's @ark/aot figure: leads with the live in-browser precompiler
 * ("Your type in. Plain JavaScript out.") and puts the build-refusal
 * diagnostic in a second tab so readers see what ships first and the safety
 * guarantee one click away.
 */
export const HomePrecompile = async () => (
	<div className="aot-stage" data-tabs="aot">
		<div className="stage-tabs" role="tablist" aria-label="@ark/aot views">
			<button
				type="button"
				role="tab"
				className="stage-tab"
				id="aot-tab-live"
				aria-selected="true"
				aria-controls="aot-panel-live"
				data-tab="live"
			>
				<b>Live @ark/aot</b>
			</button>
			<button
				type="button"
				role="tab"
				className="stage-tab"
				id="aot-tab-guard"
				aria-selected="false"
				aria-controls="aot-panel-guard"
				tabIndex={-1}
				data-tab="guard"
			>
				<b>When it can't precompile</b>
			</button>
		</div>
		<div
			className="stage-panel"
			id="aot-panel-live"
			role="tabpanel"
			aria-labelledby="aot-tab-live"
			data-panel="live"
		>
			<div className="compile">
				<CompileLive
					source={shapeSource}
					input={preToJsx(await highlight(shapeSource))}
					initial={shapeEmitted}
					tries={homeTries}
					fileName="schema.ts"
				/>
			</div>
		</div>
		<div
			className="stage-panel"
			id="aot-panel-guard"
			role="tabpanel"
			aria-labelledby="aot-tab-guard"
			data-panel="guard"
			data-closed=""
		>
			<Guarantee />
		</div>
	</div>
)
