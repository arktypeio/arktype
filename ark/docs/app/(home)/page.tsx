import type { Metadata } from "next"
import Link from "next/link"
import { Board, BoardNote } from "../../components/home/Board.tsx"
import {
	CopyCommand,
	InstallButton
} from "../../components/home/CopyCommand.tsx"
import { Drill, Drills, Point } from "../../components/home/Drill.tsx"
import { evaluate } from "../../components/home/evaluate.ts"
import {
	Hero,
	heroLede,
	heroLine,
	type HeroProps
} from "../../components/home/Hero.tsx"
import { HomeCode, PlainCode } from "../../components/home/HomeCode.tsx"
import { HomeEffects } from "../../components/home/HomeEffects.tsx"
import { LiveType } from "../../components/home/LiveType.tsx"
import { Migrate } from "../../components/home/Migrate.tsx"
import { PickThree } from "../../components/home/PickThree.tsx"
import {
	Precompile,
	Size,
	Speed,
	Startup
} from "../../components/home/Points.tsx"
import { ClaimText } from "../../components/mdx/Claim.tsx"
import { BoatLane } from "../../components/shell/BoatLane.tsx"
import { SiteFooter } from "../../components/shell/SiteFooter.tsx"
import { withBase } from "../../lib/basePath.ts"
import { claims, draftOf } from "../../lib/claims.ts"
import { defineMetadata, tagline } from "../metadata.ts"

/**
 * What the first screen is titled with. `claim` is the headline lib/claims.ts
 * guards, and the board under it keeps its own title. `board` leads with that
 * title instead ("Pick 2" struck out), and the board goes untitled.
 */
const heroTitle: HeroProps["title"] = "claim"

const lede = `${draftOf(claims.headline)} ${heroLine} ${heroLede}`

const title = `ArkType · ${tagline}`

export const metadata: Metadata = {
	...defineMetadata({
		title,
		description: lede,
		url: "/",
		ogImageAlt: `${draftOf(claims.headline)} ${draftOf(claims.boardTitle)}`
	}),
	title: { absolute: title }
}

// two checks that reduce to one: no other validator's page can show that
const liveDefinition = "number % 2 & number % 3"
const liveArg = "9"

/** every prefix of the live definition, parsed by the real parser at build */
const ghostStates = Array.from(liveDefinition, (_, i) =>
	evaluate(liveDefinition.slice(0, i + 1), liveArg)
)

const snippets = {
	ts: `interface User {
	name: string
	email: string
	age?: number
	role: "admin" | "member"
}`,
	ark: `const User = type({
	name: "string",
	email: "string.email",
	"age?": "number.integer >= 0",
	role: "'admin' | 'member'"
})`,
	editor: `// @errors: 2322
const Item = type({
	id: "string",
	price: "number | strin",
	tags: "(string | number)[",
	status: "'draft' | 'live"
})`,
	runtime: `const User = type({
	name: "string",
	email: "string.email",
	"age?": "number.integer >= 0",
	role: "'admin' | 'member'"
})
// ---cut---
const out = User({ name: "Ada", email: "ada@", role: "owner" })

if (out instanceof type.errors) console.error(out.summary)
// email must be an email address
// role must be "admin" or "member"`,
	mcp: `import { McpServer } from "@modelcontextprotocol/server"

const server = new McpServer({ name: "greeter", version: "1.0.0" })
// ---cut---
server.registerTool(
	"greet",
	{
		description: "Greet someone by name",
		inputSchema: type({
			name: "string",
			"times?": "1 <= number.integer <= 5"
		})
	},
	async ({ name, times = 1 }) => ({
		content: [{ type: "text", text: \`Hi, \${name}! \`.repeat(times) }]
	})
)`,
	agent: `import { type } from "arktype"

export const SearchArgs = type({
	query: "string > 0",
	"limit?": "1 <= number.int <= 50"
})`,
	reduce: `const Six = type("number % 2 & number % 3")

Six.expression // "number % 6"`,
	morph: `const Port = type("string.integer.parse").to("0 < number <= 65535")

Port("8080") // 8080
// ArkErrors: must be at most 65535
Port("80000")`,
	extends: `const Email = type("string.email")

Email.extends("string") // true
type("string").extends(Email) // false`
}

const integrations = [
	["tRPC", "/docs/integrations#trpc"],
	["Hono", "/docs/integrations#hono"],
	["React Hook Form", "/docs/integrations#react-hook-form"],
	["oRPC", "/docs/integrations#orpc"],
	["Drizzle", "/docs/integrations#drizzle"],
	["MCP SDK", "/docs/integrations#mcp-sdk"],
	["AI SDK", "/docs/integrations#ai-sdk"]
]

type TerminalProps = {
	title: string
	label: string
	children: React.ReactNode
}

