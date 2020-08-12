import React, { useState } from "react"
import { SignUpDialog } from "../../signUp/SignUp"
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
    const [dialogOpen, setDialogOpen] = useState(false)
    const openDialog = () => setDialogOpen(true)
    const getStartedProps = {
        onClick: openDialog,
        animateScroll
    }
    return (
        <>
            {mobile ? (
                <GetStartedMobile {...getStartedProps} />
            ) : (
                <GetStartedDesktop {...getStartedProps} />
            )}
            <SignUpDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </>
    )
}
