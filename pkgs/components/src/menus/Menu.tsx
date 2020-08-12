import React, { MutableRefObject } from "react"
import MuiPopper, {
    PopperProps as MuiPopperProps
} from "@material-ui/core/Popper"
import { MenuList, Paper } from "@material-ui/core"
import MuiClickAwayListener from "@material-ui/core/ClickAwayListener"
import { MenuItemProps as MuiMenuItemProps } from "@material-ui/core/MenuItem"
import { MenuItem } from "./MenuItem"

export type MenuOptions = Record<string, () => any>

export type MenuProps = Partial<MuiPopperProps> & {
    itemProps?: MuiMenuItemProps
    anchorTo: any
    open: boolean
    options: MenuOptions
    onClickAway?: () => void
    onSelectItem?: () => void
}

export const Menu = ({
    itemProps,
    anchorTo,
    open,
    options,
    onClickAway = () => {},
    onSelectItem,
    ...rest
}: MenuProps) => {
    return (
        <MuiPopper open={open} anchorEl={anchorTo} {...rest}>
            <Paper>
                <MuiClickAwayListener onClickAway={onClickAway}>
                    <>
                        {Object.entries(options).map(([name, onClick]) => (
                            <MenuItem
                                onClick={() => {
                                    onClick()
                                    onSelectItem && onSelectItem()
                                }}
                                key={name}
                                {...(itemProps as any)}
                            >
                                {name}
                            </MenuItem>
                        ))}
                    </>
                </MuiClickAwayListener>
            </Paper>
        </MuiPopper>
    )
}
