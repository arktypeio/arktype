import type { CSSProperties } from "react"
import { claims } from "../../lib/claims.ts"
import { ClaimText } from "../mdx/Claim.tsx"
import { CopyCommand } from "./CopyCommand.tsx"
import { HomeCode } from "./HomeCode.tsx"

const zod = `// ---cut-start---
declare const data: unknown
// ---cut-end---
import { z } from "zod"

const User = z.object({
	name: z.string().min(1),
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
	name: "string > 0",
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
	["safeParse returns { success }", "check instanceof type.errors"]
]

/** migrating with the skill: one command, one prompt, the guide it follows */
export const Migrate = () => (
	<section className="block" id="migrate" aria-labelledby="migrate-title">
		<div className="sec-label">
			<b>02</b>
			{"// migrate"}
		</div>
		<h2 id="migrate-title">
			One command, one prompt.{" "}
			<span className="hl">Your agent follows the guide.</span>
		</h2>
		<p className="deck">
			The ArkType skill teaches your agent the syntax and the mistakes to avoid,
			and links a migration guide: the workflow, a table for each library and
			every default that differs. Then precompiling is one plugin in the bundler
			you already run.
		</p>
		<ol className="moves" data-reveal>
			<li style={{ "--i": 0 } as CSSProperties}>
				<span className="move-n">1</span>
				<h3>Add the skill</h3>
				<CopyCommand
					text="npx skills add arktypeio/arktype"
					label="Copy skill install command"
				>
					<span className="p">$</span> npx skills add arktypeio/arktype
				</CopyCommand>
			</li>
			<li style={{ "--i": 1 } as CSSProperties}>
				<span className="move-n">2</span>
				<h3>Ask your agent</h3>
				<CopyCommand
					text="Migrate this project from Zod to ArkType."
					label="Copy migration prompt"
				>
					<span className="p">›</span> Migrate this project from Zod to ArkType.
				</CopyCommand>
			</li>
			<li style={{ "--i": 2 } as CSSProperties}>
				<span className="move-n">3</span>
				<h3>Precompile</h3>
				<a className="url" href="/docs/precompile/setup">
					plugins: [precompile.vite()]
				</a>
			</li>
		</ol>
		<div className="convert">
			<figure className="code-card">
				<figcaption>
					<span>
						<b>user.ts</b>
						<span className="dot">·</span>before
					</span>
					<span>Zod</span>
				</figcaption>
				<HomeCode code={zod} />
			</figure>
			<div className="convert-arrow" aria-hidden>
				<span>→</span>
			</div>
			<figure className="code-card glow">
				<figcaption>
					<span>
						<b>user.ts</b>
						<span className="dot">·</span>after
					</span>
					<span>ArkType</span>
				</figcaption>
				<HomeCode code={ark} />
			</figure>
		</div>
		<div className="guide">
			<div>
				<h3>What it follows</h3>
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
					<a className="link" href="/docs/migrating">
						Read the guide
					</a>
				</p>
			</div>
			<div>
				<h3>Where a literal translation goes wrong</h3>
				<dl className="differs">
					{differs.map(([from, to]) => (
						<div key={from}>
							<dt>{from}</dt>
							<dd>{to}</dd>
						</div>
					))}
				</dl>
			</div>
		</div>
		<p className="note">
			{"// "}
			<ClaimText claim={claims.zodMigration} />
		</p>
	</section>
)
