import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.jsx"
import { baseOptions } from "../layout.config.jsx"

export type LayoutProps = {
	children: ReactNode
}

export default ({ children }: LayoutProps): React.ReactElement => (
	<HomeLayout
		{...baseOptions}
		nav={{ ...baseOptions.nav, children: <FloatYourBoat /> }}
	>
		{children}
	</HomeLayout>
)
