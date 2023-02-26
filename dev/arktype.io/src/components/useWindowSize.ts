import { useMediaQuery } from "@mui/material"
import { useEffect, useState } from "react"

export const useWindowSize = (): { width: number; height: number } => {
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight
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

// Based on Docusaurus's mobile cutoff:
// https://docusaurus.io/docs/styling-layout#mobile-view
export const useIsMobile = () => useMediaQuery("(max-width:996px)")
