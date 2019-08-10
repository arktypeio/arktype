import React, { FC, useState } from "react"
import { ModalView } from "./ModalView"
import { Button, ButtonProps } from "../buttons"
import AddIcon from "@material-ui/icons/Add"
import IconButton from "@material-ui/core/IconButton"
import { Row } from "../layouts"

export type ModalButtonProps = {}

export const ModalButton: FC<ModalButtonProps> = ({ children, ...rest }) => {
    const [open, setOpen] = useState(false)
    return (
        <Row>
            <IconButton size="small" onClick={() => setOpen(true)} {...rest}>
                <AddIcon />
            </IconButton>
            <ModalView open={open} onClose={() => setOpen(false)} />
        </Row>
    )
}
