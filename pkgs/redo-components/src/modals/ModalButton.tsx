import React, { FC, useState } from "react"
import { ModalView, ModalViewProps } from "./ModalView"
import EditIcon from "@material-ui/icons/Edit"
import { Button } from "@material-ui/core"
import IconButton, { IconButtonProps } from "@material-ui/core/IconButton"
import { makeStyles } from "@material-ui/styles"
import { Row } from "../layouts"
import { DisplayAs } from "../displayAs"

const stylize = makeStyles({
    sizeSmall: {
        minWidth: 0
    }
})

export type ModalButtonProps = IconButtonProps &
    ModalViewProps & {
        displayAs: DisplayAs
    }

//use Menu as template to fix design
export const ModalButton: FC<ModalButtonProps> = ({
    children,
    contents,
    displayAs,
    ...rest
}) => {
    const [open, setOpen] = useState(false)
    const { sizeSmall } = stylize()
    return (
        <Row>
            <IconButton
                classes={{ root: sizeSmall }}
                size="small"
                onClick={() => setOpen(true)}
                {...rest}
            >
                <EditIcon />
            </IconButton>
            <ModalView
                contents={contents}
                displayAs={displayAs}
                open={open}
                onClose={() => setOpen(false)}
            />
        </Row>
    )
}
