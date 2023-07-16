import { useMediaQuery } from "@mui/material"
import { useEffect, useState } from "react"

export const useWindowSize = (): { width: number; height: number } => {
	const [windowSize, setWindowSize] = useState({
		width: globalThis.innerWidth,
		height: globalThis.innerHeight
	})

	useEffect(() => {
		const handleResize = (): void => {
			setWindowSize({
				width: window.innerWidth,
				height: window.innerHeight
			})
		}

		window.addEventListener("resize", handleResize)

		return (): void => {
			window.removeEventListener("resize", handleResize)
		}
	}, [])

	return windowSize
}

export const useIsMobile = () => useMediaQuery("(max-width:1250px)")

export const useInstallationBlockShouldFloat = () =>
	useMediaQuery("(min-width:1420px)")
