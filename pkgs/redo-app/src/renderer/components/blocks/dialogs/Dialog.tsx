import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { component } from "blocks"
import { Dialog as MuiDialog, DialogTitle } from "@material-ui/core"
import { DialogProps as MuiDialogProps } from "@material-ui/core/Dialog"

const styles = (theme: Theme) => createStyles({})

export type DialogProps = MuiDialogProps & {
    open: boolean
    title: string
}

export const Dialog = component({
    name: "Dialog",
    defaultProps: {} as Partial<DialogProps>,
    styles
})(({ classes, title, open, children, ...rest }) => (
    <MuiDialog open={open} {...rest}>
        <DialogTitle>{title}</DialogTitle>
        {children}
    </MuiDialog>
))
