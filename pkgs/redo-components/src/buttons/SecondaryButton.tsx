import React, { FC } from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Button, ButtonProps } from "./Button"

const stylize = makeStyles((theme: Theme) => ({
    text: {
        color: theme.palette.common.black
    }
}))

export type SecondaryButtonProps = ButtonProps

export const SecondaryButton: FC<SecondaryButtonProps> = ({ ...rest }) => {
    const { text } = stylize()
    return <Button className={text} variant="outlined" {...rest} />
}
