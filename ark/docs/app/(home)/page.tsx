import type { Metadata } from "next"
import Link from "next/link"
import type { CSSProperties } from "react"
import {
	CopyCommand,
	InstallButton
} from "../../components/home/CopyCommand.tsx"
import { evaluate } from "../../components/home/evaluate.ts"
import { HomeCode, PlainCode } from "../../components/home/HomeCode.tsx"
import { HomeEffects } from "../../components/home/HomeEffects.tsx"
import { LiveType } from "../../components/home/LiveType.tsx"
import { Board } from "../../components/home/Board.tsx"
import { Migrate } from "../../components/home/Migrate.tsx"
import { PickThree } from "../../components/home/PickThree.tsx"
import { WhyNow } from "../../components/home/WhyNow.tsx"
import { BenchmarkChart } from "../../components/mdx/BenchmarkChart.tsx"
import { ClaimText } from "../../components/mdx/Claim.tsx"
import { BoatLane } from "../../components/shell/BoatLane.tsx"
import { SiteFooter } from "../../components/shell/SiteFooter.tsx"
import {
	benchFacts,
	preview,
	provenance,
	type BenchFacts
} from "../../lib/bench/bench.ts"
import { claims, draftOf } from "../../lib/claims.ts"
import { defineMetadata, tagline } from "../metadata.ts"

const lede = `${draftOf(claims.headline)} ${draftOf(claims.pickThree)} The build step is your agent's job: every error it reports says what to change.`

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

const NextTag = () => preview && <span className="next-tag">next release</span>

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
// ArkErrors: email must be an email address (was "ada@")
//            role must be "admin" or "member" (was "owner")`,
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
// ArkErrors: must be at most 65535 (was 80000)
Port("80000")`,
	discriminate: `const Shape = type({
	kind: "'circle'",
	radius: "number > 0"
}).or({
	kind: "'square'",
	side: "number > 0"
})`,
	discriminated: `// Shape, precompiled, helpers inlined: one switch, each branch checks what's left
