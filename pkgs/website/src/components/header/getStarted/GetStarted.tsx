import React from "react"
import { Link } from "@re-do/components"
import { GetStartedDesktop } from "./GetStartedDesktop"
import { GetStartedMobile } from "./GetStartedMobile"

export type GetStartedButtonProps = {
    animateScroll?: boolean
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
