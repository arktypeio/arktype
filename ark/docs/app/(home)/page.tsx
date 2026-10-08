import {
	BotIcon,
	FunnelIcon,
	LightbulbIcon,
	MessageCircleWarning,
	RocketIcon,
	SearchIcon
} from "lucide-react"
import { ArkCard, ArkCards } from "../../components/ArkCard.tsx"
import { CodeBlock } from "../../components/CodeBlock.tsx"
import { Hero } from "../../components/Hero.tsx"
import { TsIcon } from "../../components/icons/ts.tsx"
import { LinkCard } from "../../components/LinkCard.tsx"
import { RuntimeBenchmarksGraph } from "../../components/RuntimeBenchmarksGraph.tsx"

export default () => (
	<div className="flex-1 pt-40 container relative pb-20">
		<Hero />

		<section className="mt-20 mb-8">
			<h2 className="text-3xl md:text-4xl font-semibold mb-3">
				If you can write the type, you can validate it
			</h2>
			<p className="text-fd-muted-foreground text-xl mb-6">
				The definition on the right is the type on the left, checked at runtime.
				Hover either <code>User</code> to compare.
			</p>
			<div className="grid md:grid-cols-2 gap-4">
				<div>
					<p className="text-lg mb-2">TypeScript</p>
					<CodeBlock fromFile="typescriptUser" />
				</div>
				<div>
					<p className="text-lg mb-2">ArkType</p>
					<CodeBlock fromFile="arktypeUser" />
				</div>
			</div>
		</section>

		<ArkCards>
			<ArkCard title="Types You Already Know" icon={<TsIcon height={20} />}>
				TypeScript's syntax, with autocomplete inside every string
				<CodeBlock
					style={{ marginTop: "1rem" }}
					fromFile="unparalleledDx"
					includesCompletions
				/>
			</ArkCard>
			<ArkCard title="Better Errors" icon={<MessageCircleWarning />}>
				Messages say what was expected and what arrived, and every one is
				customizable
				<CodeBlock style={{ marginTop: "1rem" }} fromFile="readableErrors" />
			</ArkCard>
			<ArkCard title="Clarity and Concision" icon={<FunnelIcon />}>
				A mistake in a definition is a type error that says what's wrong, right
				where you made it
				<CodeBlock
					style={{ marginTop: "1rem" }}
					fromFile="clarityAndConcision"
				/>
			</ArkCard>
			<ArkCard title="Faster... everything" icon={<RocketIcon />}>
				20x faster than Zod 4 and 2,000x faster than Yup at runtime, and ready
				for TypeScript 7's native compiler in your editor
				<RuntimeBenchmarksGraph className="pt-4" />
			</ArkCard>
			<ArkCard title="Deep Introspectability" icon={<SearchIcon />}>
				Check whether one type extends another at runtime, the way TypeScript
				does at compile time
				<CodeBlock style={{ marginTop: "1rem" }} fromFile="assignability" />
			</ArkCard>
			<ArkCard title="Intrinsic Optimization" icon={<LightbulbIcon />}>
				Every type is reduced to its simplest form before it validates anything
				<CodeBlock style={{ marginTop: "1rem" }} fromFile="reduction" />
			</ArkCard>
		</ArkCards>

		<section className="sm:mt-28 mt-16 grid md:grid-cols-2 gap-6 items-center">
			<div>
				<h2 className="text-3xl font-semibold mb-3 flex items-center gap-3">
					<BotIcon /> Teach your agent ArkType
				</h2>
				<p className="text-fd-muted-foreground text-lg">
					Install the skill, and Claude Code, Codex or Cursor write definitions
					with current syntax instead of guessing from whatever they saw in
					training. Every docs page is also Markdown: add <code>.md</code> to
					its URL, or point your agent at{" "}
					<a href="/llms.txt" className="underline">
						/llms.txt
					</a>
					.
				</p>
			</div>
			<CodeBlock lang="bash">npx skills add arktypeio/arktype</CodeBlock>
		</section>

		<div className="grid sm:grid-cols-2 gap-4 sm:mt-16 mt-8">
			<LinkCard
				title="Doc up"
				description="Everything you need to know from installation to integration"
				href="/docs/intro/setup"
			/>
			<LinkCard
				title="With your agent"
				description="The ArkType skill, Markdown docs and llms.txt"
				href="/docs/agents"
			/>
		</div>
	</div>
)
