import React from "react"
import { Theme } from "@material-ui/core"
import { makeStyles } from "@material-ui/styles"
import { Button, ButtonProps } from "./Button"

export type PrimaryButtonProps = ButtonProps

export const PrimaryButton = ({ ...rest }: PrimaryButtonProps) => (
    <Button color="primary" variant="contained" {...rest} />
)
