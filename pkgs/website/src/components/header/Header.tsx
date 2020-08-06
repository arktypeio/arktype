import React, { useEffect, useState } from "react"
import { layout } from "../constants"
import { NavBar } from "./NavBar"
import { SubHeader } from "./SubHeader"
import { GetStarted } from "./getStarted"

const { height, slantHeight } = layout.header

export type HeaderProps = {
    displaySubHeader?: boolean
}

export const Header = ({ displaySubHeader }: HeaderProps) => {
    const [width, setWidth] = useState(window.innerWidth)
    const useMobileLayout = width < 800
    useEffect(() => {
        const handleResize = () => setWidth(window.innerWidth)
        window.addEventListener("resize", handleResize)
        return () => {
            window.removeEventListener("resize", handleResize)
        }
    })
    const angle = -Math.tan(slantHeight / width)
    return (
        <>
            <NavBar skewAngle={angle} mobile={useMobileLayout} />
            {displaySubHeader ? (
                <SubHeader skewAngle={angle} mobile={useMobileLayout} />
            ) : null}
            <GetStarted mobile={useMobileLayout} />
        </>
    )
}
