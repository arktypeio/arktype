import type { MDXComponents } from "mdx/types"
import { AnchorAliases } from "../AnchorAliases.tsx"
import { MainAutoplayDemo } from "../AutoplayDemo.tsx"
import { CodeBlock } from "../CodeBlock.tsx"
import { InstallationTabs } from "../InstallationTabs.tsx"
import {
	AllKeywordTables,
	GenericKeywordTable,
	KeywordTable,
	NumberKeywordTable,
	StringKeywordTable
} from "../KeywordTable.tsx"
import { RuntimeBenchmarksGraph } from "../RuntimeBenchmarksGraph.tsx"
import { SyntaxTab, SyntaxTabs } from "../SyntaxTabs.tsx"
import { ApiMember, ApiMembers } from "./ApiMembers.tsx"
import { BenchmarkChart } from "./BenchmarkChart.tsx"
import { Callout } from "./Callout.tsx"
import { Card, Cards, LinkCard } from "./Cards.tsx"
import {
	Claim,
	ClaimCharts,
	Headline,
	HeadlineNote,
	PresetSizeTable
} from "./Claim.tsx"
import { Pre } from "./CodeFrame.tsx"
import { Heading } from "./Heading.tsx"
import { Link } from "./Link.tsx"
import { Step, Steps } from "./Steps.tsx"
import { Table } from "./Table.tsx"
import { Tab, Tabs } from "./Tabs.tsx"

/** every component docs content can use; see the MDX component contract */
export const mdxComponents: MDXComponents = {
	h2: props => <Heading as="h2" {...props} />,
	h3: props => <Heading as="h3" {...props} />,
	h4: props => <Heading as="h4" {...props} />,
	h5: props => <Heading as="h5" {...props} />,
	h6: props => <Heading as="h6" {...props} />,
	a: Link,
	pre: Pre,
	table: Table,
	AllKeywordTables,
	AnchorAliases,
	ApiMember,
	ApiMembers,
	BenchmarkChart,
	Callout,
	Card,
	Cards,
	Claim,
	ClaimCharts,
	Headline,
	HeadlineNote,
	CodeBlock,
	GenericKeywordTable,
	InstallationTabs,
	KeywordTable,
	LinkCard,
	// the demo itself is small; the playground behind it loads only when opened
	MainAutoplayDemo,
	NumberKeywordTable,
	PresetSizeTable,
	// the 2.0 post's chart; new content uses BenchmarkChart
	RuntimeBenchmarksGraph,
	Step,
	Steps,
	StringKeywordTable,
	SyntaxTab,
	SyntaxTabs,
	Tab,
	Tabs
}
