import type { omit, unionToPropwiseXor } from "@ark/util"
import { Tab, Tabs, type TabsProps } from "fumadocs-ui/components/tabs"
import type React from "react"

export const syntaxKinds = [
	"string",
	"fluent",
	"tuple",
	"spread"
	// don't infer as readonly since Fumadocs (incorrectly) doesn't support that
] as const satisfies string[]

export type SyntaxKind = (typeof syntaxKinds)[number]

export const SyntaxTabs: React.FC<omit<TabsProps, "items">> = ({
	children,
	...rest
}) => (
	<Tabs {...rest} items={syntaxKinds}>
		{children}
	</Tabs>
)

type DiscriminatedSyntaxKindProps = unionToPropwiseXor<
	{
		[kind in SyntaxKind]: { [k in kind]: true }
	}[SyntaxKind]
>

type SyntaxTabProps = DiscriminatedSyntaxKindProps & {
	children: React.ReactNode
}

export const SyntaxTab: React.FC<SyntaxTabProps> = props => (
	<Tab value={syntaxKinds.find(k => props[k])!}>{props.children}</Tab>
)
