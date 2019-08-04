import React, { FC } from "react"
import { Dialog as MuiDialog, DialogTitle } from "@material-ui/core"
import { DialogProps as MuiDialogProps } from "@material-ui/core/Dialog"

export type DialogProps = MuiDialogProps & {
    open: boolean
    title: string
}

export const Dialog: FC<DialogProps> = ({
    classes,
    title,
    open,
    children,
    ...rest
}) => (
    <MuiDialog open={open} {...rest}>
        <DialogTitle>{title}</DialogTitle>
        {children}
    </MuiDialog>
)
