import { ArkCard, ArkCards } from "../../components/ArkCard"
import { CodeBlock } from "../../components/CodeBlock"
import { Hero } from "../../components/Hero"
import { TsIcon } from "../../components/icons/ts"
import { LinkCard } from "../../components/LinkCard"
import { RuntimeBenchmarksGraph } from "../../components/RuntimeBenchmarksGraph"

import {
	LightbulbIcon,
	MessageCircleWarning,
	MessageSquareTextIcon,
	RocketIcon,
	SearchIcon
} from "lucide-react"

export default () => (
	<div className="flex-1 pt-40 container relative pb-20">
		<Hero />
		<h2 className="text-4xl text-highlight font-semibold mb-3">What awaits</h2>

		<ArkCards>
			<ArkCard title="Unparalleled DX" icon={<TsIcon height={20} />}>
				<p>
					Type syntax you already know with safety and completions unlike
					anything you&apos;ve ever seen
				</p>
				<CodeBlock fromFile="unparalleledDx" />
			</ArkCard>
			<ArkCard title="Faster... everything" icon={<RocketIcon />}>
				<p>
					100x faster than Zod at runtime with editor performance that will
					remind you how autocomplete is supposed to feel
				</p>
				<RuntimeBenchmarksGraph className="mt-2" />
			</ArkCard>
			<ArkCard title="Clarity and Concision" icon={<MessageSquareTextIcon />}>
				<p>
					Definitions are half as long, type errors are twice as readable, and
					hovers tell you just what really matters
				</p>
				<CodeBlock fromFile="clarityAndConcision" />
			</ArkCard>
			<ArkCard title="Better Errors" icon={<MessageCircleWarning />}>
				<p>Deeply customizable messages with great defaults</p>
				<CodeBlock fromFile="betterErrors" />
			</ArkCard>
			<ArkCard title="Deep Introspectability" icon={<SearchIcon />}>
				<p>
					ArkType uses set theory to understand and expose the relationships
					between your types at runtime the way TypeScript does at compile time
				</p>
				<CodeBlock fromFile="deepIntrospectability" />
			</ArkCard>
			<ArkCard title="Intrinsic Optimization" icon={<LightbulbIcon />}>
				<p>
					Every schema is internally normalized and reduced to its purest and
					fastest representation
				</p>
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
