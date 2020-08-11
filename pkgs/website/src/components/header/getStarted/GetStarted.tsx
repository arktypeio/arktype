import React, { useState } from "react"
import { SignUpDialog } from "../../signUp/SignUp"
import { GetStartedDesktop } from "./GetStartedDesktop"
import { GetStartedMobile } from "./GetStartedMobile"

export type GetStartedButtonProps = {
    mobile: boolean
}

export const GetStarted = ({ mobile }: GetStartedButtonProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const openDialog = () => setDialogOpen(true)
    return (
        <>
            {mobile ? (
                <GetStartedMobile onClick={openDialog} />
            ) : (
                <GetStartedDesktop onClick={openDialog} />
            )}
            <SignUpDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </>
    )
}
