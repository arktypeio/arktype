import React from "react"
import { GetStartedDesktop } from "./GetStartedDesktop.js"
import { GetStartedMobile } from "./GetStartedMobile.js"

export type GetStartedButtonProps = {
    animateScroll?: boolean | undefined
    mobile: boolean
}

export const GetStarted = ({
    mobile,
    animateScroll
}: GetStartedButtonProps) => {
    return (
        <a href={"https://docs.redo.qa"} target="_blank">
            {mobile ? (
                <GetStartedMobile animateScroll={animateScroll} />
            ) : (
                <GetStartedDesktop animateScroll={animateScroll} />
            )}
        </a>
    )
}
