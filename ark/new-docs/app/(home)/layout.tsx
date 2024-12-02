import { HomeLayout } from "fumadocs-ui/layouts/home"
import type { ReactNode } from "react"
import { FloatYourBoat } from "../../components/FloatYourBoat.tsx"
import { baseOptions } from "../layout.config.tsx"

export default ({ children }: { children: ReactNode }): React.ReactElement => (
	<HomeLayout
		{...baseOptions}
		nav={{ ...baseOptions.nav, children: <FloatYourBoat /> }}
	>
		{children}
	</HomeLayout>
)
