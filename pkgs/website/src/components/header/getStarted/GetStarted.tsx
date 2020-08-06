import React, { useState } from "react"
import { SignUpDialog } from "../../signUp/SignUp"
import { GetStartedButton } from "./GetStartedButton"
import { GetStartedFab } from "./GetStartedFab"

export type GetStartedButtonProps = {
    mobile: boolean
}

export const GetStarted = ({ mobile }: GetStartedButtonProps) => {
    const [dialogOpen, setDialogOpen] = useState(false)
    const openDialog = () => setDialogOpen(true)
    return (
        <>
            {mobile ? (
                <GetStartedFab onClick={openDialog} />
            ) : (
                <GetStartedButton onClick={openDialog} />
            )}
            <SignUpDialog
                open={dialogOpen}
                onClose={() => setDialogOpen(false)}
            />
        </>
    )
}
