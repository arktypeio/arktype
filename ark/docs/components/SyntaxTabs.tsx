import type { omit, unionToPropwiseXor } from "@ark/util"
import { Tab, Tabs, type TabsProps } from "fumadocs-ui/components/tabs"
import { Children, isValidElement, type FC } from "react"

export const syntaxKinds = [
	"string",
	"fluent",
	"tuple",
	"args",
	"generic"
	// don't infer as readonly since Fumadocs (incorrectly) doesn't support that
] as const satisfies string[]

export type SyntaxKind = (typeof syntaxKinds)[number]

export const SyntaxTabs: React.FC<omit<TabsProps, "items">> = ({
	children,
	...rest
}) => {
	const usedKinds = Children.toArray(children as never).flatMap(child => {
		if (!isValidElement(child)) return []
		if (!child.props) return []

		const props = child.props as SyntaxTabProps

		const matchingKind = syntaxKinds.find(k => props[k])
		if (!matchingKind) return []

		return matchingKind
	})

	return (
		<Tabs {...rest} items={usedKinds}>
			{children}
		</Tabs>
	)
}

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
