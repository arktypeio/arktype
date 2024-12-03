import type { omit } from "@ark/util"
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

export const SyntaxTab: React.FC<{
	children: React.ReactNode
	kind: SyntaxKind
}> = ({ children, kind }) => <Tab value={kind}>{children}</Tab>
