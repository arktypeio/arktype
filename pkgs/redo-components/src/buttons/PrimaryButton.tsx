import React from "react"
import { Theme } from "@material-ui/core"
import { createStyles } from "@material-ui/styles"
import { component } from "blocks"
import { Button, ButtonProps } from "./Button"

const styles = (theme: Theme) => createStyles({})

export type PrimaryButtonProps = ButtonProps

export const PrimaryButton = component({
    name: "PrimaryButton",
    defaultProps: {} as Partial<PrimaryButtonProps>,
    styles
})(({ classes, ...rest }) => (
    <Button color="primary" variant="contained" {...rest} />
))
