import { Fragment } from "react"
import { highlightToJsx } from "./CodeBlock.tsx"
import {
	installCommand,
	installers,
	type InstallOptions
} from "./installCommand.ts"
import { TabGroup } from "./mdx/TabGroup.tsx"

export type InstallationTabsProps = InstallOptions

/** the install command for each package manager; the choice is remembered */
export const InstallationTabs = async (props: InstallationTabsProps) => (
	<TabGroup
		labels={installers}
		groupId="pm"
		persist
		code
		label="Package manager"
		panels={await Promise.all(
			installers.map(async installer => (
				<Fragment key={installer}>
					{await highlightToJsx(installCommand(installer, props), "bash")}
				</Fragment>
			))
		)}
	/>
)
