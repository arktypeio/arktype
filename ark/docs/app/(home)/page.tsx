import type { Metadata } from "next"
import Link from "next/link"
import { Board } from "../../components/home/Board.tsx"
import { BoardGraphs } from "../../components/home/BoardGraphs.tsx"
import {
	CopyCommand,
	InstallButton
} from "../../components/home/CopyCommand.tsx"
import { Drill, Drills, Point } from "../../components/home/Drill.tsx"
import {
	Hero,
	heroLede,
	heroLine,
	type HeroProps
} from "../../components/home/Hero.tsx"
import { HomeCode, PlainCode } from "../../components/home/HomeCode.tsx"
import { HomeEffects } from "../../components/home/HomeEffects.tsx"
import { Migrate } from "../../components/home/Migrate.tsx"
import { PickThree } from "../../components/home/PickThree.tsx"
import {
	Precompile,
	Size,
	Speed,
	Startup
} from "../../components/home/Points.tsx"
import { BoatLane } from "../../components/shell/BoatLane.tsx"
import { SiteFooter } from "../../components/shell/SiteFooter.tsx"
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
	agent: `import { type } from "arktype"

export const SearchArgs = type({
	query: "string > 0",
	"limit?": "1 <= number.int <= 50"
})`
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

/** 06: what an agent reads back, as a session that fixes itself from the error */
const Agentic = () => (
	<Point
		id="agentic"
		n="06"
		kicker="agents"
		layout="flip"
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
		<Drills
			name="agentic"
			links={
				<Link className="drill-link" href="/docs/agents">
					ArkType for agents →
				</Link>
			}
		>
			{null}
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

/** 05: the syntax, as the TypeScript type it replaces */
const Write = () => (
	<Point
		id="write"
		n="05"
		kicker="write"
		layout="split"
		title="Same type. Now it runs."
		deck="TypeScript syntax, in a string. The inferred type is the one you'd have written."
		figure={
			<>
				<Mirror />
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
		<Drills
			name="write"
			links={
				<Link className="drill-link" href="/playground">
					try it in the playground →
				</Link>
			}
		>
			{null}
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
				<Board titled={heroTitle === "claim"} table={<BoardGraphs />}>
					<Drills
						name="board"
						links={
							<a className="drill-link" href="#loses">
								where it loses ↓
							</a>
						}
					>
						<Drill
							chip="as a table"
							verdict="Every category's average, a library a row."
						>
							<PickThree />
						</Drill>
					</Drills>
				</Board>
				<Speed />
				<Size />
				<Startup />
				<Precompile />
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
