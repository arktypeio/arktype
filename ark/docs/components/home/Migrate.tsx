import Link from "next/link"
import { claims, isPending } from "../../lib/claims.ts"
import { bigAppLine } from "./boardFacts.ts"
import { CopyCommand } from "./CopyCommand.tsx"
import { Drill, Drills, Point } from "./Drill.tsx"
import { HomeCode } from "./HomeCode.tsx"
import {
	migratePromptAot,
	migratePromptDynamic,
	skillCommand
} from "./prompts.ts"

// The two panes accept and reject the same inputs: run against 26 of them,
// valid and invalid at every bound, before this was written. Messages and
// optional keys, where a literal translation goes wrong, are the guide's.
const zod = `import { z } from "zod"

const Item = z.object({
	sku: z.string().min(1).max(32),
	quantity: z.number().int().min(1).max(99)
})

const Order = z.object({
	status: z.enum(["pending", "paid", "shipped"]),
	items: z.array(Item).min(1),
	coupon: z.string().length(8).nullable(),
	total: z.number().positive()
})

type Order = z.infer<typeof Order>`

const ark = `import { type } from "arktype"

const Item = type({
	sku: "1 <= string <= 32",
	quantity: "1 <= number.integer <= 99"
})

const Order = type({
	status: "'pending' | 'paid' | 'shipped'",
	items: Item.array().atLeastLength(1),
	coupon: "string == 8 | null",
	total: "number > 0"
})

type Order = typeof Order.infer`

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
				<b>order.ts</b>
				<span className="dot">·</span>same file, converted
			</span>
			<span
				className="morph-tabs"
				role="radiogroup"
				aria-label="Show order.ts in"
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

/** migrating with one universal prompt: installs the skill, converts Zod, and wires @ark/aot by default */
export const Migrate = () => (
	<Point
		id="migrate"
		n="04"
		kicker="migrate"
		title="Migrate your schemas with one prompt."
		deck="Paste once into Claude Code, Codex or Cursor. It installs the skill, converts your schemas, checks types and tests, and wires up @ark/aot."
		layout="split"
		aside={
			<div
				className="migrate-box"
				data-migrate
				data-prompt-aot={migratePromptAot}
				data-prompt-dynamic={migratePromptDynamic}
			>
				<div className="migrate-bar">
					<span className="migrate-label">Paste into your agent</span>
					<label className="migrate-toggle">
						<input type="checkbox" defaultChecked data-migrate-aot />
						<span>
							include <code>@ark/aot</code>
						</span>
					</label>
				</div>
				<CopyCommand text={migratePromptAot} label="Copy migration prompt">
					<span className="p">›</span>{" "}
					<span data-migrate-text>{migratePromptAot}</span>
				</CopyCommand>
				<div className="migrate-alt">
					<span className="migrate-alt-lbl">or install the skill directly</span>
					<CopyCommand text={skillCommand} label="Copy skill install command">
						<span className="p">$</span> {skillCommand}
					</CopyCommand>
				</div>
			</div>
		}
		figure={<Conversion />}
		caveat={
			!isPending(claims.bigApp) &&
			bigAppLine() && (
				<p className="loses">
					<b>A real app, migrated.</b> {bigAppLine()}
				</p>
			)
		}
	>
		<Drills
			name="migrate"
			links={
				<>
					<Link className="drill-link" href="/docs/migrating">
						the migration guide →
					</Link>
					<Link className="drill-link" href="/docs/agents">
						ArkType for agents →
					</Link>
				</>
			}
		>
			<Drill
				chip="what you keep, what it costs"
				verdict="Messages you wrote and the libraries that read your schemas carry over. Async refinements and Zod's default error text don't."
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