const Terminal = ({ title, label, children }: TerminalProps) => (
	<figure className="term" aria-label={label}>
		<div className="term-bar">
			<span className="dots" aria-hidden>
				<i />
				<i />
				<i />
			</span>
			<span>{title}</span>
		</div>
		<pre className="out">{children}</pre>
	</figure>
)

const Caption = ({ name, kind, aside }: Record<string, string>) => (
	<figcaption>
		<span>
			<b>{name}</b>
			<span className="dot">·</span>
			{kind}
		</span>
		<span>{aside}</span>
	</figcaption>
)

/** an agent's session, scripted around what tsc and ArkType really print; HomeEffects plays its steps in order */
const Transcript = () => (
	<figure
		className="term"
		data-term
		aria-label="An agent session: tsc reports number.int should be number.integer, the agent fixes it, and a bad tool call is rejected with readable messages"
	>
		<div className="term-bar">
			<span className="dots" aria-hidden>
				<i />
				<i />
				<i />
			</span>
			<span>agent · ~/app</span>
			<button className="term-replay" type="button">
				replay
			</button>
		</div>
		<ol className="term-body">
			<li className="t-user" data-step="0">
				<span className="t-prompt">›</span>add a search tool: a query and an
				optional limit, at most 50
			</li>
			<li className="t-call" data-step="1">
				<span className="t-dot" />
				<b>Write</b> src/tools/search.ts
			</li>
			<li className="t-code" data-step="1">
				<PlainCode code={snippets.agent} />
			</li>
			<li className="t-call" data-step="2">
				<span className="t-dot" />
				<b>Bash</b> <span className="t-cmd">tsc --noEmit</span>
			</li>
			<li className="t-out t-err" data-step="2">
				<span className="t-loc">src/tools/search.ts:5:2</span> -{" "}
				<span className="t-errc">error TS2322</span>: Type '"1 &lt;={" "}
				<mark>number.int</mark> &lt;= 50"' is not assignable to type '"1 &lt;={" "}
				<mark className="fix">number.integer</mark>"'.
			</li>
			<li className="t-call" data-step="3">
				<span className="t-dot" />
				<b>Edit</b> src/tools/search.ts
			</li>
			<li className="t-diff" data-step="3">
				<span className="d-del">{'-\t"limit?": "1 <= number.int <= 50"'}</span>
				<span className="d-add">
					{'+\t"limit?": "1 <= '}
					<span className="fix-target">number.integer</span>
					{' <= 50"'}
				</span>
			</li>
			<li className="t-call" data-step="4">
				<span className="t-dot" />
				<b>Bash</b> <span className="t-cmd">tsc --noEmit</span>
			</li>
			<li className="t-out t-ok" data-step="4">
				✓ no errors
			</li>
			<li className="t-call" data-step="5">
				<span className="t-dot" />
				<b>Bash</b>{" "}
				<span className="t-cmd">
					{`node scripts/call.ts search '{"query":"","limit":99}'`}
				</span>
			</li>
			<li className="t-out t-rt" data-step="5">
				query must be non-empty
				<br />
				limit must be at most 50
			</li>
		</ol>
		<figcaption className="term-foot">
			scripted around real output from tsc and ArkType
		</figcaption>
	</figure>
)

