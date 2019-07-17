import React from "react"
import { Page } from "state"
import { SecondaryButton, SecondaryButtonProps } from "blocks"

export type SecondaryButtonLinkProps = SecondaryButtonProps

export const SecondarySignInButton = (props: SecondaryButtonLinkProps) => (
    <SecondaryButton linkTo={Page.SignIn} {...props} />
)
export const SecondarySignUpButton = (props: SecondaryButtonLinkProps) => (
    <SecondaryButton linkTo={Page.SignUp} {...props} />
)
