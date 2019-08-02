import React, { FC } from "react"
import { Button, ButtonProps } from "./Button"

export type PrimaryButtonProps = ButtonProps

export const PrimaryButton: FC<PrimaryButtonProps> = ({ ...rest }) => (
    <Button color="primary" variant="contained" {...rest} />
)
