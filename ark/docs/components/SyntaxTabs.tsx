import type { unionToPropwiseXor } from "@ark/util"
import { Children, isValidElement, type ReactNode } from "react"
import { TabGroup } from "./mdx/TabGroup.tsx"
import { tabPanelsOf } from "./mdx/Tabs.tsx"

export const syntaxKinds = [
	"string",
	"fluent",
	"tuple",
	"args",
	"generic"
] as const

export type SyntaxKind = (typeof syntaxKinds)[number]

type DiscriminatedSyntaxKindProps = unionToPropwiseXor<
	{
		[kind in SyntaxKind]: { [k in kind]: true }
	}[SyntaxKind]
>

export type SyntaxTabProps = DiscriminatedSyntaxKindProps & {
	children: ReactNode
}

/** one way of writing a definition, only meaningful inside SyntaxTabs */
export const SyntaxTab = (props: SyntaxTabProps) => <>{props.children}</>

const kindOf = (props: Partial<Record<SyntaxKind, unknown>>) =>
	syntaxKinds.find(kind => props[kind])

/**
 * The same definition in each syntax it can be written in, in a fixed
 * order. The reader's choice applies to every SyntaxTabs on the site and
 * is remembered; a group without it shows its first syntax.
 */
export const SyntaxTabs = ({ children }: { children: ReactNode }) => {
	const contentByKind = new Map<SyntaxKind, ReactNode>()
	for (const child of Children.toArray(children)) {
		if (!isValidElement<SyntaxTabProps>(child)) continue
		const kind = kindOf(child.props)
		if (kind) contentByKind.set(kind, child.props.children)
	}
	const kinds = syntaxKinds.filter(kind => contentByKind.has(kind))
	const { code, panels } = tabPanelsOf(
		kinds.map(kind => contentByKind.get(kind))
	)
	return (
		<TabGroup
			labels={kinds}
			groupId="syntax"
			persist
			code={code}
			label="Syntax"
			panels={panels}
		/>
	)
}
