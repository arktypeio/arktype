import React, { FC, useState } from "react"
import { Text, TextProps } from "../text"
import { useTheme, makeStyles, Theme } from "../styles"
import { ModalView } from "./ModalView"
import { DisplayAs } from "../displayAs"

export type ModalTextProps = TextProps & { displayAs: DisplayAs }

export const ModalText: FC<ModalTextProps> = ({ displayAs, ...rest }) => {
    const [open, setOpen] = useState(false)
    const theme = useTheme()
    return (
        <>
            <Text onClick={() => setOpen(true)} style={{}} noWrap {...rest} />
            <ModalView
                displayAs={displayAs}
                open={open}
                onClose={() => setOpen(false)}
            />
        </>
    )
}
