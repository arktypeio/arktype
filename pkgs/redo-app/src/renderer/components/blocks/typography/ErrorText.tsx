import React from "react"
import { component } from "blocks"
import { Theme, Typography } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"

const styles = (theme: Theme) =>
    createStyles({
        errorMessage: {
            color: theme.palette.error.main
        }
    })

export type ErrorTextProps = {
    children: string
}

export const ErrorText = component({
    name: "ErrorText",
    defaultProps: {} as Partial<ErrorTextProps>,
    styles
})(({ children, classes }) => (
    <Typography variant="caption" className={classes.errorMessage} noWrap>
        {`🤔${children}`}
    </Typography>
))
