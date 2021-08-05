import React from "react"
import { layout } from "../../constants.js"
import { NavBar } from "./NavBar.js"
import { Column } from "@re-do/components"
import { SubHeader } from "./SubHeader.js"
import { GetStarted } from "./getStarted"

const { slantHeight } = layout.header

export type HeaderProps = {
    mobile: boolean
    animateScroll?: boolean | undefined
    displaySubHeader?: boolean
    displayGetStarted?: boolean
    overrideMobile?: boolean
}

export const Header = ({
    displaySubHeader,
    animateScroll,
    mobile,
    displayGetStarted,
    overrideMobile
}: HeaderProps) => {
    const angle = -Math.tan(slantHeight / window.innerWidth)
    return (
        <Column full align="center" style={{ paddingBottom: slantHeight }}>
            <NavBar skewAngle={angle} mobile={mobile} />
            {!overrideMobile && (mobile || displaySubHeader) ? (
                <SubHeader
                    skewAngle={angle}
                    mobile={mobile}
                    animateScroll={animateScroll}
                />
            ) : null}
            {displayGetStarted && (
                <GetStarted animateScroll={animateScroll} mobile={mobile} />
            )}
        </Column>
    )
}
