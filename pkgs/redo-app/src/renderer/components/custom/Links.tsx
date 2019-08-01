import React from "react"
import { Page } from "state"
import { SecondaryButton, SecondaryButtonProps } from "redo-components"
import { store } from "renderer/common"

export type SecondaryButtonLinkProps = SecondaryButtonProps

export const SecondarySignInButton = (props: SecondaryButtonLinkProps) => (
    <SecondaryButton
        onClick={() => store.mutate({ page: Page.SignIn })}
        {...props}
    >
        Back to sign in
    </SecondaryButton>
)
export const SecondarySignUpButton = (props: SecondaryButtonLinkProps) => (
    <SecondaryButton
        onClick={() => store.mutate({ page: Page.SignUp })}
        {...props}
    >
        Need an account?
    </SecondaryButton>
)
