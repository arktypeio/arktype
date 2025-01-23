import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { baseOptions } from "../layout.config.tsx"

export type LayoutProps = {
	children: ReactNode
}

export default ({ children }: LayoutProps): React.ReactElement => (
	<HomeLayout
		style={{
			paddingTop: 0
		}}
		{...baseOptions}
		nav={{
			...baseOptions.nav,
			children: <FloatYourBoat kind="header" />
		}}
	>
		<title>ArkType</title>
		{children}
	</HomeLayout>
)
