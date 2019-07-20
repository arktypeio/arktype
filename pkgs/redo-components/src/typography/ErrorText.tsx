import React from "react"
import { Theme, Typography } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"

const stylize = makeStyles((theme: Theme) => ({
    errorMessage: {
        color: theme.palette.error.main
    }
}))

export type ErrorTextProps = {
    children: string
}

export const ErrorText = ({ children }: ErrorTextProps) => {
    const { errorMessage } = stylize()
    return (
        <Typography variant="caption" className={errorMessage} noWrap>
            {`🤔${children}`}
        </Typography>
    )
}
