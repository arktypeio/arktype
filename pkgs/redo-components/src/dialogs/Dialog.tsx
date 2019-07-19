import React from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Dialog as MuiDialog, DialogTitle } from "@material-ui/core"
import { DialogProps as MuiDialogProps } from "@material-ui/core/Dialog"

const stylize = makeStyles((theme: Theme) => {})

export type DialogProps = MuiDialogProps & {
    open: boolean
    title: string
}

export const Dialog = ({
    classes,
    title,
    open,
    children,
    ...rest
}: DialogProps) => (
    <MuiDialog open={open} {...rest}>
        <DialogTitle>{title}</DialogTitle>
        {children}
    </MuiDialog>
)
