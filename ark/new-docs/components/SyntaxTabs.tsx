import { Tab, Tabs, type TabsProps } from "fumadocs-ui/components/tabs"

export const syntaxKinds = [
	"string",
	"fluent",
	"tuple",
	"spread"
	// don't infer as readonly since Fumadocs (incorrectly) doesn't support that
] as const satisfies string[]

export type SyntaxKind = (typeof syntaxKinds)[number]

export const SyntaxTab: React.FC<{ children: string; kind: SyntaxKind }> = ({
	children,
	kind
}) => <Tab value={kind}>{children}</Tab>

export const SyntaxTabs: React.FC<TabsProps> = ({ children, ...rest }) => (
	<Tabs {...rest} items={syntaxKinds}>
		{children}
	</Tabs>
)
