import { useMediaQuery } from "@mui/material"

export const useIsMobile = () => useMediaQuery("(max-width:1250px)")

export const useInstallationBlockShouldFloat = () =>
	useMediaQuery("(min-width:1420px)")
