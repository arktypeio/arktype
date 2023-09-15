const useMediaQuery = (s: string) => false

export const useIsMobile = () => useMediaQuery("(max-width:1250px)")

export const useInstallationBlockShouldFloat = () =>
	useMediaQuery("(min-width:1420px)")
