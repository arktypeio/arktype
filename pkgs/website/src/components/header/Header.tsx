import React, { useEffect, useState } from "react"
import { layout } from "../constants"
import { NavBar } from "./NavBar"
import { SubHeader } from "./SubHeader"
import { ScrollingGetStartedButton } from "./ScrollingGetStartedButton"

export type HeaderProps = {
    displaySubHeader?: boolean
}

export const Header = ({ displaySubHeader }: HeaderProps) => {
    const [width, setWidth] = useState(window.innerWidth)
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    })
    const angle = -Math.tan(layout.header.slantHeight / width)
    return (
        <>
            <NavBar skewAngle={angle} />
            {displaySubHeader ? <SubHeader skewAngle={angle} /> : null}
            {displaySubHeader ? <ScrollingGetStartedButton /> : null}
        </>
    )
}
