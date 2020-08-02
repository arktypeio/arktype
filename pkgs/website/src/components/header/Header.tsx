import React, { useEffect, useState } from "react"
import { layout } from "../constants"
import { HeaderTitle } from "./HeaderTitle"
import { SubHeader } from "./SubHeader"
import { ScrollingGetStartedButton } from "./ScrollingGetStartedButton"

export type HeaderProps = {}

export const Header = ({}: HeaderProps) => {
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
            <HeaderTitle skewAngle={angle} />
            <SubHeader skewAngle={angle} />
            <ScrollingGetStartedButton />
        </>
    )
}