/** 07: what an agent reads back, as a session that fixes itself from the error */
const Agentic = () => (
	<Point
		id="agentic"
		n="07"
		kicker="agents"
		layout="split"
		title="Every error names its fix."
		deck={
			<>
				A typo fails <code>tsc</code> where it was written. The message is the
				fix.
			</>
		}
		aside={
			<div className="point-ctas">
				<CopyCommand
					text="npx skills add arktypeio/arktype"
					label="Copy the command that adds the ArkType skill to your agent"
				>
					<span className="comment"># add the skill to your agent</span>
					<br />
					<span className="p">$</span> npx skills add arktypeio/arktype
				</CopyCommand>
			</div>
		}
		figure={<Transcript />}
	>
		<Drills name="agentic">
			<Drill
				id="errors"
				chip="in your editor"
				verdict="Your editor's feedback is your agent's feedback: the same three errors, two readers."
			>
				<p className="drill-p">
					TypeScript's own type system parses every definition, so a typo fails{" "}
					<code>tsc</code> where it was written and the message is the fix.
				</p>
				<div className="pair2">
					<figure className="code-card">
						<Caption name="your editor" kind="item.ts" aside="ErrorLens" />
						<HomeCode code={snippets.editor} />
					</figure>
					<Terminal
						title="your agent's terminal"
						label="The same errors as tsc prints them"
					>
						<span className="p">$</span> tsc --noEmit
						{"\n"}
						<span className="loc">item.ts:5:2</span>{" "}
						<span className="dim">- error TS2322:</span>{" "}
						<span className="err">
							Type '"number | strin"' is not assignable to type '"number |
							string"'.
						</span>
						{"\n"}
						<span className="loc">item.ts:6:2</span>{" "}
						<span className="dim">- error TS2322:</span>{" "}
						<span className="err">
							Type '"(string | number)["' is not assignable to type '"Missing
							expected ']'"'.
						</span>
						{"\n"}
						<span className="loc">item.ts:7:2</span>{" "}
						<span className="dim">- error TS2322:</span>{" "}
						<span className="err">
							Type '"'draft' | 'live"' is not assignable to type '"'live
							requires a closing single-quote"'.
						</span>
						{"\n\n"}
						<span className="dim">Found 3 errors in the same file.</span>
					</Terminal>
				</div>
				<p className="pair-note">
					{
						"// same three errors, two readers: each message is the type the string was checked against, so the fix is in the error, not in a docs lookup"
					}
				</p>
			</Drill>
			<Drill
				chip="at runtime, and in MCP"
				verdict="A runtime error says what was expected, and a Type is a tool's input schema with no wrapper."
			>
				<div className="pair2">
					<div>
						<figure className="code-card">
							<Caption
								name="out.summary"
								kind="at runtime"
								aside="real ArkErrors"
							/>
							<HomeCode code={snippets.runtime} />
						</figure>
						<h3>Runtime errors say what was expected</h3>
						<p>
							Each issue has its path, a <code>code</code> and a message that
							says what was expected without printing the value. Hand{" "}
							<code>out.summary</code> back to a person or a model as is.
						</p>
					</div>
					<div>
						<figure className="code-card">
							<Caption
								name="an MCP tool"
								kind="greet.ts"
								aside="the type is the inputSchema"
							/>
							<HomeCode code={snippets.mcp} />
							<div className="tool-result" role="note">
								<div className="h">
									<span>
										tool_result · greet({'{ name: "Ada", times: 99 }'})
									</span>
									<b>isError</b>
								</div>
								<div className="m">
									Input validation error: Invalid arguments for tool greet:
									times: must be at most 5
								</div>
							</div>
						</figure>
						<h3>Tool inputs, without a wrapper</h3>
						<p>
							A <code>Type</code> is a Standard Schema that can describe itself
							as JSON Schema, so v2 of the MCP TypeScript SDK takes it as a
							tool's <code>inputSchema</code>. A bad call comes back as a
							message the model can act on. Precompiled, set{" "}
							<a href={withBase("/docs/integrations#precompiled-validators")}>
								one option
							</a>{" "}
							so the build keeps its JSON Schema.
						</p>
					</div>
				</div>
			</Drill>
			<Drill
				id="setup"
				chip="docs your agent reads"
				verdict="A skill, every page as Markdown and one line in AGENTS.md."
			>
				<div className="rows">
					<div className="row">
						<span className="idx">01</span>
						<h3>The skill</h3>
						<p>
							Current syntax, how it maps to TypeScript, and the mistakes to
							avoid. It also ships inside the <code>arktype</code> package,
							matched to your installed version.
						</p>
						<div className="act">
							<CopyCommand
								text="npx skills add arktypeio/arktype"
								label="Copy skill install command"
							>
								<span className="p">$</span> npx skills add arktypeio/arktype
							</CopyCommand>
						</div>
					</div>
					<div className="row">
						<span className="idx">02</span>
						<h3>Every page as Markdown</h3>
						<p>
							Add <code>.md</code> to any docs URL.{" "}
							<a className="link" href={withBase("/llms.txt")}>
								/llms.txt
							</a>{" "}
							lists every page. Results are written as comments, so nothing
							hides behind a hover.
						</p>
						<div className="act">
							<a className="url" href={withBase("/docs/expressions.md")}>
								arktype.io/docs/expressions
								<span className="md">.md</span>
							</a>
						</div>
					</div>
					<div className="row">
						<span className="idx">03</span>
						<h3>One line in AGENTS.md</h3>
						<p>
							When an agent adds validation to your project later, this keeps it
							on ArkType.
						</p>
						<div className="act">
							<CopyCommand
								text="Validate untrusted input with ArkType. Docs: https://arktype.io/llms.txt"
								label="Copy AGENTS.md line"
							>
								Validate untrusted input with ArkType. Docs: arktype.io/llms.txt
							</CopyCommand>
						</div>
					</div>
				</div>
			</Drill>
		</Drills>
	</Point>
)

/** a payload that breaks both of the lines TypeScript can't check */
const badUser = '{ name: "Ada", email: "ada@", age: -1, role: "admin" }'

/**
 * An interface and the Type that replaces it, line for line, in one card:
 * landing.css wipes from one to the other on first view and lights the two
 * lines that gained a check, and the tabs show either on request.
 */
