import { assert } from "@re-/assert"
import { compile } from "@re-/model"

describe("stress", () => {
    test("large simple space", () => {
        const space = compile({
            user: {
                name: "string",
                bestFriend: "string?",
                groups: "string[]"
            },
            user2: {
                name2: "string",
                bestFriend2: "string?",
                groups2: "string[]"
            },
            user3: {
                name3: "string",
                bestFriend3: "string?",
                groups3: "string[]"
            },
            user4: {
                name4: "string",
                bestFriend4: "string?",
                groups4: "string[]"
            },
            user5: {
                name5: "string",
                bestFriend5: "string?",
                groups5: "string[]"
            },
            user6: {
                name6: "string",
                bestFriend6: "string?",
                groups6: "string[]"
            },
            user7: {
                name7: "string",
                bestFriend7: "string?",
                groups7: "string[]"
            },
            user8: {
                name8: "string",
                bestFriend8: "string?",
                groups8: "string[]"
            },
            user9: {
                name9: "string",
                bestFriend9: "string?",
                groups9: "string[]"
            },
            user10: {
                name10: "string",
                bestFriend10: "string?",
                groups10: "string[]"
            },
            user11: {
                name11: "string",
                bestFriend11: "string?",
                groups11: "string[]"
            },
            user12: {
                name12: "string",
                bestFriend12: "string?",
                groups12: "string[]"
            },
            user13: {
                name13: "string",
                bestFriend13: "string?",
                groups13: "string[]"
            },
            user14: {
                name14: "string",
                bestFriend14: "string?",
                groups14: "string[]"
            },
            user15: {
                name15: "string",
                bestFriend15: "string?",
                groups15: "string[]"
            },
            user16: {
                name16: "string",
                bestFriend16: "string?",
                groups16: "string[]"
            },
            user17: {
                name17: "string",
                bestFriend17: "string?",
                groups17: "string[]"
            },
            user18: {
                name18: "string",
                bestFriend18: "string?",
                groups18: "string[]"
            },
            user19: {
                name19: "string",
                bestFriend19: "string?",
                groups19: "string[]"
            },
            user20: {
                name20: "string",
                bestFriend20: "string?",
                groups20: "string[]"
            },
            user21: {
                name21: "string",
                bestFriend21: "string?",
                groups21: "string[]"
            },
            user22: {
                name22: "string",
                bestFriend22: "string?",
                groups22: "string[]"
            },
            user23: {
                name23: "string",
                bestFriend23: "string?",
                groups23: "string[]"
            },
            user24: {
                name24: "string",
                bestFriend24: "string?",
                groups24: "string[]"
            },
            user25: {
                name25: "string",
                bestFriend25: "string?",
                groups25: "string[]"
            },
            user26: {
                name26: "string",
                bestFriend26: "string?",
                groups26: "string[]"
            },
            user27: {
                name27: "string",
                bestFriend27: "string?",
                groups27: "string[]"
            },
            user28: {
                name28: "string",
                bestFriend28: "string?",
                groups28: "string[]"
            },
            user29: {
                name29: "string",
                bestFriend29: "string?",
                groups29: "string[]"
            },
            user30: {
                name30: "string",
                bestFriend30: "string?",
                groups30: "string[]"
            },
            user31: {
                name31: "string",
                bestFriend31: "string?",
                groups31: "string[]"
            },
            user32: {
                name32: "string",
                bestFriend32: "string?",
                groups32: "string[]"
            },
            user33: {
                name33: "string",
                bestFriend33: "string?",
                groups33: "string[]"
            },
            user34: {
                name34: "string",
                bestFriend34: "string?",
                groups34: "string[]"
            },
            user35: {
                name35: "string",
                bestFriend35: "string?",
                groups35: "string[]"
            },
            user36: {
                name36: "string",
                bestFriend36: "string?",
                groups36: "string[]"
            },
            user37: {
                name37: "string",
                bestFriend37: "string?",
                groups37: "string[]"
            },
            user38: {
                name38: "string",
                bestFriend38: "string?",
                groups38: "string[]"
            },
            user39: {
                name39: "string",
                bestFriend39: "string?",
                groups39: "string[]"
            },
            user40: {
                name40: "string",
                bestFriend40: "string?",
                groups40: "string[]"
            },
            user41: {
                name41: "string",
                bestFriend41: "string?",
                groups41: "string[]"
            },
            user42: {
                name42: "string",
                bestFriend42: "string?",
                groups42: "string[]"
            },
            user43: {
                name43: "string",
                bestFriend43: "string?",
                groups43: "string[]"
            },
            user44: {
                name44: "string",
                bestFriend44: "string?",
                groups44: "string[]"
            },
            user45: {
                name45: "string",
                bestFriend45: "string?",
                groups45: "string[]"
            },
            user46: {
                name46: "string",
                bestFriend46: "string?",
                groups46: "string[]"
            },
            user47: {
                name47: "string",
                bestFriend47: "string?",
                groups47: "string[]"
            },
            user48: {
                name48: "string",
                bestFriend48: "string?",
                groups48: "string[]"
            },
            user49: {
                name49: "string",
                bestFriend49: "string?",
                groups49: "string[]"
            },
            user50: {
                name50: "string",
                bestFriend50: "string?",
                groups50: "string[]"
            },
            group: {
                title: "string",
                members: "string[]"
            },
            group2: {
                title2: "string",
                members2: "string[]"
            },
            group3: {
                title3: "string",
                members3: "string[]"
            },
            group4: {
                title4: "string",
                members4: "string[]"
            },
            group5: {
                title5: "string",
                members5: "string[]"
            },
            group6: {
                title6: "string",
                members6: "string[]"
            },
            group7: {
                title7: "string",
                members7: "string[]"
            },
            group8: {
                title8: "string",
                members8: "string[]"
            },
            group9: {
                title9: "string",
                members9: "string[]"
            },
            group10: {
                title10: "string",
                members10: "string[]"
            },
            group11: {
                title11: "string",
                members11: "string[]"
            },
            group12: {
                title12: "string",
                members12: "string[]"
            },
            group13: {
                title13: "string",
                members13: "string[]"
            },
            group14: {
                title14: "string",
                members14: "string[]"
            },
            group15: {
                title15: "string",
                members15: "string[]"
            },
            group16: {
                title16: "string",
                members16: "string[]"
            },
            group17: {
                title17: "string",
                members17: "string[]"
            },
            group18: {
                title18: "string",
                members18: "string[]"
            },
            group19: {
                title19: "string",
                members19: "string[]"
            },
            group20: {
                title20: "string",
                members20: "string[]"
            },
            group21: {
                title21: "string",
                members21: "string[]"
            },
            group22: {
                title22: "string",
                members22: "string[]"
            },
            group23: {
                title23: "string",
                members23: "string[]"
            },
            group24: {
                title24: "string",
                members24: "string[]"
            },
            group25: {
                title25: "string",
                members25: "string[]"
            },
            group26: {
                title26: "string",
                members26: "string[]"
            },
            group27: {
                title27: "string",
                members27: "string[]"
            },
            group28: {
                title28: "string",
                members28: "string[]"
            },
            group29: {
                title29: "string",
                members29: "string[]"
            },
            group30: {
                title30: "string",
                members30: "string[]"
            },
            group31: {
                title31: "string",
                members31: "string[]"
            },
            group32: {
                title32: "string",
                members32: "string[]"
            },
            group33: {
                title33: "string",
                members33: "string[]"
            },
            group34: {
                title34: "string",
                members34: "string[]"
            },
            group35: {
                title35: "string",
                members35: "string[]"
            },
            group36: {
                title36: "string",
                members36: "string[]"
            },
            group37: {
                title37: "string",
                members37: "string[]"
            },
            group38: {
                title38: "string",
                members38: "string[]"
            },
            group39: {
                title39: "string",
                members39: "string[]"
            },
            group40: {
                title40: "string",
                members40: "string[]"
            },
            group41: {
                title41: "string",
                members41: "string[]"
            },
            group42: {
                title42: "string",
                members42: "string[]"
            },
            group43: {
                title43: "string",
                members43: "string[]"
            },
            group44: {
                title44: "string",
                members44: "string[]"
            },
            group45: {
                title45: "string",
                members45: "string[]"
            },
            group46: {
                title46: "string",
                members46: "string[]"
            },
            group47: {
                title47: "string",
                members47: "string[]"
            },
            group48: {
                title48: "string",
                members48: "string[]"
            },
            group49: {
                title49: "string",
                members49: "string[]"
            },
            group50: {
                title50: "string",
                members50: "string[]"
            }
        })
        assert(space.types.group12.members12[0]).typed as string
    })
    test("large cyclic space", () => {
        const space = compile({
            user: {
                name: "string",
                bestFriend: "user?",
                groups: "group[]"
            },
            user2: {
                name2: "string",
                bestFriend2: "user43?",
                groups2: "group43[]"
            },
            user3: {
                name3: "string",
                bestFriend3: "user35?",
                groups3: "group5[]"
            },
            user4: {
                name4: "string",
                bestFriend4: "user11?",
                groups4: "group19[]"
            },
            user5: {
                name5: "string",
                bestFriend5: "user30?",
                groups5: "group46[]"
            },
            user6: {
                name6: "string",
                bestFriend6: "user15?",
                groups6: "group20[]"
            },
            user7: {
                name7: "string",
                bestFriend7: "user50?",
                groups7: "group37[]"
            },
            user8: {
                name8: "string",
                bestFriend8: "user7?",
                groups8: "group20[]"
            },
            user9: {
                name9: "string",
                bestFriend9: "user14?",
                groups9: "group45[]"
            },
            user10: {
                name10: "string",
                bestFriend10: "user34?",
                groups10: "group39[]"
            },
            user11: {
                name11: "string",
                bestFriend11: "user24?",
                groups11: "group3[]"
            },
            user12: {
                name12: "string",
                bestFriend12: "user7?",
                groups12: "group17[]"
            },
            user13: {
                name13: "string",
                bestFriend13: "user34?",
                groups13: "group18[]"
            },
            user14: {
                name14: "string",
                bestFriend14: "user18?",
                groups14: "group20[]"
            },
            user15: {
                name15: "string",
                bestFriend15: "user37?",
                groups15: "group8[]"
            },
            user16: {
                name16: "string",
                bestFriend16: "user14?",
                groups16: "group49[]"
            },
            user17: {
                name17: "string",
                bestFriend17: "user31?",
                groups17: "group23[]"
            },
            user18: {
                name18: "string",
                bestFriend18: "user6?",
                groups18: "group24[]"
            },
            user19: {
                name19: "string",
                bestFriend19: "user20?",
                groups19: "group21[]"
            },
            user20: {
                name20: "string",
                bestFriend20: "user2?",
                groups20: "group8[]"
            },
            user21: {
                name21: "string",
                bestFriend21: "user32?",
                groups21: "group25[]"
            },
            user22: {
                name22: "string",
                bestFriend22: "user13?",
                groups22: "group48[]"
            },
            user23: {
                name23: "string",
                bestFriend23: "user12?",
                groups23: "group3[]"
            },
            user24: {
                name24: "string",
                bestFriend24: "user29?",
                groups24: "group30[]"
            },
            user25: {
                name25: "string",
                bestFriend25: "user38?",
                groups25: "group44[]"
            },
            user26: {
                name26: "string",
                bestFriend26: "user38?",
                groups26: "group25[]"
            },
            user27: {
                name27: "string",
                bestFriend27: "user24?",
                groups27: "group16[]"
            },
            user28: {
                name28: "string",
                bestFriend28: "user47?",
                groups28: "group48[]"
            },
            user29: {
                name29: "string",
                bestFriend29: "user24?",
                groups29: "group36[]"
            },
            user30: {
                name30: "string",
                bestFriend30: "user32?",
                groups30: "group12[]"
            },
            user31: {
                name31: "string",
                bestFriend31: "user26?",
                groups31: "group39[]"
            },
            user32: {
                name32: "string",
                bestFriend32: "user34?",
                groups32: "group30[]"
            },
            user33: {
                name33: "string",
                bestFriend33: "user19?",
                groups33: "group50[]"
            },
            user34: {
                name34: "string",
                bestFriend34: "user23?",
                groups34: "group22[]"
            },
            user35: {
                name35: "string",
                bestFriend35: "user16?",
                groups35: "group8[]"
            },
            user36: {
                name36: "string",
                bestFriend36: "user28?",
                groups36: "group11[]"
            },
            user37: {
                name37: "string",
                bestFriend37: "user42?",
                groups37: "group31[]"
            },
            user38: {
                name38: "string",
                bestFriend38: "user4?",
                groups38: "group37[]"
            },
            user39: {
                name39: "string",
                bestFriend39: "user9?",
                groups39: "group50[]"
            },
            user40: {
                name40: "string",
                bestFriend40: "user17?",
                groups40: "group28[]"
            },
            user41: {
                name41: "string",
                bestFriend41: "user18?",
                groups41: "group37[]"
            },
            user42: {
                name42: "string",
                bestFriend42: "user41?",
                groups42: "group42[]"
            },
            user43: {
                name43: "string",
                bestFriend43: "user45?",
                groups43: "group32[]"
            },
            user44: {
                name44: "string",
                bestFriend44: "user18?",
                groups44: "group39[]"
            },
            user45: {
                name45: "string",
                bestFriend45: "user48?",
                groups45: "group13[]"
            },
            user46: {
                name46: "string",
                bestFriend46: "user15?",
                groups46: "group18[]"
            },
            user47: {
                name47: "string",
                bestFriend47: "user13?",
                groups47: "group19[]"
            },
            user48: {
                name48: "string",
                bestFriend48: "user20?",
                groups48: "group10[]"
            },
            user49: {
                name49: "string",
                bestFriend49: "user37?",
                groups49: "group5[]"
            },
            user50: {
                name50: "string",
                bestFriend50: "user28?",
                groups50: "group9[]"
            },
            group: {
                title: "string",
                members: "user[]"
            },
            group2: {
                title2: "string",
                members2: "user3[]"
            },
            group3: {
                title3: "string",
                members3: "user27[]"
            },
            group4: {
                title4: "string",
                members4: "user15[]"
            },
            group5: {
                title5: "string",
                members5: "user18[]"
            },
            group6: {
                title6: "string",
                members6: "user14[]"
            },
            group7: {
                title7: "string",
                members7: "user21[]"
            },
            group8: {
                title8: "string",
                members8: "user18[]"
            },
            group9: {
                title9: "string",
                members9: "user42[]"
            },
            group10: {
                title10: "string",
                members10: "user17[]"
            },
            group11: {
                title11: "string",
                members11: "user45[]"
            },
            group12: {
                title12: "string",
                members12: "user32[]"
            },
            group13: {
                title13: "string",
                members13: "user20[]"
            },
            group14: {
                title14: "string",
                members14: "user47[]"
            },
            group15: {
                title15: "string",
                members15: "user10[]"
            },
            group16: {
                title16: "string",
                members16: "user35[]"
            },
            group17: {
                title17: "string",
                members17: "user7[]"
            },
            group18: {
                title18: "string",
                members18: "user45[]"
            },
            group19: {
                title19: "string",
                members19: "user48[]"
            },
            group20: {
                title20: "string",
                members20: "user48[]"
            },
            group21: {
                title21: "string",
                members21: "user44[]"
            },
            group22: {
                title22: "string",
                members22: "user3[]"
            },
            group23: {
                title23: "string",
                members23: "user28[]"
            },
            group24: {
                title24: "string",
                members24: "user14[]"
            },
            group25: {
                title25: "string",
                members25: "user33[]"
            },
            group26: {
                title26: "string",
                members26: "user21[]"
            },
            group27: {
                title27: "string",
                members27: "user35[]"
            },
            group28: {
                title28: "string",
                members28: "user25[]"
            },
            group29: {
                title29: "string",
                members29: "user15[]"
            },
            group30: {
                title30: "string",
                members30: "user26[]"
            },
            group31: {
                title31: "string",
                members31: "user5[]"
            },
            group32: {
                title32: "string",
                members32: "user18[]"
            },
            group33: {
                title33: "string",
                members33: "user30[]"
            },
            group34: {
                title34: "string",
                members34: "user17[]"
            },
            group35: {
                title35: "string",
                members35: "user18[]"
            },
            group36: {
                title36: "string",
                members36: "user37[]"
            },
            group37: {
                title37: "string",
                members37: "user9[]"
            },
            group38: {
                title38: "string",
                members38: "user50[]"
            },
            group39: {
                title39: "string",
                members39: "user25[]"
            },
            group40: {
                title40: "string",
                members40: "user32[]"
            },
            group41: {
                title41: "string",
                members41: "user47[]"
            },
            group42: {
                title42: "string",
                members42: "user28[]"
            },
            group43: {
                title43: "string",
                members43: "user20[]"
            },
            group44: {
                title44: "string",
                members44: "user18[]"
            },
            group45: {
                title45: "string",
                members45: "user15[]"
            },
            group46: {
                title46: "string",
                members46: "user20[]"
            },
            group47: {
                title47: "string",
                members47: "user48[]"
            },
            group48: {
                title48: "string",
                members48: "user10[]"
            },
            group49: {
                title49: "string",
                members49: "user16[]"
            },
            group50: {
                title50: "string",
                members50: "user22[]"
            }
        })
        assert(space.types.user4.groups4[0].members19[0].groups48[0].title10)
            .typed as string
    })
})
