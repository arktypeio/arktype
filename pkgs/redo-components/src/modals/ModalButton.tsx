import React, { FC, useState } from "react"
import { Text, TextProps } from "../text"
import { ModalView } from "./ModalView"
import { Button, ButtonProps } from "../buttons"

export type ModalButtonProps = ButtonProps & {}

export const ModalButton: FC<ModalButtonProps> = ({ children, ...rest }) => {
    const [open, setOpen] = useState(false)
    return (
        <>
            <Button kind="secondary" onClick={() => setOpen(true)} {...rest}>
                {children}
            </Button>
            <ModalView open={open} onClose={() => setOpen(false)} />
        </>
    )
}
