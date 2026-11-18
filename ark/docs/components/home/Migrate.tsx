import type { CSSProperties } from "react"
import { withBase } from "../../lib/basePath.ts"
import { claims, medianOf, sizeChart } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { categoryOf, startupFacts } from "./boardFacts.ts"
import { CopyCommand } from "./CopyCommand.tsx"
import { Drill, Drills, Point } from "./Drill.tsx"
import { HomeCode } from "./HomeCode.tsx"

const zod = `// ---cut-start---
declare const data: unknown
// ---cut-end---
import { z } from "zod"

const User = z.object({
	name: z.string().min(1, "Name is required"),
	email: z.email(),
	age: z.number().int().nonnegative().optional()
})

type User = z.infer<typeof User>

const out = User.safeParse(data)
if (!out.success) console.error(out.error)`

const ark = `// ---cut-start---
declare const data: unknown
// ---cut-end---
import { type } from "arktype"

const User = type({
	name: ["string > 0", "@", { message: "Name is required" }],
	email: "string.email",
	"age?": "number.integer >= 0 | undefined"
})

type User = typeof User.infer

const out = User(data)
if (out instanceof type.errors) console.error(out.summary)`

/** the guide's steps, as the agent works through them */
const steps = [
	"take stock",
	"convert each schema in place",
	"keep behavior identical",
	"update call sites",
	"swap integrations",
	"compare with Zod",
	"swap dependencies",
	"typecheck and test",
	"precompile, if asked",
	"report what differs"
]

/** what a literal translation would get wrong, from the guide's "Defaults that differ" */
const differs: [zod: string, ark: string][] = [
	[
		"z.object() removes undeclared keys",
		'configure({ onUndeclaredKey: "delete" }), once'
	],
	[".optional() also accepts undefined", '"age?": "… | undefined"'],
	["safeParse returns { success }", "check instanceof type.errors"],
	[
		'.min(1, "Name is required") is a sentence',
		"{ message }, never .describe(), which writes must be before it"
	]
]

/** what a Zod user keeps, each from the guide: Custom messages, Swap integrations, Adopt incrementally */
const keeps: [what: string, how: string][] = [
	[
		"a message you wrote",
		"shown as written, without its path, as Zod's issue.message was"
	],
	[
		"tRPC, TanStack Form, react-hook-form",
		"take the Type through Standard Schema, and read the same path and message"
	],
	[
		"schemas you haven't converted",
		"a Zod schema works inside an ArkType definition"
	]
]

/** what the guide can't make identical, so the page says it before the agent's summary does */
const costs: [zod: string, ark: string][] = [
	["an async .refine()", "runs after validation: ArkType is synchronous"],
	["Zod's default messages", "ArkType's, like must be an email address"]
]

/** the schema as it was and as the agent leaves it, in one card: a wipe on first view, then either on request */
const Conversion = () => (
	<figure className="code-card glow morph" data-stage="morph">
		<figcaption>
			<span>
				<b>user.ts</b>
				<span className="dot">·</span>converted where it is
			</span>
			<span
				className="morph-tabs"
				role="radiogroup"
				aria-label="Show user.ts in"
			>
				<label>
					<input type="radio" name="morph" value="zod" />
					<span>Zod</span>
				</label>
				<label>
					<input type="radio" name="morph" value="ark" defaultChecked />
					<span>ArkType</span>
				</label>
			</span>
		</figcaption>
		<div className="morph-stack">
			<div className="morph-pane is-zod">
				<HomeCode code={zod} />
			</div>
			<div className="morph-pane is-ark">
				<HomeCode code={ark} />
			</div>
			<span className="morph-line" aria-hidden />
		</div>
	</figure>
)

/** kilobytes to three figures, as the size section writes them */
const kb = (name: string) => {
	const bar = sizeChart.bars.find(bar => bar.name === name)
	if (!bar || bar.value === null)
		throw new Error(`sizeChart has no ${name} bar`)
	return (bar.value / 1000).toPrecision(3)
}

/**
 * What the sections above measured against Zod, in one row beside the ask
 * to switch: each number is the one its section leads with, and links there
 */
const Gains = () => {
	const [zod] = categoryOf("speed").versus
	return (
		<dl className="gains" aria-label="Against Zod 4, as measured above">
			<div>
				<dt>
					<a href="#run">validation</a>
				</dt>
				<dd>
					<b>{medianOf(zod.versus)}</b> faster, at the median of{" "}
					{zod.versus.count} scenarios
				</dd>
			</div>
			<div>
				<dt>
					<a href="#start">cold start</a>
				</dt>
				<dd>
					<b>{startupFacts().zodRatio}</b> less startup work, on the login app
				</dd>
			</div>
			<div>
				<dt>
					<a href="#size">bundle</a>
				</dt>
				<dd>
					<b>
						{kb("Zod")} → {kb("ArkType (precompiled)")} kB
					</b>{" "}
					gzipped, on a login form
				</dd>
			</div>
		</dl>
	)
}

type PairsProps = {
	pairs: [from: string, to: string][]
}

const Pairs = ({ pairs }: PairsProps) => (
	<dl className="differs">
		{pairs.map(([from, to]) => (
			<div key={from}>
				<dt>{from}</dt>
				<dd>{to}</dd>
			</div>
		))}
	</dl>
)

/** migrating with the skill: one command, one prompt, and the conversion it makes */
export const Migrate = () => (
	<Point
		id="migrate"
		n="08"
		kicker="migrate"
		title={
			<>
				One command, one prompt.{" "}
				<span className="hl">Your agent follows the guide.</span>
			</>
		}
		deck={<ClaimText claim={claims.zodMigration} />}
		layout="split"
		aside={
			<ol className="moves">
				<li>
					<span className="move-n">1</span>
					<h3>Add the skill</h3>
					<CopyCommand
						text="npx skills add arktypeio/arktype"
						label="Copy skill install command"
					>
						<span className="p">$</span> npx skills add arktypeio/arktype
					</CopyCommand>
				</li>
				<li>
					<span className="move-n">2</span>
					<h3>Ask your agent</h3>
					<CopyCommand
						text="Migrate this project from Zod to ArkType."
						label="Copy migration prompt"
					>
						<span className="p">›</span> Migrate this project from Zod to
						ArkType.
					</CopyCommand>
				</li>
			</ol>
		}
		figure={<Conversion />}
	>
		<Gains />
		<Drills>
			<Drill
				title="What your agent follows"
				hint={`${steps.length} steps, one guide`}
			>
				<ol className="steps-flow">
					{steps.map((step, i) => (
						<li key={step} style={{ "--i": i } as CSSProperties}>
							{step}
						</li>
					))}
				</ol>
				<p className="guide-p">
					The same guide covers Valibot, TypeBox, Yup, Joi, Effect Schema and
					JSON Schema.{" "}
					<a className="link" href={withBase("/docs/migrating")}>
						Read the guide
					</a>
				</p>
			</Drill>
			<Drill
				title="Where a literal translation goes wrong"
				hint={`${differs.length} defaults that differ`}
			>
				<Pairs pairs={differs} />
			</Drill>
			<Drill
				title="What you keep, and what it costs"
				hint="messages, integrations, async"
			>
				<div className="guide">
					<div>
						<h3>What you keep</h3>
						<Pairs pairs={keeps} />
					</div>
					<div>
						<h3>What it costs</h3>
						<Pairs pairs={costs} />
					</div>
				</div>
			</Drill>
		</Drills>
	</Point>
)
