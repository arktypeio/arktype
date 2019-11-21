import React from "react"
import MuiIconButton, {
    IconButtonProps as MuiIconButtonProps
} from "@material-ui/core/IconButton"

export type IconButtonProps = MuiIconButtonProps & { Icon: React.ComponentType }

export const IconButton = ({ Icon, ...rest }: IconButtonProps) => {
    return (
        <MuiIconButton {...rest}>
            <Icon />
        </MuiIconButton>
    )
}