const Mirror = () => (
	<figure className="code-card glow morph mirror" data-stage="morph">
		<figcaption>
			<span>
				<b>user.ts</b>
				<span className="dot">·</span>the same six lines
			</span>
			<span
				className="morph-tabs"
				role="radiogroup"
				aria-label="Show user.ts as"
			>
				<label>
					<input type="radio" name="mirror" value="zod" />
					<span>TypeScript</span>
				</label>
				<label>
					<input type="radio" name="mirror" value="ark" defaultChecked />
					<span>ArkType</span>
				</label>
			</span>
		</figcaption>
		<div className="morph-stack">
			<div className="morph-pane is-zod">
				<HomeCode code={snippets.ts} />
			</div>
			<div className="morph-pane is-ark">
				<HomeCode code={snippets.ark} />
				<span className="mirror-lit" aria-hidden />
			</div>
			<span className="morph-line" aria-hidden />
		</div>
		<div className="mirror-run">
			<p className="mirror-note">
				<span className="mirror-key" aria-hidden />
				two lines TypeScript can't check, now checked
			</p>
			<pre className="mirror-out">
				<span className="mirror-call">{`User(${badUser})`}</span>
				<span className="mirror-err">email must be an email address</span>
				<span className="mirror-err">age must be non-negative</span>
			</pre>
		</div>
	</figure>
)

/** 06: the syntax, as the TypeScript type it replaces, beside the parser to try it on */
const Write = () => (
	<Point
		id="write"
		n="06"
		kicker="write"
		title="Same type. Now it runs."
		deck="TypeScript syntax, in a string. The inferred type is the one you'd have written."
		figure={
			<>
				<div className="write-pair">
					<Mirror />
					<LiveType ghost={ghostStates} arg={liveArg} />
				</div>
				<div className="works">
					<span className="lbl">
						{"// works with anything that takes Standard Schema"}
					</span>
					{integrations.map(([name, href]) => (
						<Link key={name} href={href}>
							{name}
						</Link>
					))}
				</div>
			</>
		}
	>
		<Drills name="write">
			<Drill
				chip="types as sets"
				verdict="ArkType reduces every definition to a normalized set of constraints, so it knows which Types overlap, which contain others and which can never be satisfied."
			>
				<p className="drill-p">
					Precompiled, it applies all of that in your build: a contradiction
					like <code>{"{ id: string }"}</code> and{" "}
					<code>{"{ id: number }"}</code> fails the build instead of shipping a
					validator that rejects everything.
				</p>
				<div className="examples">
					<div className="ex">
						<div>
							<h3>Reduced before it runs</h3>
							<p>
								Divisible by 2 and by 3 is divisible by 6, so that's the check
								that runs.
							</p>
						</div>
						<figure className="code-card">
							<HomeCode code={snippets.reduce} />
						</figure>
					</div>
					<div className="ex">
						<div>
							<h3>Parse, then constrain</h3>
							<p>
								Morphs transform validated input, and the output is validated
								too.
							</p>
						</div>
						<figure className="code-card">
							<HomeCode code={snippets.morph} />
						</figure>
					</div>
					<div className="ex">
						<div>
							<h3>Assignability at runtime</h3>
							<p>
								Ask whether one type extends another, the way TypeScript does.
							</p>
						</div>
						<figure className="code-card">
							<HomeCode code={snippets.extends} />
						</figure>
					</div>
				</div>
			</Drill>
		</Drills>
	</Point>
)

export default function HomePage() {
	return (
		<>
			<noscript>
				<style>{".home .drill-panel[data-closed]{display:block}"}</style>
			</noscript>
			<div className="wrap">
				<Hero title={heroTitle} />
				<Board titled={heroTitle === "claim"} table={<PickThree />}>
					<Drills
						name="board"
						links={
							<a className="drill-link" href="#loses">
								where it loses ↓
							</a>
						}
					>
						<Drill
							chip="how it's ranked"
							verdict="Other projects' public benchmarks, one rule for every library."
						>
							<p className="drill-p">
								<ClaimText claim={claims.benchmarkOwners} />
							</p>
							<BoardNote />
							<p className="board-note">
								<ClaimText claim={claims.leaveOneOut} />
							</p>
						</Drill>
					</Drills>
				</Board>
				<Precompile />
				<Speed />
				<Size />
				<Startup />
				<Write />
				<Agentic />
				<Migrate />
			</div>

			<footer className="closer">
				<BoatLane />
				<div className="wrap">
					<h2>
						Start with your first type.{" "}
						<span className="hl">Or your agent's first prompt.</span>
					</h2>
					<div className="closer-go">
						<InstallButton />
						<CopyCommand
							text="Migrate this project from Zod to ArkType."
							label="Copy migration prompt"
						>
							<span className="p">›</span> Migrate this project from Zod to
							ArkType.
						</CopyCommand>
					</div>
					<SiteFooter />
				</div>
			</footer>
			<HomeEffects />
		</>
	)
}
