import type { Metadata } from "next"
import Link from "next/link"
import { Board } from "../../components/home/Board.tsx"
import { BoardGraphs } from "../../components/home/BoardGraphs.tsx"
import { BoardTable } from "../../components/home/BoardTable.tsx"
import {
	CopyCommand,
	InstallButton
} from "../../components/home/CopyCommand.tsx"
import { Drill, Drills, Point } from "../../components/home/Drill.tsx"
import { Hero, heroLede, heroLine } from "../../components/home/Hero.tsx"
import { HomeCode } from "../../components/home/HomeCode.tsx"
import { HomeEffects } from "../../components/home/HomeEffects.tsx"
import { Migrate } from "../../components/home/Migrate.tsx"
import { Precompile, ProofTabs } from "../../components/home/Points.tsx"
import { heroStats } from "../../components/home/boardFacts.ts"
import {
	migratePromptAot,
	userPlaygroundHref
} from "../../components/home/prompts.ts"
import { BoatLane } from "../../components/shell/BoatLane.tsx"
import { SiteFooter } from "../../components/shell/SiteFooter.tsx"
import { claims, draftOf } from "../../lib/claims.ts"
import { defineMetadata, tagline } from "../metadata.ts"

const lede = `${draftOf(claims.headline)} ${heroLine} ${heroLede}`

const title = `ArkType · ${tagline}`

export const metadata: Metadata = {
	...defineMetadata({
		title,
		description: lede,
		url: "/",
		ogImageAlt: `${draftOf(claims.headline)} ${heroLine} ${heroStats()
			.map(s => `${s.value} ${s.unit} than Zod 4`)
			.join(", ")}.`
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
})`
}

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

/** 01: the syntax, as the TypeScript type it replaces — right after the board */
const Write = () => (
	<Point
		id="write"
		n="01"
		kicker="write"
		layout="split"
		title="Same type. Now it runs."
		deck="TypeScript syntax, in a string. Autocomplete, hover types and squiggles as you type — and the inferred type is the one you'd have written."
		aside={
			<div className="ctas point-ctas">
				<Link className="btn" href={userPlaygroundHref}>
					Open in Playground{" "}
					<span className="arrow" aria-hidden>
						→
					</span>
				</Link>
				<Link className="link" href="/docs/intro/your-first-type">
					read the syntax guide{" "}
					<span className="arrow" aria-hidden>
						→
					</span>
				</Link>
			</div>
		}
		figure={<Mirror />}
	/>
)

export default function HomePage() {
	return (
		<>
			<noscript>
				<style>
					{
						".home .drill-panel[data-closed],.home .stage-panel[data-closed]{display:block}.home .stage-tabs{display:none}.home .proof-stage .stage-panel+.stage-panel{margin-top:56px;padding-top:48px;border-top:1px solid var(--rule-soft)}"
					}
				</style>
			</noscript>
			<div className="wrap">
				<Hero />
				<Board graphs={<BoardGraphs />}>
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
							verdict="Every number on the board, a library a row."
						>
							<BoardTable />
						</Drill>
					</Drills>
				</Board>
				<Write />
				<ProofTabs />
				<Precompile />
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
						<CopyCommand text={migratePromptAot} label="Copy migration prompt">
							<span className="p">›</span> {migratePromptAot}
						</CopyCommand>
					</div>
					<SiteFooter />
				</div>
			</footer>
			<HomeEffects />
		</>
	)
}
