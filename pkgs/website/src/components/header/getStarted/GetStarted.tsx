import React from "react"
import { Link } from "@re-do/components"
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
        <Link to={"documentation"}>
            {mobile ? (
                <GetStartedMobile animateScroll={animateScroll} />
            ) : (
                <GetStartedDesktop animateScroll={animateScroll} />
            )}
        </Link>
    )
}
