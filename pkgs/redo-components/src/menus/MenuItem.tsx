import React from "react"
import { Theme } from "@material-ui/core"
import MuiMenuItem, {
    MenuItemProps as MuiMenuItemProps
} from "@material-ui/core/MenuItem"

//Mui's button prop type isn't compatible with itself. Somehow.
export type MenuItemProps = MuiMenuItemProps & { button?: true }

export const MenuItem = React.forwardRef(
    (props: MenuItemProps, ref: React.Ref<HTMLLIElement>) => (
        <MuiMenuItem ref={ref} {...props} />
    )
)
