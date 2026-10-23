import type { CSSProperties } from "react"

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

const plan =
	"https://github.com/arktypeio/arktype/blob/main/ark/repo/bench/external/README.md"

/** why precompiling is possible now: the build step and the proof, both agents' work */
export const WhyNow = () => (
	<section className="block" id="why" aria-labelledby="why-title">
		<div className="sec-label">
			<b>01</b>
			{"// why now"}
		</div>
		<h2 id="why-title">
			Faster and smaller was never the hard part.{" "}
			<span className="hl">Trusting it was.</span>
		</h2>
		<p className="deck">
			Compiling validators ahead of time has always beaten parsing them at
			runtime. Two costs kept it rare, and agentic development took both.
		</p>
		<div className="sides" data-reveal>
			<div className="side">
				<span className="side-who">for you</span>
				<h3>The build step</h3>
				<p>
					A plugin to set up, errors you'd never seen and a second model of what
					runs where. Your agent doesn't care: it runs the build, reads the
					error and applies the fix the error names.
				</p>
				<pre className="side-term" aria-label="A precompile error">
					<span className="loc">src/forms.ts:14:19</span>{" "}
					<span className="err">
						{"type(`string <= ${limit}`) cannot be precompiled"}
					</span>
					{"\n"}
					<span className="dim">
						`limit` is known only at runtime. Make it static, or build with
						runtime: "arktype".
					</span>
				</pre>
			</div>
			<div className="side">
				<span className="side-who">for us</span>
				<h3>The proof</h3>
				<p>
					Precompiling ArkType means specialized code for every construct it
					has: unions that discriminate themselves, morphs, scopes, generics,
					cycles. Then pruning whatever your program never reads. Each of those
					is a new way to validate differently than ArkType does, which is a lot
					to check by hand. So agents wrote the checks, and every optimization
					had to pass them.
				</p>
			</div>
		</div>
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
				Every speed sentence on this page is a test we fixed before its data:
				one run, published whatever it shows. When the release candidate missed
				one, its sentence fell back to what the instruction counts proved, until
				the release's run of the same plan held.{" "}
				<a className="link ext" href={plan}>
					The plan
				</a>
			</p>
		</div>
	</section>
)
