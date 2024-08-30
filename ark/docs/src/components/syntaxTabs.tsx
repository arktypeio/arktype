import { flatMorph } from "@ark/util"
import { TabItem, Tabs } from "@astrojs/starlight/components"
import Code from "./Code.astro"

export type CodeBySyntaxKind = {
	string?: string
	tuple?: string
	spread?: string
	fluent?: string
}

export type SyntaxTabsProps = {
	children: CodeBySyntaxKind
}

export const SyntaxTabs = ({ children }: SyntaxTabsProps) => (
	<Tabs>
		{flatMorph(children, (syntaxKind, code, i: number) => [
			i,
			<TabItem label={syntaxKind}>
				<Code code={code} lang="ts" />
			</TabItem>
		])}
	</Tabs>
)
