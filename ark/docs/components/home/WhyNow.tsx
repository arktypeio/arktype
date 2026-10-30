import type { CSSProperties } from "react"
import { provenance } from "../../lib/bench/bench.ts"
import { headlineMethod } from "../../lib/claims.ts"

/** what a change to precompiled output has to agree with, each a script in package.json */
const checks: [script: string, what: string][] = [
	[
		"testDifferential",
		"every Type ArkType's own test suites call, precompiled in each layout, returns what dynamic ArkType returns on every input the suites passed it"
	],
	[
		"testPerturbation",
		"change what the build read before the program runs, like a key, an export or a prototype: the precompiled program throws as it starts or still agrees with ArkType"
	],
	[
		"testPrograms",
		"generated programs agree run as written and precompiled, unchanged and under every perturbation"
	],
	[
		"testPruneParity",
		"a production bundle missing what no code reads validates every input as one built whole, once negative controls show the check catches a dropped check"
	],
	[
		"testHistory",
		"each test sees the same thing fresh, twice in one process and after a random sample of the others"
	],
	[
		"testEnvironments",
		"a program prints the same in other time zones and locales, on Bun, Deno, Chromium and Firefox"
	]
]

/** a dev loop, one step a chip; `slow` is the step it waits on */
const Loop = ({ steps, slow }: { steps: string[]; slow?: string }) => (
	<ol className="loop" aria-label={steps.join(", then ")}>
		{steps.map(step => (
			<li key={step} className={step === slow ? "is-slow" : undefined}>
				{step}
			</li>
		))}
	</ol>
)

/** why ahead-of-time compilation is the better trade now: the loop a build step taxed is the agent's */
export const WhyNow = () => (
	<section className="block" id="why" aria-labelledby="why-title">
		<div className="sec-label">
			<b>01</b>
			{"// why now"}
		</div>
		<h2 id="why-title">
			DX priorities have shifted.{" "}
			<span className="hl">Agents don't mind a build step.</span>
		</h2>
		<p className="deck">
			Precompiled validators have always been faster and smaller. Runtime
			validators won anyway, because a build step taxed the loop you worked in.
			Now your agent works in that loop, so the trade has flipped, and ArkType's
			build is made for it.
		</p>
		<div className="sides" data-reveal>
			<div className="side">
				<span className="side-who">before</span>
				<h3>Edit, build, wait, reload</h3>
				<Loop steps={["edit", "build", "wait", "reload"]} slow="wait" />
				<p>
					Every change to a schema waited on a rebuild, and a compiler error was
					one more thing to look up. So the validator that parsed at runtime
					felt better to use, even though it shipped a parser to every user.
				</p>
			</div>
			<div className="side">
				<span className="side-who">now</span>
				<h3>Your agent's loop</h3>
				<Loop steps={["edit", "build", "read the error", "fix"]} />
				<p>
					Your agent rebuilds as it goes, so getting updated validators is a
					step nobody waits on. And a precompile error says exactly what to
					change, so the agent fixes it from the error alone:
				</p>
				<pre
					className="side-term"
					aria-label="Output of arktype-precompile --check"
				>
					<span className="p">$</span> npx arktype-precompile --check
					"src/**/*.ts"
					{"\n"}
					<span className="loc">src/forms.ts:14:19</span>
					{"  "}
					<span className="err">
						{"type(`string <= ${limit}`) cannot be precompiled"}
					</span>
					{"\n  "}
					<span className="dim">
						`limit` is a parameter of makeField (src/forms.ts:12:22); its value
						is known only at runtime
					</span>
					{"\n  "}Write the definition where makeField is called, with the value
					it passes for `limit`, so the build precompiles each call.
				</pre>
			</div>
		</div>
		<h3 className="sub" id="proof">
			Every optimization has to agree with ArkType.
		</h3>
		<p className="deck">
			Trading a runtime parser for generated code is only worth it if the code
			does exactly what ArkType would. These are the checks it has to pass.
		</p>
		<figure className="proof" data-proof aria-labelledby="proof-title">
			<figcaption className="term-bar">
				<span className="dots" aria-hidden>
					<i />
					<i />
					<i />
				</span>
				<span id="proof-title">what an optimization has to agree with</span>
			</figcaption>
			<ol className="proof-body">
				{checks.map(([script, what], i) => (
					<li key={script} style={{ "--i": i } as CSSProperties}>
						<span className="proof-mark" aria-hidden>
							<span className="spin" />
							<span className="tick">✓</span>
						</span>
						<code className="proof-cmd">pnpm {script}</code>
						<span className="proof-what">{what}</span>
					</li>
				))}
			</ol>
		</figure>
		<div className="receipt" data-reveal>
			<span className="side-who">and the numbers</span>
			<p>
				Our benchmark in 05 is one run of every library, {provenance.passes}{" "}
				passes at one commit, published whatever it showed, and a second run
				checks each verdict. The board's averages follow a rule we wrote before
				computing any.{" "}
				<a className="link ext" href={headlineMethod.href}>
					{headlineMethod.label}
				</a>
			</p>
		</div>
	</section>
)