data => {
	switch (data?.kind) {
		case "circle":
			return Number.isFinite(data.radius) && data.radius > 0
		case "square":
			return Number.isFinite(data.side) && data.side > 0
	}
	return false
}`,
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

/** "2 of 13 valid-data scenarios", or "all 13 scenarios" while no library is faster on any */
const validShare = (facts: BenchFacts) =>
	facts.mostFaster ?
		`${facts.mostFaster} of ${facts.validCount} valid-data scenarios`
	:	`all ${facts.validCount} scenarios`

/** a sourced number: hover or focus shows where it comes from */
const BenchSource = ({ facts }: { facts: BenchFacts }) => (
	<span className="tok twoslash-hover" tabIndex={0} data-qi="">
		{validShare(facts)}
		<span className="twoslash-popup-container" popover="manual">
			<code className="twoslash-popup-code">
				<span style={{ color: "var(--copper)" }}>const</span>
				<span style={{ color: "var(--ink)" }}> fasterThanArkType</span>
				<span style={{ color: "var(--copper)" }}>:</span>
				<span style={{ color: "var(--ink)" }}> {"{"}</span>
				{facts.fasterCounts.map(([library, rows], i) => (
					<span key={library}>
						{i > 0 && <span style={{ color: "var(--copper)" }}>;</span>}
						<span style={{ color: "var(--ink)" }}>
							{" "}
							{/^\w+$/.test(library) ? library : `"${library}"`}
						</span>
						<span style={{ color: "var(--copper)" }}>:</span>
						<span style={{ color: "var(--blue)" }}> {rows}</span>
					</span>
				))}
				<span style={{ color: "var(--ink)" }}> {"}"}</span>
			</code>
			<span className="qi-doc">
				{facts.mostFaster ?
					`Valid-data scenarios, of ${facts.validCount}, each library was faster on: ${facts.mostFasterBy}${facts.fasterOthers && `; ${facts.fasterOthers}`}. `
				:	""}
				ArkType was fastest in {facts.validWins}
				{facts.ties && ` and tied ${facts.ties}`}. Median ns per call over{" "}
				{provenance.passes} fresh-process passes against typia, TypeBox, ajv,
				Zod 4 (compiled or not), zod/mini and Valibot; faster means a sign test
				at p {"<"} .05. Reporting errors on invalid data, ajv is faster in{" "}
				{facts.ajvFasterCount === facts.errorCount ?
					"every row"
				:	`${facts.ajvFasterCount} of ${facts.errorCount} rows`}
				.
				<br />
				<span className="qi-see">@see</span>{" "}
				<a className="link" href="#run">
					the benchmarks below
				</a>
			</span>
			{preview && (
				<span className="qi-foot">
					<span>as of · {provenance.date}</span>
					<span>precompile {provenance.commit}</span>
				</span>
			)}
		</span>
	</span>
)

const Terminal = ({
	title,
	label,
	children
}: {
	title: string
	label: string
	children: React.ReactNode
}) => (
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

export default function HomePage() {
	const facts = benchFacts()
	const ajvRows =
		facts.ajvFasterCount === facts.errorCount ?
			`all ${facts.errorCount}`
		:	`${facts.ajvFasterCount} of ${facts.errorCount}`
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
							<a className="one" href="#why">
								The build step is your agent's job.
							</a>
						</h1>
						<p className="lede rise" style={rise(1)}>
							<ClaimText claim={claims.pickThree} />
							<a className="how" href="#board-note">
								how we measured ↓
							</a>{" "}
							Your <span className="decl c-teal">agent</span> sets up the build,
							and every error it reports says what to change.
						</p>
						<div className="ctas rise" style={rise(2)}>
							<Link className="btn btn-gold" href="/docs/intro/setup">
								Get started{" "}
								<span className="arrow" aria-hidden>
									→
								</span>
							</Link>
							<Link className="btn" href="/docs/precompile/setup">
								Set up precompile
							</Link>
							<CopyCommand
								text="npx skills add arktypeio/arktype"
								label="Copy the command that adds the ArkType skill to your agent"
							>
								<span className="comment"># add the skill to your agent</span>
								<br />
								<span className="p">$</span> npx skills add arktypeio/arktype
							</CopyCommand>
						</div>
					</div>
					<LiveType ghost={ghostStates} arg={liveArg} />
				</section>

				<Board />
				<WhyNow />
				<Migrate />

				<section className="block" id="agentic" aria-labelledby="agentic-title">
					<div className="sec-label">
						<b>03</b>
						{"// agentic DX"}
					</div>
					<h2 id="agentic-title">Designed for agentic DX.</h2>
					<p className="deck">
						An agent works in a loop: write, build, read the error, fix. ArkType
						keeps each turn of it short, from your editor to the build to a tool
						call. Every message in this section is real output from ArkType, tsc
						or the MCP SDK, and the agent session below is scripted around it.
					</p>
					<ol className="proofs" data-reveal>
						<li>
							<a href="#errors">
								<span className="n">01</span>
								<b>Every error names its fix</b>
								<span>
									from <code>tsc</code>, the build and validation
								</span>
							</a>
						</li>
						<li>
							<a href="#loop">
								<span className="n">02</span>
								<b>The loop, without a docs lookup</b>
								<span>write, check, fix and validate in one session</span>
							</a>
						</li>
						<li>
							<a href="#setup">
								<span className="n">03</span>
								<b>Docs your agent reads</b>
								<span>
									a skill, every page as Markdown, one line in AGENTS.md
								</span>
							</a>
						</li>
					</ol>
					<h3 className="sub" id="errors">
						Your editor's feedback is your agent's feedback.
					</h3>
					<p className="deck">
						TypeScript's own type system parses every definition, so a typo
						fails <code>tsc</code> where it was written and the message is the
						fix. At runtime, bad input comes back as errors that say where, what
						was expected and what arrived.
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
							<h3>Runtime errors say what arrived</h3>
							<p>
								Each issue names its path, what was expected and what was there.
								Hand <code>out.summary</code> back to a person or a model as is.
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
										times: must be at most 5 (was 99)
									</div>
								</div>
							</figure>
							<h3>Tool inputs, without a wrapper</h3>
							<p>
								A <code>Type</code> is a Standard Schema that can describe
								itself as JSON Schema, so v2 of the MCP TypeScript SDK takes it
								as a tool's <code>inputSchema</code>. A bad call comes back as a
								message the model can act on. Precompiled, set{" "}
								<a href="/docs/integrations#precompiled-validators">
									one option
								</a>{" "}
								so the build keeps its JSON Schema.
							</p>
						</div>
					</div>
					<h3 className="sub" id="loop">
						The loop, end to end.
					</h3>
					<p className="deck">
						It writes a definition, runs <code>tsc</code>, reads the error,
						fixes it, then validates real input. A precompiled build adds one
						more step of the same kind, its errors naming the file, line, reason
						and fix.
					</p>
					<div className="agents">
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
									<span className="t-prompt">›</span>add a search tool: a query
									and an optional limit, at most 50
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
									<mark>number.int</mark> &lt;= 50"' is not assignable to type
									'"1 &lt;= <mark className="fix">number.integer</mark>"'.
								</li>
								<li className="t-call" data-step="3">
									<span className="t-dot" />
									<b>Edit</b> src/tools/search.ts
								</li>
								<li className="t-diff" data-step="3">
									<span className="d-del">
										{'-\t"limit?": "1 <= number.int <= 50"'}
									</span>
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
									limit must be at most 50 (was 99)
								</li>
								<li className="t-say" data-step="6">
									<span className="t-dot is-say" />
									Bad calls now come back with a message the model can act on.
								</li>
							</ol>
						</figure>
						<div>
							<h3 className="rows-title" id="setup">
								Set it up once
							</h3>
							<div className="rows">
								<div className="row">
									<span className="idx">01</span>
									<h3>The skill</h3>
									<p>
										Current syntax, how it maps to TypeScript, and the mistakes
										to avoid. It also ships inside the <code>arktype</code>{" "}
										package, matched to your installed version.
									</p>
									<div className="act">
										<CopyCommand
											text="npx skills add arktypeio/arktype"
											label="Copy skill install command"
										>
											<span className="p">$</span> npx skills add
											arktypeio/arktype
										</CopyCommand>
									</div>
								</div>
								<div className="row">
									<span className="idx">02</span>
									<h3>Every page as Markdown</h3>
									<p>
										Add <code>.md</code> to any docs URL.{" "}
										<a className="link" href="/llms.txt">
											/llms.txt
										</a>{" "}
										lists every page. Results are written as comments, so
										nothing hides behind a hover.
									</p>
									<div className="act">
										<a className="url" href="/docs/expressions.md">
											arktype.io/docs/expressions
											<span className="md">.md</span>
										</a>
									</div>
								</div>
								<div className="row">
									<span className="idx">03</span>
									<h3>One line in AGENTS.md</h3>
									<p>
										When an agent adds validation to your project later, this
										keeps it on ArkType.
									</p>
									<div className="act">
										<CopyCommand
											text="Validate untrusted input with ArkType. Docs: https://arktype.io/llms.txt"
											label="Copy AGENTS.md line"
										>
											Validate untrusted input with ArkType. Docs:
											arktype.io/llms.txt
										</CopyCommand>
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section className="block" id="write" data-reveal>
					<div className="sec-label">
						<b>04</b>
						{"// write"}
					</div>
					<h2>Same type. Now it runs.</h2>
					<p className="deck">
						Definitions use TypeScript's names, operators and optional keys,
						written as strings and objects. The type ArkType infers is the one
						you would have written by hand.
					</p>
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
							<Caption
								name="user.ts"
								kind="ArkType"
								aside="types and runtime"
							/>
							<HomeCode code={snippets.ark} />
						</figure>
					</div>
					<p className="note">
						{"// the two lines TypeScript can't check, ArkType can: "}
						<code>string.email</code> and <code>number.integer &gt;= 0</code>
					</p>
				</section>

				<section className="block" id="run" data-reveal>
					<div className="sec-label">
						<b>05</b>
						{"// run"} <NextTag />
					</div>
					<h2>
						Precompiled, it was <ClaimText claim={claims.zodSpec} />.
					</h2>
					<p className="deck">
						We raced it against the ahead-of-time compilers (typia, TypeBox,
						ajv) and the libraries you'd otherwise write schemas with (Zod 4,
						compiled or not, and Valibot), each in its own process, on the same
						inputs.{" "}
						{facts.mostFaster ?
							"On valid data, no other library was faster in more than "
						:	"On valid data, it was fastest or tied in "}
						<BenchSource facts={facts} />.
					</p>
					<p className="note">
						{
							"// prefer no build step? dynamic ArkType runs the same definitions, "
						}
						<ClaimText claim={claims.dynamicSpec} />
					</p>
					<div className="figs">
						<div className="fig">
							<div className="n">
								{facts.mostFaster ?
									`${facts.mostFaster} of ${facts.validCount}`
								:	`${facts.validWins} of ${facts.validCount}`}
							</div>
						</div>
						{facts.mostFaster ?
							<p className="fig-p">
								valid-data scenarios is the most any one library beat
								precompiled ArkType on: {facts.mostFasterBy}.
								{facts.fasterOthers &&
									` Also faster: ${facts.fasterOthers}${facts.fasterOthersMostlyTied ? ", ties in most other runs that day" : ""}.`}
								{!facts.fasterOthersMostlyTied &&
									facts.unsteadyLosses &&
									` In most other runs that day, ${facts.unsteadyLosses} were ties.`}{" "}
								ArkType was fastest in {facts.validWins}
								{facts.ties && ` and tied ${facts.ties}`}.
							</p>
						:	<p className="fig-p">
								valid-data scenarios where precompiled ArkType was fastest.
								{facts.ties && ` Tied: ${facts.ties}.`}
							</p>
						}
						<div className="fig">
							<div className="n sm">ajv</div>
						</div>
						<p className="fig-p">
							was faster on {ajvRows} rows that report errors on invalid data,
							by {facts.ajvMin} to {facts.ajvMax}. If your hot path reports
							errors, ajv is the one to beat.
							{facts.rejection &&
								` Rejecting invalid input with a boolean check, ArkType was ${facts.rejection}.`}
						</p>
					</div>
					<PickThree />
					<BenchmarkChart animate>
						<div className="b-pre">
							<div>
								<h3>What precompiling removes</h3>
								<p>
									On valid data the precompiled build is {facts.versusJit}. The
									bigger change is everything before the first call.
								</p>
								<dl className="facts">
									<div>
										<dt>cold start, login form app</dt>
										<dd>
											<b>{facts.coldStandalone}</b>
											<span>JIT {facts.coldJit}</span>
										</dd>
									</div>
									<div>
										<dt>shipped validator, gzip</dt>
										<dd>
											<b>{facts.sizeStandalone}</b>
											<span>JIT {facts.sizeJit}</span>
										</dd>
									</div>
									<div>
										<dt>parsing at startup</dt>
										<dd>
											<b>none</b>
											<span>
												no <code>new Function</code>, so it runs under strict
												CSP
											</span>
										</dd>
									</div>
								</dl>
							</div>
						</div>
					</BenchmarkChart>
				</section>

				<section className="block" data-reveal aria-labelledby="more-title">
					<div className="sec-label">
						<b>06</b>
						{"// sets"}
					</div>
					<h2 id="more-title">Types as sets, reduced before they ship.</h2>
					<p className="deck">
						ArkType reduces every definition to a normalized set of constraints,
						so it knows which Types overlap, which are subtypes of others and
						which can never be satisfied. Precompiled, it applies all of that in
						your build: a contradiction like <code>{"{ id: string }"}</code> and{" "}
						<code>{"{ id: number }"}</code> fails the build instead of shipping
						a validator that rejects everything.
					</p>
					<div className="examples">
						<div className="ex">
							<div>
								<h3>Unions discriminate themselves</h3>
								<p>
									ArkType finds the key that tells a union's branches apart and
									switches on it, and a branch never rechecks the key it was
									chosen by. You never declare a discriminator.
								</p>
							</div>
							<div className="ex-pair">
								<figure className="code-card">
									<HomeCode code={snippets.discriminate} />
								</figure>
								<figure className="code-card">
									<PlainCode code={snippets.discriminated} />
								</figure>
							</div>
						</div>
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
				</section>
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
