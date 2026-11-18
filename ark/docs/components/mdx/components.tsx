import type { MDXComponents } from "mdx/types"
import { AnchorAliases } from "../AnchorAliases.tsx"
import { MainAutoplayDemo } from "../AutoplayDemo.tsx"
import { CodeBlock } from "../CodeBlock.tsx"
import { InstallationTabs } from "../InstallationTabs.tsx"
import { KeywordTable } from "../KeywordTable.tsx"
import { Compile } from "../precompile/Compile.tsx"
import { RuntimeBenchmarksGraph } from "../RuntimeBenchmarksGraph.tsx"
import { SyntaxTab, SyntaxTabs } from "../SyntaxTabs.tsx"
import { ApiMember, ApiMembers } from "./ApiMembers.tsx"
import { Callout } from "./Callout.tsx"
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
import { LinkCard } from "./LinkCard.tsx"
import {
	SizeScaleChart,
	SizeScaleCosts,
	SizeScaleCrossovers,
	SizeScaleFits,
	SizeScaleParagraph,
	SizeScaleTable,
	SizeScaleText
} from "./SizeScale.tsx"
import { Table } from "./Table.tsx"
import { Tab, Tabs } from "./Tabs.tsx"

/** every component docs content can use, and those lib/content/expand.ts writes into it */
export const mdxComponents: MDXComponents = {
	h2: props => <Heading as="h2" {...props} />,
	h3: props => <Heading as="h3" {...props} />,
	h4: props => <Heading as="h4" {...props} />,
	h5: props => <Heading as="h5" {...props} />,
	h6: props => <Heading as="h6" {...props} />,
	a: Link,
	pre: Pre,
	table: Table,
	AnchorAliases,
	ApiMember,
	ApiMembers,
	Callout,
	Claim,
	ClaimCharts,
	Headline,
	HeadlineNote,
	CodeBlock,
	InstallationTabs,
	KeywordTable,
	LinkCard,
	// a definition and what the build writes for it, editable
	LivePrecompile: Compile,
	// the demo itself is small; the playground behind it loads only when opened
	MainAutoplayDemo,
	PresetSizeTable,
	// the 2.0 post's chart
	RuntimeBenchmarksGraph,
	// bundle size at scale, from lib/bench/sizeScale.ts
	SizeScaleChart,
	SizeScaleCosts,
	SizeScaleCrossovers,
	SizeScaleFits,
	SizeScaleParagraph,
	SizeScaleTable,
	SizeScaleText,
	SyntaxTab,
	SyntaxTabs,
	Tab,
	Tabs
}
