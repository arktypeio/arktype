import {
	LightbulbIcon,
	MessageCircleWarning,
	MessageSquareTextIcon,
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

		<ArkCards>
			<ArkCard title="Unparalleled DX" icon={<TsIcon height={20} />}>
				Type syntax you already know with safety and completions unlike anything
				you've ever seen
				<CodeBlock fromFile="unparalleledDx" includesCompletions />
			</ArkCard>
			<ArkCard title="Better Errors" icon={<MessageCircleWarning />}>
				Deeply customizable messages with great defaults
				<CodeBlock fromFile="betterErrors" />
			</ArkCard>
			<ArkCard title="Clarity and Concision" icon={<MessageSquareTextIcon />}>
				Definitions are half as long, type errors are twice as readable, and
				hovers tell you just what really matters
				<CodeBlock fromFile="clarityAndConcision" />
			</ArkCard>
			<ArkCard title="Faster... everything" icon={<RocketIcon />}>
				100x faster than Zod and 2,000x faster than Yup at runtime, with editor
				performance that will remind you how autocomplete is supposed to feel
				<RuntimeBenchmarksGraph className="mt-2" />
			</ArkCard>
			<ArkCard title="Deep Introspectability" icon={<SearchIcon />}>
				ArkType uses set theory to understand and expose the relationships
				between your types at runtime the way TypeScript does at compile time
				<CodeBlock fromFile="deepIntrospectability" />
			</ArkCard>
			<ArkCard title="Intrinsic Optimization" icon={<LightbulbIcon />}>
				Every schema is internally normalized and reduced to its purest and
				fastest representation
				<CodeBlock fromFile="intrinsicOptimization" />
			</ArkCard>
			{/* <Card title="Portable" icon="seti:json">
        <p>
		Most definitions are just objects and strings- take them across the stack or
		even outside JS altogether
    </p>
	</Card> */}
		</ArkCards>

		<LinkCard
			title="Doc up"
			description="Everything you need to know from installation to integration"
			href="/docs/intro/setup"
			className="sm:mt-16 mt-4"
		/>
	</div>
)
