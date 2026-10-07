import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { CodeBlock } from "./CodeBlock.tsx"

const installers = ["pnpm", "npm", "yarn", "bun"] as const satisfies string[]

export type Installer = (typeof installers)[number]

export type InstallationTabsProps = {
	pkg?: string
	dev?: boolean
}

type InstallerTabProps = InstallationTabsProps & {
	name: Installer
}

const InstallerTab = ({ name, pkg = "arktype", dev }: InstallerTabProps) => (
	<Tab value={name} className="installer-tab">
		<CodeBlock lang="bash">{`${name} ${name === "yarn" || name === "bun" ? "add" : "install"}${dev ? " -D" : ""} ${pkg}`}</CodeBlock>
	</Tab>
)

export const InstallationTabs = (props: InstallationTabsProps) => (
	<Tabs items={installers}>
		{installers.map(name => (
			<InstallerTab key={name} name={name} {...props} />
		))}
	</Tabs>
)
