import React from "react"
import add from "@material-ui/icons/Add"
import collapse from "@material-ui/icons/ExpandMore"
import expandRight from "@material-ui/icons/ChevronRight"
import expandDown from "@material-ui/icons/ExpandMore"
import home from "@material-ui/icons/Home"
import openModal from "@material-ui/icons/OpenInNew"
import menu from "@material-ui/icons/Menu"
import schedule from "@material-ui/icons/Schedule"
import run from "@material-ui/icons/PlayArrow"
import edit from "@material-ui/icons/Edit"
import trash from "@material-ui/icons/Delete"
import back from "@material-ui/icons/ArrowBack"
import help from "@material-ui/icons/HelpOutline"
import account from "@material-ui/icons/Person"
import dropdown from "@material-ui/icons/MoreVert"
import view from "@material-ui/icons/RemoveRedEye"
import save from "@material-ui/icons/Done"
import close from "@material-ui/icons/Close"
import linkedIn from "@material-ui/icons/LinkedIn"
import email from "@material-ui/icons/Email"
import gitHub from "@material-ui/icons/GitHub"
import twitter from "@material-ui/icons/Twitter"
import video from "@material-ui/icons/VideocamOutlined"
import blog from "@material-ui/icons/Notes"
import code from "@material-ui/icons/Code"
import settings from "@material-ui/icons/Settings"
import cancel from "@material-ui/icons/Cancel"
import menuBook from "@material-ui/icons/MenuBook"
import SvgIcon, { SvgIconProps } from "@material-ui/core/SvgIcon"
import { twitchPath } from "./paths.js"

const toIcon = (path: string, name: string): typeof SvgIcon => {
    const IconComponent = (props: SvgIconProps) => (
        <SvgIcon {...props}>
            <path d={path} />
        </SvgIcon>
    )
    IconComponent.muiName = name
    return IconComponent
}

const twitch = toIcon(twitchPath, "twitch")

export const Icons = {
    add,
    code,
    collapse,
    edit,
    expandRight,
    expandDown,
    home,
    openModal,
    run,
    schedule,
    trash,
    back,
    help,
    account,
    dropdown,
    view,
    save,
    close,
    blog,
    email,
    linkedIn,
    gitHub,
    twitch,
    twitter,
    video,
    menu,
    settings,
    cancel,
    menuBook
}
