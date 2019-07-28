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

// export const SecondarySignUpButton = (props: SecondaryButtonLinkProps) => {
//     const [changePage] = useMutation({})
//     const linkTo = Page.SignUp
//     const onClick2 = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
//         if (onClick2) {
//             onClick2(e)
//         }
//         if (linkTo) {
//             changePage({ page: linkTo })
//         }
//     }
//     return <SecondaryButton onClick={onClick2} {...props} />
// }
