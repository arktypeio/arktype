import type { Metadata } from "next"
import Link from "next/link"
import type { CSSProperties } from "react"
import { Board, BoardNote } from "../../components/home/Board.tsx"
import {
	CopyCommand,
	InstallButton
} from "../../components/home/CopyCommand.tsx"
import { Drill, Drills, Point } from "../../components/home/Drill.tsx"
import { evaluate } from "../../components/home/evaluate.ts"
import { HomeCode, PlainCode } from "../../components/home/HomeCode.tsx"
import { HomeEffects } from "../../components/home/HomeEffects.tsx"
import { LiveType } from "../../components/home/LiveType.tsx"
import { Migrate } from "../../components/home/Migrate.tsx"
import { PickThree } from "../../components/home/PickThree.tsx"
import {
	NextTag,
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
 * The hero's second line, after the headline lib/claims.ts guards. It states
 * no number, so it lives here; the candidates it was elected from are in the
 * commit that added it.
 */
const heroLine = "Optimized for agents and humans."

const lede = `${draftOf(claims.headline)} ${draftOf(claims.pickThree)} ${heroLine} One plugin to precompile, one prompt to switch from Zod.`

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

const liveDefinition = "number.integer >= 0"
const liveArg = "-1"

/** every prefix of the live definition, parsed by the real parser at build */
const ghostStates = Array.from(liveDefinition, (_, i) =>
	evaluate(liveDefinition.slice(0, i + 1), liveArg)
)

const rise = (i: number) => ({ "--i": i }) as CSSProperties

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
})

type User = typeof User.infer
//   ^?`,
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
					{'+\t"limit?": "1 <= number.integer <= 50"'}
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
			<li className="t-say" data-step="6">
				<span className="t-dot is-say" />
				Bad calls now come back with a message the model can act on.
			</li>
		</ol>
	</figure>
)

/** 06: what an agent reads back, as a session that fixes itself from the error */
const Agentic = () => (
	<Point
		id="agentic"
		n="06"
		kicker="agentic DX"
		layout="split"
		title="Every error names its fix."
		deck={
			<>
				A typo fails <code>tsc</code> where it was written, and the message is
				the fix, so your agent never leaves the loop for a docs lookup. The
				session is scripted around real output from <code>tsc</code> and
				ArkType.
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
		<Drills>
			<Drill
				id="errors"
				title="Your editor's feedback is your agent's feedback"
				hint="the same three errors, two readers"
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
				title="Runtime errors, and tool inputs without a wrapper"
				hint="out.summary, MCP"
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
				title="Docs your agent reads"
				hint="a skill, Markdown pages, one line in AGENTS.md"
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

/** 07: the syntax, as the TypeScript type it mirrors */
const Write = () => (
	<Point
		id="write"
		n="07"
		kicker="write"
		title="Same type. Now it runs."
		deck="Definitions use TypeScript's names, operators and optional keys, written as strings and objects. The type ArkType infers is the one you would have written by hand."
		figure={
			<>
				<div className="twin-code">
					<figure className="code-card">
						<Caption name="user.ts" kind="TypeScript" aside="types only" />
						<HomeCode code={snippets.ts} />
					</figure>
					<div className="eq" aria-hidden>
						<span>≡</span>
						<span>≡</span>
						<span>+</span>
						<span>+</span>
						<span>≡</span>
						<span>≡</span>
					</div>
					<figure className="code-card glow">
						<Caption name="user.ts" kind="ArkType" aside="types and runtime" />
						<HomeCode code={snippets.ark} />
					</figure>
				</div>
				<p className="note">
					{"// the two lines TypeScript can't check, ArkType can: "}
					<code>string.email</code> and <code>number.integer &gt;= 0</code>
				</p>
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
		<Drills>
			<Drill
				title="Types as sets, reduced before they ship"
				hint="reduce, morph, extends"
			>
				<p className="drill-p">
					ArkType reduces every definition to a normalized set of constraints,
					so it knows which Types overlap, which are subtypes of others and
					which can never be satisfied. Precompiled, it applies all of that in
					your build: a contradiction like <code>{"{ id: string }"}</code> and{" "}
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
			<div className="wrap">
				<section className="hero" aria-labelledby="hero-title">
					<div>
						<div className="eyebrow rise" style={rise(0)}>
							<b>arktype</b> {"//"} TypeScript's 1:1 validator
							<Link className="eyebrow-new" href="/docs/precompile">
								precompiled <NextTag />
							</Link>
						</div>
						<h1 id="hero-title" className="rise-fade is-long">
							<ClaimText claim={claims.headline} />{" "}
							<span className="one">{heroLine}</span>
						</h1>
						<p className="lede rise" style={rise(1)}>
							<ClaimText claim={claims.pickThree} />
							<a className="how" href="#board-note">
								how we measured ↓
							</a>{" "}
							One plugin to precompile. One prompt to switch from Zod.
						</p>
						<div className="ctas rise" style={rise(2)}>
							<Link className="btn btn-gold" href="/docs/intro/setup">
								Get started{" "}
								<span className="arrow" aria-hidden>
									→
								</span>
							</Link>
							<a className="btn" href="#migrate">
								Migrate from Zod
							</a>
						</div>
					</div>
					<LiveType ghost={ghostStates} arg={liveArg} />
				</section>

				<Board>
					<Drills>
						<Drill
							title="Every library's averages, side by side"
							hint="who else is first in any"
						>
							<PickThree />
						</Drill>
						<Drill
							title="How the places are ranked"
							hint="other projects' benchmarks, one rule"
						>
							<BoardNote />
							<p className="board-note">
								<ClaimText claim={claims.benchmarkOwners} />{" "}
								<ClaimText claim={claims.leaveOneOut} />
							</p>
						</Drill>
					</Drills>
				</Board>
				<Speed />
				<Startup />
				<Size />
				<Precompile />
				<Agentic />
				<Write />
				<Migrate />
			</div>

			<footer className="closer">
				<BoatLane />
				<div className="wrap">
					<h2>
						Start with your first type.{" "}
						<span className="hl">Or your agent's first prompt.</span>
					</h2>
					<div className="closer-agent">
						<CopyCommand
							text="npx skills add arktypeio/arktype"
							label="Copy skill install command"
						>
							<span className="p">$</span> npx skills add arktypeio/arktype
						</CopyCommand>
						<CopyCommand
							text="Migrate this project from Zod to ArkType."
							label="Copy migration prompt"
						>
							<span className="p">›</span> Migrate this project from Zod to
							ArkType.
						</CopyCommand>
					</div>
					<div className="ctas">
						<InstallButton />
						<Link className="btn" href="/docs/intro/setup">
							Get started{" "}
							<span className="arrow" aria-hidden>
								→
							</span>
						</Link>
						<Link className="btn" href="/docs/precompile/setup">
							Set up precompile
						</Link>
					</div>
					<SiteFooter />
				</div>
			</footer>
			<HomeEffects />
		</>
	)
}
