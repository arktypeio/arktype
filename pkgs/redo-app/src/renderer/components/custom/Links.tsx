import React, { FC } from "react"
import { Page } from "state"
import { SecondaryButton, SecondaryButtonProps } from "redo-components"
import { store } from "renderer/common"

export type SecondaryButtonLinkProps = SecondaryButtonProps

export const SecondarySignInButton: FC<SecondaryButtonLinkProps> = () => (
    <SecondaryButton
        onClick={() => store.mutate({ page: Page.SignIn })}
        {...props}
    >
        Back to sign in
    </SecondaryButton>
)
export const SecondarySignUpButton: FC<SecondaryButtonLinkProps> = () => (
    <SecondaryButton
        onClick={() => store.mutate({ page: Page.SignUp })}
        {...props}
    >
        Need an account?
    </SecondaryButton>
)
