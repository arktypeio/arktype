import Link from "next/link"
import { ArkTypeLogo } from "../icons/arktype-logo.tsx"

export const Brand = () => (
	<Link href="/" className="brand" aria-label="ArkType home">
		<ArkTypeLogo height={26} width={26} />
		<span>ArkType</span>
	</Link>
)
