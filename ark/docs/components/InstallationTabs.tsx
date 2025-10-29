import { Tab, Tabs } from "fumadocs-ui/components/tabs"
import { CodeBlock } from "./CodeBlock.tsx"

const installerCommands = {
	pnpm: "install",
	npm: "install",
	yarn: "add",
	bun: "add"
} as const satisfies Record<string, string>

type InstallationTabProps = {
	name: keyof typeof installerCommands
}

const InstallerTab = ({ name }: InstallationTabProps) => (
	<Tab value={name} className="installer-tab">
		<CodeBlock lang="bash">{`${name} ${installerCommands[name]} arktype`}</CodeBlock>
	</Tab>
)

export const InstallationTabs = () => (
	<Tabs items={Object.keys(installerCommands)}>
		<InstallerTab name="pnpm" />
		<InstallerTab name="npm" />
		<InstallerTab name="yarn" />
		<InstallerTab name="bun" />
	</Tabs>
)
