import type { omit, unionToPropwiseXor } from "@ark/util"
import { Tab, Tabs, type TabsProps } from "fumadocs-ui/components/tabs"
import { Children, isValidElement, type FC } from "react"

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
	<Tabs
		{...rest}
		// only include the tabs that were actually used
		items={syntaxKinds.filter(kind =>
			Children.toArray(children).some(
				child =>
					isValidElement(child) &&
					(child.props as SyntaxTabProps | undefined)?.[kind]
			)
		)}
	>
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

export const SyntaxTab: FC<SyntaxTabProps> = props => (
	<Tab value={syntaxKinds.find(k => props[k])!}>{props.children}</Tab>
)
