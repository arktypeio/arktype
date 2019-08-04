import React, { FC } from "react"
import { Button, ButtonProps } from "./Button"

export type PrimaryButtonProps = ButtonProps

export const PrimaryButton: FC<PrimaryButtonProps> = props => (
    <Button color="primary" variant="contained" {...props} />
)
