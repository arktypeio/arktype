import { bench } from "@re-/assert"
import { compile } from "@re-/model"

bench("compile-cyclic(10)", () => {
    const space = compile({
        user: {
            name: "string",
            friends: "user[]?",
            groups: "group[]"
        },
        user2: {
            name2: "string",
            friends2: "user5[]?",
            groups2: "group4[]"
        },
        user3: {
            name3: "string",
            friends3: "user5[]?",
            groups3: "group4[]"
        },
        user4: {
            name4: "string",
            friends4: "user2[]?",
            groups4: "group4[]"
        },
        user5: {
            name5: "string",
            friends5: "user3[]?",
            groups5: "group2[]"
        },
        group: {
            title: "string",
            members: "user[]",
            isActive: "boolean|undefined"
        },
        group2: {
            title2: "string",
            members2: "user2[]",
            isActive2: "boolean|undefined"
        },
        group3: {
            title3: "string",
            members3: "user2[]",
            isActive3: "boolean|undefined"
        },
        group4: {
            title4: "string",
            members4: "user3[]",
            isActive4: "boolean|undefined"
        },
        group5: {
            title5: "string",
            members5: "user4[]",
            isActive5: "boolean|undefined"
        }
    })
})
    .median("3.52ms")
    .type.median("194.84ms")

bench("compile-cyclic(50)", () => {
    const space = compile({
        user: {
            name: "string",
            friends: "user[]?",
            groups: "group[]"
        },
        user2: {
            name2: "string",
            friends2: "user6[]?",
            groups2: "group8[]"
        },
        user3: {
            name3: "string",
            friends3: "user5[]?",
            groups3: "group16[]"
        },
        user4: {
            name4: "string",
            friends4: "user21[]?",
            groups4: "group2[]"
        },
        user5: {
            name5: "string",
            friends5: "user14[]?",
            groups5: "group18[]"
        },
        user6: {
            name6: "string",
            friends6: "user12[]?",
            groups6: "group11[]"
        },
        user7: {
            name7: "string",
            friends7: "user12[]?",
            groups7: "group5[]"
        },
        user8: {
            name8: "string",
            friends8: "user9[]?",
            groups8: "group18[]"
        },
        user9: {
            name9: "string",
            friends9: "user9[]?",
            groups9: "group13[]"
        },
        user10: {
            name10: "string",
            friends10: "user8[]?",
            groups10: "group3[]"
        },
        user11: {
            name11: "string",
            friends11: "user13[]?",
            groups11: "group14[]"
        },
        user12: {
            name12: "string",
            friends12: "user3[]?",
            groups12: "group3[]"
        },
        user13: {
            name13: "string",
            friends13: "user19[]?",
            groups13: "group17[]"
        },
        user14: {
            name14: "string",
            friends14: "user10[]?",
            groups14: "group5[]"
        },
        user15: {
            name15: "string",
            friends15: "user17[]?",
            groups15: "group6[]"
        },
        user16: {
            name16: "string",
            friends16: "user13[]?",
            groups16: "group25[]"
        },
        user17: {
            name17: "string",
            friends17: "user24[]?",
            groups17: "group5[]"
        },
        user18: {
            name18: "string",
            friends18: "user2[]?",
            groups18: "group11[]"
        },
        user19: {
            name19: "string",
            friends19: "user22[]?",
            groups19: "group9[]"
        },
        user20: {
            name20: "string",
            friends20: "user2[]?",
            groups20: "group8[]"
        },
        user21: {
            name21: "string",
            friends21: "user12[]?",
            groups21: "group4[]"
        },
        user22: {
            name22: "string",
            friends22: "user11[]?",
            groups22: "group14[]"
        },
        user23: {
            name23: "string",
            friends23: "user7[]?",
            groups23: "group16[]"
        },
        user24: {
            name24: "string",
            friends24: "user4[]?",
            groups24: "group2[]"
        },
        user25: {
            name25: "string",
            friends25: "user19[]?",
            groups25: "group7[]"
        },
        group: {
            title: "string",
            members: "user[]",
            isActive: "boolean|undefined"
        },
        group2: {
            title2: "string",
            members2: "user21[]",
            isActive2: "boolean|undefined"
        },
        group3: {
            title3: "string",
            members3: "user3[]",
            isActive3: "boolean|undefined"
        },
        group4: {
            title4: "string",
            members4: "user10[]",
            isActive4: "boolean|undefined"
        },
        group5: {
            title5: "string",
            members5: "user18[]",
            isActive5: "boolean|undefined"
        },
        group6: {
            title6: "string",
            members6: "user6[]",
            isActive6: "boolean|undefined"
        },
        group7: {
            title7: "string",
            members7: "user10[]",
            isActive7: "boolean|undefined"
        },
        group8: {
            title8: "string",
            members8: "user15[]",
            isActive8: "boolean|undefined"
        },
        group9: {
            title9: "string",
            members9: "user8[]",
            isActive9: "boolean|undefined"
        },
        group10: {
            title10: "string",
            members10: "user7[]",
            isActive10: "boolean|undefined"
        },
        group11: {
            title11: "string",
            members11: "user18[]",
            isActive11: "boolean|undefined"
        },
        group12: {
            title12: "string",
            members12: "user12[]",
            isActive12: "boolean|undefined"
        },
        group13: {
            title13: "string",
            members13: "user3[]",
            isActive13: "boolean|undefined"
        },
        group14: {
            title14: "string",
            members14: "user7[]",
            isActive14: "boolean|undefined"
        },
        group15: {
            title15: "string",
            members15: "user24[]",
            isActive15: "boolean|undefined"
        },
        group16: {
            title16: "string",
            members16: "user25[]",
            isActive16: "boolean|undefined"
        },
        group17: {
            title17: "string",
            members17: "user6[]",
            isActive17: "boolean|undefined"
        },
        group18: {
            title18: "string",
            members18: "user12[]",
            isActive18: "boolean|undefined"
        },
        group19: {
            title19: "string",
            members19: "user3[]",
            isActive19: "boolean|undefined"
        },
        group20: {
            title20: "string",
            members20: "user4[]",
            isActive20: "boolean|undefined"
        },
        group21: {
            title21: "string",
            members21: "user15[]",
            isActive21: "boolean|undefined"
        },
        group22: {
            title22: "string",
            members22: "user16[]",
            isActive22: "boolean|undefined"
        },
        group23: {
            title23: "string",
            members23: "user17[]",
            isActive23: "boolean|undefined"
        },
        group24: {
            title24: "string",
            members24: "user7[]",
            isActive24: "boolean|undefined"
        },
        group25: {
            title25: "string",
            members25: "user23[]",
            isActive25: "boolean|undefined"
        }
    })
})
    .median("65.72ms")
    .type.median("255.38ms")

bench("compile-cyclic(100)", () => {
    const space = compile({
        user: {
            name: "string",
            friends: "user[]?",
            groups: "group[]"
        },
        user2: {
            name2: "string",
            friends2: "user21[]?",
            groups2: "group36[]"
        },
        user3: {
            name3: "string",
            friends3: "user21[]?",
            groups3: "group19[]"
        },
        user4: {
            name4: "string",
            friends4: "user27[]?",
            groups4: "group37[]"
        },
        user5: {
            name5: "string",
            friends5: "user50[]?",
            groups5: "group24[]"
        },
        user6: {
            name6: "string",
            friends6: "user31[]?",
            groups6: "group20[]"
        },
        user7: {
            name7: "string",
            friends7: "user49[]?",
            groups7: "group38[]"
        },
        user8: {
            name8: "string",
            friends8: "user44[]?",
            groups8: "group41[]"
        },
        user9: {
            name9: "string",
            friends9: "user33[]?",
            groups9: "group47[]"
        },
        user10: {
            name10: "string",
            friends10: "user39[]?",
            groups10: "group4[]"
        },
        user11: {
            name11: "string",
            friends11: "user17[]?",
            groups11: "group13[]"
        },
        user12: {
            name12: "string",
            friends12: "user36[]?",
            groups12: "group19[]"
        },
        user13: {
            name13: "string",
            friends13: "user48[]?",
            groups13: "group14[]"
        },
        user14: {
            name14: "string",
            friends14: "user26[]?",
            groups14: "group13[]"
        },
        user15: {
            name15: "string",
            friends15: "user10[]?",
            groups15: "group16[]"
        },
        user16: {
            name16: "string",
            friends16: "user30[]?",
            groups16: "group45[]"
        },
        user17: {
            name17: "string",
            friends17: "user13[]?",
            groups17: "group8[]"
        },
        user18: {
            name18: "string",
            friends18: "user22[]?",
            groups18: "group31[]"
        },
        user19: {
            name19: "string",
            friends19: "user42[]?",
            groups19: "group7[]"
        },
        user20: {
            name20: "string",
            friends20: "user45[]?",
            groups20: "group34[]"
        },
        user21: {
            name21: "string",
            friends21: "user44[]?",
            groups21: "group25[]"
        },
        user22: {
            name22: "string",
            friends22: "user7[]?",
            groups22: "group5[]"
        },
        user23: {
            name23: "string",
            friends23: "user7[]?",
            groups23: "group37[]"
        },
        user24: {
            name24: "string",
            friends24: "user45[]?",
            groups24: "group21[]"
        },
        user25: {
            name25: "string",
            friends25: "user26[]?",
            groups25: "group28[]"
        },
        user26: {
            name26: "string",
            friends26: "user18[]?",
            groups26: "group27[]"
        },
        user27: {
            name27: "string",
            friends27: "user34[]?",
            groups27: "group8[]"
        },
        user28: {
            name28: "string",
            friends28: "user18[]?",
            groups28: "group24[]"
        },
        user29: {
            name29: "string",
            friends29: "user43[]?",
            groups29: "group22[]"
        },
        user30: {
            name30: "string",
            friends30: "user41[]?",
            groups30: "group9[]"
        },
        user31: {
            name31: "string",
            friends31: "user32[]?",
            groups31: "group18[]"
        },
        user32: {
            name32: "string",
            friends32: "user47[]?",
            groups32: "group32[]"
        },
        user33: {
            name33: "string",
            friends33: "user9[]?",
            groups33: "group12[]"
        },
        user34: {
            name34: "string",
            friends34: "user6[]?",
            groups34: "group9[]"
        },
        user35: {
            name35: "string",
            friends35: "user35[]?",
            groups35: "group9[]"
        },
        user36: {
            name36: "string",
            friends36: "user8[]?",
            groups36: "group37[]"
        },
        user37: {
            name37: "string",
            friends37: "user32[]?",
            groups37: "group37[]"
        },
        user38: {
            name38: "string",
            friends38: "user47[]?",
            groups38: "group47[]"
        },
        user39: {
            name39: "string",
            friends39: "user41[]?",
            groups39: "group20[]"
        },
        user40: {
            name40: "string",
            friends40: "user3[]?",
            groups40: "group4[]"
        },
        user41: {
            name41: "string",
            friends41: "user48[]?",
            groups41: "group35[]"
        },
        user42: {
            name42: "string",
            friends42: "user2[]?",
            groups42: "group40[]"
        },
        user43: {
            name43: "string",
            friends43: "user12[]?",
            groups43: "group29[]"
        },
        user44: {
            name44: "string",
            friends44: "user24[]?",
            groups44: "group42[]"
        },
        user45: {
            name45: "string",
            friends45: "user14[]?",
            groups45: "group47[]"
        },
        user46: {
            name46: "string",
            friends46: "user49[]?",
            groups46: "group40[]"
        },
        user47: {
            name47: "string",
            friends47: "user39[]?",
            groups47: "group5[]"
        },
        user48: {
            name48: "string",
            friends48: "user7[]?",
            groups48: "group45[]"
        },
        user49: {
            name49: "string",
            friends49: "user47[]?",
            groups49: "group32[]"
        },
        user50: {
            name50: "string",
            friends50: "user12[]?",
            groups50: "group9[]"
        },
        group: {
            title: "string",
            members: "user[]",
            isActive: "boolean|undefined"
        },
        group2: {
            title2: "string",
            members2: "user32[]",
            isActive2: "boolean|undefined"
        },
        group3: {
            title3: "string",
            members3: "user18[]",
            isActive3: "boolean|undefined"
        },
        group4: {
            title4: "string",
            members4: "user21[]",
            isActive4: "boolean|undefined"
        },
        group5: {
            title5: "string",
            members5: "user34[]",
            isActive5: "boolean|undefined"
        },
        group6: {
            title6: "string",
            members6: "user12[]",
            isActive6: "boolean|undefined"
        },
        group7: {
            title7: "string",
            members7: "user30[]",
            isActive7: "boolean|undefined"
        },
        group8: {
            title8: "string",
            members8: "user12[]",
            isActive8: "boolean|undefined"
        },
        group9: {
            title9: "string",
            members9: "user45[]",
            isActive9: "boolean|undefined"
        },
        group10: {
            title10: "string",
            members10: "user19[]",
            isActive10: "boolean|undefined"
        },
        group11: {
            title11: "string",
            members11: "user34[]",
            isActive11: "boolean|undefined"
        },
        group12: {
            title12: "string",
            members12: "user43[]",
            isActive12: "boolean|undefined"
        },
        group13: {
            title13: "string",
            members13: "user47[]",
            isActive13: "boolean|undefined"
        },
        group14: {
            title14: "string",
            members14: "user26[]",
            isActive14: "boolean|undefined"
        },
        group15: {
            title15: "string",
            members15: "user3[]",
            isActive15: "boolean|undefined"
        },
        group16: {
            title16: "string",
            members16: "user29[]",
            isActive16: "boolean|undefined"
        },
        group17: {
            title17: "string",
            members17: "user30[]",
            isActive17: "boolean|undefined"
        },
        group18: {
            title18: "string",
            members18: "user30[]",
            isActive18: "boolean|undefined"
        },
        group19: {
            title19: "string",
            members19: "user11[]",
            isActive19: "boolean|undefined"
        },
        group20: {
            title20: "string",
            members20: "user44[]",
            isActive20: "boolean|undefined"
        },
        group21: {
            title21: "string",
            members21: "user34[]",
            isActive21: "boolean|undefined"
        },
        group22: {
            title22: "string",
            members22: "user22[]",
            isActive22: "boolean|undefined"
        },
        group23: {
            title23: "string",
            members23: "user10[]",
            isActive23: "boolean|undefined"
        },
        group24: {
            title24: "string",
            members24: "user38[]",
            isActive24: "boolean|undefined"
        },
        group25: {
            title25: "string",
            members25: "user31[]",
            isActive25: "boolean|undefined"
        },
        group26: {
            title26: "string",
            members26: "user34[]",
            isActive26: "boolean|undefined"
        },
        group27: {
            title27: "string",
            members27: "user42[]",
            isActive27: "boolean|undefined"
        },
        group28: {
            title28: "string",
            members28: "user40[]",
            isActive28: "boolean|undefined"
        },
        group29: {
            title29: "string",
            members29: "user28[]",
            isActive29: "boolean|undefined"
        },
        group30: {
            title30: "string",
            members30: "user48[]",
            isActive30: "boolean|undefined"
        },
        group31: {
            title31: "string",
            members31: "user39[]",
            isActive31: "boolean|undefined"
        },
        group32: {
            title32: "string",
            members32: "user41[]",
            isActive32: "boolean|undefined"
        },
        group33: {
            title33: "string",
            members33: "user19[]",
            isActive33: "boolean|undefined"
        },
        group34: {
            title34: "string",
            members34: "user7[]",
            isActive34: "boolean|undefined"
        },
        group35: {
            title35: "string",
            members35: "user26[]",
            isActive35: "boolean|undefined"
        },
        group36: {
            title36: "string",
            members36: "user26[]",
            isActive36: "boolean|undefined"
        },
        group37: {
            title37: "string",
            members37: "user29[]",
            isActive37: "boolean|undefined"
        },
        group38: {
            title38: "string",
            members38: "user50[]",
            isActive38: "boolean|undefined"
        },
        group39: {
            title39: "string",
            members39: "user30[]",
            isActive39: "boolean|undefined"
        },
        group40: {
            title40: "string",
            members40: "user8[]",
            isActive40: "boolean|undefined"
        },
        group41: {
            title41: "string",
            members41: "user6[]",
            isActive41: "boolean|undefined"
        },
        group42: {
            title42: "string",
            members42: "user9[]",
            isActive42: "boolean|undefined"
        },
        group43: {
            title43: "string",
            members43: "user39[]",
            isActive43: "boolean|undefined"
        },
        group44: {
            title44: "string",
            members44: "user24[]",
            isActive44: "boolean|undefined"
        },
        group45: {
            title45: "string",
            members45: "user18[]",
            isActive45: "boolean|undefined"
        },
        group46: {
            title46: "string",
            members46: "user43[]",
            isActive46: "boolean|undefined"
        },
        group47: {
            title47: "string",
            members47: "user23[]",
            isActive47: "boolean|undefined"
        },
        group48: {
            title48: "string",
            members48: "user49[]",
            isActive48: "boolean|undefined"
        },
        group49: {
            title49: "string",
            members49: "user38[]",
            isActive49: "boolean|undefined"
        },
        group50: {
            title50: "string",
            members50: "user34[]",
            isActive50: "boolean|undefined"
        }
    })
})
    .median("258.67ms")
    .type.median("370.12ms")

bench("compile-cyclic(250)", () => {
    const space = compile({
        user: {
            name: "string",
            friends: "user[]?",
            groups: "group[]"
        },
        user2: {
            name2: "string",
            friends2: "user15[]?",
            groups2: "group2[]"
        },
        user3: {
            name3: "string",
            friends3: "user114[]?",
            groups3: "group104[]"
        },
        user4: {
            name4: "string",
            friends4: "user37[]?",
            groups4: "group105[]"
        },
        user5: {
            name5: "string",
            friends5: "user101[]?",
            groups5: "group78[]"
        },
        user6: {
            name6: "string",
            friends6: "user62[]?",
            groups6: "group33[]"
        },
        user7: {
            name7: "string",
            friends7: "user87[]?",
            groups7: "group57[]"
        },
        user8: {
            name8: "string",
            friends8: "user17[]?",
            groups8: "group16[]"
        },
        user9: {
            name9: "string",
            friends9: "user83[]?",
            groups9: "group10[]"
        },
        user10: {
            name10: "string",
            friends10: "user2[]?",
            groups10: "group97[]"
        },
        user11: {
            name11: "string",
            friends11: "user18[]?",
            groups11: "group23[]"
        },
        user12: {
            name12: "string",
            friends12: "user80[]?",
            groups12: "group22[]"
        },
        user13: {
            name13: "string",
            friends13: "user6[]?",
            groups13: "group102[]"
        },
        user14: {
            name14: "string",
            friends14: "user61[]?",
            groups14: "group86[]"
        },
        user15: {
            name15: "string",
            friends15: "user101[]?",
            groups15: "group76[]"
        },
        user16: {
            name16: "string",
            friends16: "user25[]?",
            groups16: "group50[]"
        },
        user17: {
            name17: "string",
            friends17: "user115[]?",
            groups17: "group53[]"
        },
        user18: {
            name18: "string",
            friends18: "user104[]?",
            groups18: "group20[]"
        },
        user19: {
            name19: "string",
            friends19: "user3[]?",
            groups19: "group35[]"
        },
        user20: {
            name20: "string",
            friends20: "user113[]?",
            groups20: "group17[]"
        },
        user21: {
            name21: "string",
            friends21: "user14[]?",
            groups21: "group10[]"
        },
        user22: {
            name22: "string",
            friends22: "user47[]?",
            groups22: "group4[]"
        },
        user23: {
            name23: "string",
            friends23: "user14[]?",
            groups23: "group99[]"
        },
        user24: {
            name24: "string",
            friends24: "user11[]?",
            groups24: "group102[]"
        },
        user25: {
            name25: "string",
            friends25: "user71[]?",
            groups25: "group68[]"
        },
        user26: {
            name26: "string",
            friends26: "user3[]?",
            groups26: "group85[]"
        },
        user27: {
            name27: "string",
            friends27: "user88[]?",
            groups27: "group59[]"
        },
        user28: {
            name28: "string",
            friends28: "user102[]?",
            groups28: "group82[]"
        },
        user29: {
            name29: "string",
            friends29: "user39[]?",
            groups29: "group6[]"
        },
        user30: {
            name30: "string",
            friends30: "user61[]?",
            groups30: "group21[]"
        },
        user31: {
            name31: "string",
            friends31: "user90[]?",
            groups31: "group75[]"
        },
        user32: {
            name32: "string",
            friends32: "user106[]?",
            groups32: "group107[]"
        },
        user33: {
            name33: "string",
            friends33: "user105[]?",
            groups33: "group63[]"
        },
        user34: {
            name34: "string",
            friends34: "user85[]?",
            groups34: "group97[]"
        },
        user35: {
            name35: "string",
            friends35: "user8[]?",
            groups35: "group80[]"
        },
        user36: {
            name36: "string",
            friends36: "user71[]?",
            groups36: "group4[]"
        },
        user37: {
            name37: "string",
            friends37: "user121[]?",
            groups37: "group8[]"
        },
        user38: {
            name38: "string",
            friends38: "user122[]?",
            groups38: "group49[]"
        },
        user39: {
            name39: "string",
            friends39: "user89[]?",
            groups39: "group57[]"
        },
        user40: {
            name40: "string",
            friends40: "user49[]?",
            groups40: "group52[]"
        },
        user41: {
            name41: "string",
            friends41: "user58[]?",
            groups41: "group38[]"
        },
        user42: {
            name42: "string",
            friends42: "user56[]?",
            groups42: "group3[]"
        },
        user43: {
            name43: "string",
            friends43: "user28[]?",
            groups43: "group47[]"
        },
        user44: {
            name44: "string",
            friends44: "user71[]?",
            groups44: "group122[]"
        },
        user45: {
            name45: "string",
            friends45: "user106[]?",
            groups45: "group122[]"
        },
        user46: {
            name46: "string",
            friends46: "user72[]?",
            groups46: "group59[]"
        },
        user47: {
            name47: "string",
            friends47: "user4[]?",
            groups47: "group2[]"
        },
        user48: {
            name48: "string",
            friends48: "user76[]?",
            groups48: "group65[]"
        },
        user49: {
            name49: "string",
            friends49: "user102[]?",
            groups49: "group65[]"
        },
        user50: {
            name50: "string",
            friends50: "user16[]?",
            groups50: "group55[]"
        },
        user51: {
            name51: "string",
            friends51: "user40[]?",
            groups51: "group63[]"
        },
        user52: {
            name52: "string",
            friends52: "user66[]?",
            groups52: "group63[]"
        },
        user53: {
            name53: "string",
            friends53: "user125[]?",
            groups53: "group104[]"
        },
        user54: {
            name54: "string",
            friends54: "user53[]?",
            groups54: "group50[]"
        },
        user55: {
            name55: "string",
            friends55: "user7[]?",
            groups55: "group121[]"
        },
        user56: {
            name56: "string",
            friends56: "user20[]?",
            groups56: "group2[]"
        },
        user57: {
            name57: "string",
            friends57: "user13[]?",
            groups57: "group22[]"
        },
        user58: {
            name58: "string",
            friends58: "user25[]?",
            groups58: "group95[]"
        },
        user59: {
            name59: "string",
            friends59: "user124[]?",
            groups59: "group84[]"
        },
        user60: {
            name60: "string",
            friends60: "user66[]?",
            groups60: "group55[]"
        },
        user61: {
            name61: "string",
            friends61: "user64[]?",
            groups61: "group65[]"
        },
        user62: {
            name62: "string",
            friends62: "user54[]?",
            groups62: "group70[]"
        },
        user63: {
            name63: "string",
            friends63: "user39[]?",
            groups63: "group30[]"
        },
        user64: {
            name64: "string",
            friends64: "user43[]?",
            groups64: "group24[]"
        },
        user65: {
            name65: "string",
            friends65: "user97[]?",
            groups65: "group120[]"
        },
        user66: {
            name66: "string",
            friends66: "user51[]?",
            groups66: "group41[]"
        },
        user67: {
            name67: "string",
            friends67: "user81[]?",
            groups67: "group77[]"
        },
        user68: {
            name68: "string",
            friends68: "user9[]?",
            groups68: "group53[]"
        },
        user69: {
            name69: "string",
            friends69: "user17[]?",
            groups69: "group62[]"
        },
        user70: {
            name70: "string",
            friends70: "user121[]?",
            groups70: "group47[]"
        },
        user71: {
            name71: "string",
            friends71: "user70[]?",
            groups71: "group33[]"
        },
        user72: {
            name72: "string",
            friends72: "user49[]?",
            groups72: "group14[]"
        },
        user73: {
            name73: "string",
            friends73: "user91[]?",
            groups73: "group74[]"
        },
        user74: {
            name74: "string",
            friends74: "user97[]?",
            groups74: "group25[]"
        },
        user75: {
            name75: "string",
            friends75: "user99[]?",
            groups75: "group95[]"
        },
        user76: {
            name76: "string",
            friends76: "user59[]?",
            groups76: "group104[]"
        },
        user77: {
            name77: "string",
            friends77: "user76[]?",
            groups77: "group74[]"
        },
        user78: {
            name78: "string",
            friends78: "user82[]?",
            groups78: "group97[]"
        },
        user79: {
            name79: "string",
            friends79: "user34[]?",
            groups79: "group124[]"
        },
        user80: {
            name80: "string",
            friends80: "user99[]?",
            groups80: "group111[]"
        },
        user81: {
            name81: "string",
            friends81: "user100[]?",
            groups81: "group35[]"
        },
        user82: {
            name82: "string",
            friends82: "user70[]?",
            groups82: "group94[]"
        },
        user83: {
            name83: "string",
            friends83: "user12[]?",
            groups83: "group6[]"
        },
        user84: {
            name84: "string",
            friends84: "user52[]?",
            groups84: "group71[]"
        },
        user85: {
            name85: "string",
            friends85: "user72[]?",
            groups85: "group86[]"
        },
        user86: {
            name86: "string",
            friends86: "user83[]?",
            groups86: "group105[]"
        },
        user87: {
            name87: "string",
            friends87: "user2[]?",
            groups87: "group106[]"
        },
        user88: {
            name88: "string",
            friends88: "user117[]?",
            groups88: "group21[]"
        },
        user89: {
            name89: "string",
            friends89: "user43[]?",
            groups89: "group65[]"
        },
        user90: {
            name90: "string",
            friends90: "user103[]?",
            groups90: "group88[]"
        },
        user91: {
            name91: "string",
            friends91: "user2[]?",
            groups91: "group125[]"
        },
        user92: {
            name92: "string",
            friends92: "user65[]?",
            groups92: "group83[]"
        },
        user93: {
            name93: "string",
            friends93: "user33[]?",
            groups93: "group75[]"
        },
        user94: {
            name94: "string",
            friends94: "user65[]?",
            groups94: "group18[]"
        },
        user95: {
            name95: "string",
            friends95: "user38[]?",
            groups95: "group93[]"
        },
        user96: {
            name96: "string",
            friends96: "user50[]?",
            groups96: "group56[]"
        },
        user97: {
            name97: "string",
            friends97: "user118[]?",
            groups97: "group108[]"
        },
        user98: {
            name98: "string",
            friends98: "user70[]?",
            groups98: "group84[]"
        },
        user99: {
            name99: "string",
            friends99: "user2[]?",
            groups99: "group30[]"
        },
        user100: {
            name100: "string",
            friends100: "user15[]?",
            groups100: "group85[]"
        },
        user101: {
            name101: "string",
            friends101: "user118[]?",
            groups101: "group40[]"
        },
        user102: {
            name102: "string",
            friends102: "user78[]?",
            groups102: "group22[]"
        },
        user103: {
            name103: "string",
            friends103: "user41[]?",
            groups103: "group6[]"
        },
        user104: {
            name104: "string",
            friends104: "user24[]?",
            groups104: "group27[]"
        },
        user105: {
            name105: "string",
            friends105: "user100[]?",
            groups105: "group81[]"
        },
        user106: {
            name106: "string",
            friends106: "user87[]?",
            groups106: "group83[]"
        },
        user107: {
            name107: "string",
            friends107: "user9[]?",
            groups107: "group69[]"
        },
        user108: {
            name108: "string",
            friends108: "user56[]?",
            groups108: "group13[]"
        },
        user109: {
            name109: "string",
            friends109: "user50[]?",
            groups109: "group114[]"
        },
        user110: {
            name110: "string",
            friends110: "user17[]?",
            groups110: "group9[]"
        },
        user111: {
            name111: "string",
            friends111: "user69[]?",
            groups111: "group73[]"
        },
        user112: {
            name112: "string",
            friends112: "user108[]?",
            groups112: "group54[]"
        },
        user113: {
            name113: "string",
            friends113: "user112[]?",
            groups113: "group108[]"
        },
        user114: {
            name114: "string",
            friends114: "user60[]?",
            groups114: "group57[]"
        },
        user115: {
            name115: "string",
            friends115: "user106[]?",
            groups115: "group124[]"
        },
        user116: {
            name116: "string",
            friends116: "user96[]?",
            groups116: "group111[]"
        },
        user117: {
            name117: "string",
            friends117: "user2[]?",
            groups117: "group32[]"
        },
        user118: {
            name118: "string",
            friends118: "user12[]?",
            groups118: "group102[]"
        },
        user119: {
            name119: "string",
            friends119: "user16[]?",
            groups119: "group17[]"
        },
        user120: {
            name120: "string",
            friends120: "user60[]?",
            groups120: "group21[]"
        },
        user121: {
            name121: "string",
            friends121: "user76[]?",
            groups121: "group108[]"
        },
        user122: {
            name122: "string",
            friends122: "user83[]?",
            groups122: "group104[]"
        },
        user123: {
            name123: "string",
            friends123: "user36[]?",
            groups123: "group113[]"
        },
        user124: {
            name124: "string",
            friends124: "user48[]?",
            groups124: "group119[]"
        },
        user125: {
            name125: "string",
            friends125: "user67[]?",
            groups125: "group95[]"
        },
        group: {
            title: "string",
            members: "user[]",
            isActive: "boolean|undefined"
        },
        group2: {
            title2: "string",
            members2: "user49[]",
            isActive2: "boolean|undefined"
        },
        group3: {
            title3: "string",
            members3: "user100[]",
            isActive3: "boolean|undefined"
        },
        group4: {
            title4: "string",
            members4: "user83[]",
            isActive4: "boolean|undefined"
        },
        group5: {
            title5: "string",
            members5: "user12[]",
            isActive5: "boolean|undefined"
        },
        group6: {
            title6: "string",
            members6: "user46[]",
            isActive6: "boolean|undefined"
        },
        group7: {
            title7: "string",
            members7: "user52[]",
            isActive7: "boolean|undefined"
        },
        group8: {
            title8: "string",
            members8: "user49[]",
            isActive8: "boolean|undefined"
        },
        group9: {
            title9: "string",
            members9: "user38[]",
            isActive9: "boolean|undefined"
        },
        group10: {
            title10: "string",
            members10: "user47[]",
            isActive10: "boolean|undefined"
        },
        group11: {
            title11: "string",
            members11: "user89[]",
            isActive11: "boolean|undefined"
        },
        group12: {
            title12: "string",
            members12: "user70[]",
            isActive12: "boolean|undefined"
        },
        group13: {
            title13: "string",
            members13: "user81[]",
            isActive13: "boolean|undefined"
        },
        group14: {
            title14: "string",
            members14: "user48[]",
            isActive14: "boolean|undefined"
        },
        group15: {
            title15: "string",
            members15: "user49[]",
            isActive15: "boolean|undefined"
        },
        group16: {
            title16: "string",
            members16: "user9[]",
            isActive16: "boolean|undefined"
        },
        group17: {
            title17: "string",
            members17: "user108[]",
            isActive17: "boolean|undefined"
        },
        group18: {
            title18: "string",
            members18: "user118[]",
            isActive18: "boolean|undefined"
        },
        group19: {
            title19: "string",
            members19: "user64[]",
            isActive19: "boolean|undefined"
        },
        group20: {
            title20: "string",
            members20: "user65[]",
            isActive20: "boolean|undefined"
        },
        group21: {
            title21: "string",
            members21: "user29[]",
            isActive21: "boolean|undefined"
        },
        group22: {
            title22: "string",
            members22: "user45[]",
            isActive22: "boolean|undefined"
        },
        group23: {
            title23: "string",
            members23: "user97[]",
            isActive23: "boolean|undefined"
        },
        group24: {
            title24: "string",
            members24: "user83[]",
            isActive24: "boolean|undefined"
        },
        group25: {
            title25: "string",
            members25: "user17[]",
            isActive25: "boolean|undefined"
        },
        group26: {
            title26: "string",
            members26: "user17[]",
            isActive26: "boolean|undefined"
        },
        group27: {
            title27: "string",
            members27: "user48[]",
            isActive27: "boolean|undefined"
        },
        group28: {
            title28: "string",
            members28: "user11[]",
            isActive28: "boolean|undefined"
        },
        group29: {
            title29: "string",
            members29: "user120[]",
            isActive29: "boolean|undefined"
        },
        group30: {
            title30: "string",
            members30: "user50[]",
            isActive30: "boolean|undefined"
        },
        group31: {
            title31: "string",
            members31: "user82[]",
            isActive31: "boolean|undefined"
        },
        group32: {
            title32: "string",
            members32: "user96[]",
            isActive32: "boolean|undefined"
        },
        group33: {
            title33: "string",
            members33: "user70[]",
            isActive33: "boolean|undefined"
        },
        group34: {
            title34: "string",
            members34: "user24[]",
            isActive34: "boolean|undefined"
        },
        group35: {
            title35: "string",
            members35: "user98[]",
            isActive35: "boolean|undefined"
        },
        group36: {
            title36: "string",
            members36: "user58[]",
            isActive36: "boolean|undefined"
        },
        group37: {
            title37: "string",
            members37: "user79[]",
            isActive37: "boolean|undefined"
        },
        group38: {
            title38: "string",
            members38: "user30[]",
            isActive38: "boolean|undefined"
        },
        group39: {
            title39: "string",
            members39: "user15[]",
            isActive39: "boolean|undefined"
        },
        group40: {
            title40: "string",
            members40: "user89[]",
            isActive40: "boolean|undefined"
        },
        group41: {
            title41: "string",
            members41: "user52[]",
            isActive41: "boolean|undefined"
        },
        group42: {
            title42: "string",
            members42: "user39[]",
            isActive42: "boolean|undefined"
        },
        group43: {
            title43: "string",
            members43: "user98[]",
            isActive43: "boolean|undefined"
        },
        group44: {
            title44: "string",
            members44: "user82[]",
            isActive44: "boolean|undefined"
        },
        group45: {
            title45: "string",
            members45: "user32[]",
            isActive45: "boolean|undefined"
        },
        group46: {
            title46: "string",
            members46: "user99[]",
            isActive46: "boolean|undefined"
        },
        group47: {
            title47: "string",
            members47: "user15[]",
            isActive47: "boolean|undefined"
        },
        group48: {
            title48: "string",
            members48: "user52[]",
            isActive48: "boolean|undefined"
        },
        group49: {
            title49: "string",
            members49: "user91[]",
            isActive49: "boolean|undefined"
        },
        group50: {
            title50: "string",
            members50: "user54[]",
            isActive50: "boolean|undefined"
        },
        group51: {
            title51: "string",
            members51: "user10[]",
            isActive51: "boolean|undefined"
        },
        group52: {
            title52: "string",
            members52: "user5[]",
            isActive52: "boolean|undefined"
        },
        group53: {
            title53: "string",
            members53: "user36[]",
            isActive53: "boolean|undefined"
        },
        group54: {
            title54: "string",
            members54: "user114[]",
            isActive54: "boolean|undefined"
        },
        group55: {
            title55: "string",
            members55: "user42[]",
            isActive55: "boolean|undefined"
        },
        group56: {
            title56: "string",
            members56: "user107[]",
            isActive56: "boolean|undefined"
        },
        group57: {
            title57: "string",
            members57: "user105[]",
            isActive57: "boolean|undefined"
        },
        group58: {
            title58: "string",
            members58: "user14[]",
            isActive58: "boolean|undefined"
        },
        group59: {
            title59: "string",
            members59: "user119[]",
            isActive59: "boolean|undefined"
        },
        group60: {
            title60: "string",
            members60: "user66[]",
            isActive60: "boolean|undefined"
        },
        group61: {
            title61: "string",
            members61: "user91[]",
            isActive61: "boolean|undefined"
        },
        group62: {
            title62: "string",
            members62: "user107[]",
            isActive62: "boolean|undefined"
        },
        group63: {
            title63: "string",
            members63: "user32[]",
            isActive63: "boolean|undefined"
        },
        group64: {
            title64: "string",
            members64: "user101[]",
            isActive64: "boolean|undefined"
        },
        group65: {
            title65: "string",
            members65: "user28[]",
            isActive65: "boolean|undefined"
        },
        group66: {
            title66: "string",
            members66: "user43[]",
            isActive66: "boolean|undefined"
        },
        group67: {
            title67: "string",
            members67: "user6[]",
            isActive67: "boolean|undefined"
        },
        group68: {
            title68: "string",
            members68: "user48[]",
            isActive68: "boolean|undefined"
        },
        group69: {
            title69: "string",
            members69: "user74[]",
            isActive69: "boolean|undefined"
        },
        group70: {
            title70: "string",
            members70: "user17[]",
            isActive70: "boolean|undefined"
        },
        group71: {
            title71: "string",
            members71: "user7[]",
            isActive71: "boolean|undefined"
        },
        group72: {
            title72: "string",
            members72: "user93[]",
            isActive72: "boolean|undefined"
        },
        group73: {
            title73: "string",
            members73: "user38[]",
            isActive73: "boolean|undefined"
        },
        group74: {
            title74: "string",
            members74: "user12[]",
            isActive74: "boolean|undefined"
        },
        group75: {
            title75: "string",
            members75: "user121[]",
            isActive75: "boolean|undefined"
        },
        group76: {
            title76: "string",
            members76: "user103[]",
            isActive76: "boolean|undefined"
        },
        group77: {
            title77: "string",
            members77: "user90[]",
            isActive77: "boolean|undefined"
        },
        group78: {
            title78: "string",
            members78: "user104[]",
            isActive78: "boolean|undefined"
        },
        group79: {
            title79: "string",
            members79: "user81[]",
            isActive79: "boolean|undefined"
        },
        group80: {
            title80: "string",
            members80: "user9[]",
            isActive80: "boolean|undefined"
        },
        group81: {
            title81: "string",
            members81: "user94[]",
            isActive81: "boolean|undefined"
        },
        group82: {
            title82: "string",
            members82: "user26[]",
            isActive82: "boolean|undefined"
        },
        group83: {
            title83: "string",
            members83: "user23[]",
            isActive83: "boolean|undefined"
        },
        group84: {
            title84: "string",
            members84: "user21[]",
            isActive84: "boolean|undefined"
        },
        group85: {
            title85: "string",
            members85: "user47[]",
            isActive85: "boolean|undefined"
        },
        group86: {
            title86: "string",
            members86: "user49[]",
            isActive86: "boolean|undefined"
        },
        group87: {
            title87: "string",
            members87: "user92[]",
            isActive87: "boolean|undefined"
        },
        group88: {
            title88: "string",
            members88: "user101[]",
            isActive88: "boolean|undefined"
        },
        group89: {
            title89: "string",
            members89: "user122[]",
            isActive89: "boolean|undefined"
        },
        group90: {
            title90: "string",
            members90: "user120[]",
            isActive90: "boolean|undefined"
        },
        group91: {
            title91: "string",
            members91: "user104[]",
            isActive91: "boolean|undefined"
        },
        group92: {
            title92: "string",
            members92: "user5[]",
            isActive92: "boolean|undefined"
        },
        group93: {
            title93: "string",
            members93: "user70[]",
            isActive93: "boolean|undefined"
        },
        group94: {
            title94: "string",
            members94: "user53[]",
            isActive94: "boolean|undefined"
        },
        group95: {
            title95: "string",
            members95: "user94[]",
            isActive95: "boolean|undefined"
        },
        group96: {
            title96: "string",
            members96: "user16[]",
            isActive96: "boolean|undefined"
        },
        group97: {
            title97: "string",
            members97: "user11[]",
            isActive97: "boolean|undefined"
        },
        group98: {
            title98: "string",
            members98: "user73[]",
            isActive98: "boolean|undefined"
        },
        group99: {
            title99: "string",
            members99: "user60[]",
            isActive99: "boolean|undefined"
        },
        group100: {
            title100: "string",
            members100: "user60[]",
            isActive100: "boolean|undefined"
        },
        group101: {
            title101: "string",
            members101: "user34[]",
            isActive101: "boolean|undefined"
        },
        group102: {
            title102: "string",
            members102: "user32[]",
            isActive102: "boolean|undefined"
        },
        group103: {
            title103: "string",
            members103: "user125[]",
            isActive103: "boolean|undefined"
        },
        group104: {
            title104: "string",
            members104: "user124[]",
            isActive104: "boolean|undefined"
        },
        group105: {
            title105: "string",
            members105: "user118[]",
            isActive105: "boolean|undefined"
        },
        group106: {
            title106: "string",
            members106: "user120[]",
            isActive106: "boolean|undefined"
        },
        group107: {
            title107: "string",
            members107: "user64[]",
            isActive107: "boolean|undefined"
        },
        group108: {
            title108: "string",
            members108: "user92[]",
            isActive108: "boolean|undefined"
        },
        group109: {
            title109: "string",
            members109: "user56[]",
            isActive109: "boolean|undefined"
        },
        group110: {
            title110: "string",
            members110: "user63[]",
            isActive110: "boolean|undefined"
        },
        group111: {
            title111: "string",
            members111: "user38[]",
            isActive111: "boolean|undefined"
        },
        group112: {
            title112: "string",
            members112: "user7[]",
            isActive112: "boolean|undefined"
        },
        group113: {
            title113: "string",
            members113: "user82[]",
            isActive113: "boolean|undefined"
        },
        group114: {
            title114: "string",
            members114: "user69[]",
            isActive114: "boolean|undefined"
        },
        group115: {
            title115: "string",
            members115: "user45[]",
            isActive115: "boolean|undefined"
        },
        group116: {
            title116: "string",
            members116: "user12[]",
            isActive116: "boolean|undefined"
        },
        group117: {
            title117: "string",
            members117: "user35[]",
            isActive117: "boolean|undefined"
        },
        group118: {
            title118: "string",
            members118: "user77[]",
            isActive118: "boolean|undefined"
        },
        group119: {
            title119: "string",
            members119: "user101[]",
            isActive119: "boolean|undefined"
        },
        group120: {
            title120: "string",
            members120: "user30[]",
            isActive120: "boolean|undefined"
        },
        group121: {
            title121: "string",
            members121: "user56[]",
            isActive121: "boolean|undefined"
        },
        group122: {
            title122: "string",
            members122: "user31[]",
            isActive122: "boolean|undefined"
        },
        group123: {
            title123: "string",
            members123: "user109[]",
            isActive123: "boolean|undefined"
        },
        group124: {
            title124: "string",
            members124: "user64[]",
            isActive124: "boolean|undefined"
        },
        group125: {
            title125: "string",
            members125: "user26[]",
            isActive125: "boolean|undefined"
        }
    })
})
    .median("15.90s")
    .type.median("787.67ms")

bench("compile-cyclic(500)", () => {
    const space = compile({
        user: {
            name: "string",
            friends: "user[]?",
            groups: "group[]"
        },
        user2: {
            name2: "string",
            friends2: "user28[]?",
            groups2: "group148[]"
        },
        user3: {
            name3: "string",
            friends3: "user50[]?",
            groups3: "group47[]"
        },
        user4: {
            name4: "string",
            friends4: "user140[]?",
            groups4: "group206[]"
        },
        user5: {
            name5: "string",
            friends5: "user243[]?",
            groups5: "group129[]"
        },
        user6: {
            name6: "string",
            friends6: "user3[]?",
            groups6: "group132[]"
        },
        user7: {
            name7: "string",
            friends7: "user206[]?",
            groups7: "group53[]"
        },
        user8: {
            name8: "string",
            friends8: "user47[]?",
            groups8: "group119[]"
        },
        user9: {
            name9: "string",
            friends9: "user154[]?",
            groups9: "group22[]"
        },
        user10: {
            name10: "string",
            friends10: "user215[]?",
            groups10: "group81[]"
        },
        user11: {
            name11: "string",
            friends11: "user93[]?",
            groups11: "group92[]"
        },
        user12: {
            name12: "string",
            friends12: "user152[]?",
            groups12: "group221[]"
        },
        user13: {
            name13: "string",
            friends13: "user204[]?",
            groups13: "group222[]"
        },
        user14: {
            name14: "string",
            friends14: "user115[]?",
            groups14: "group119[]"
        },
        user15: {
            name15: "string",
            friends15: "user229[]?",
            groups15: "group8[]"
        },
        user16: {
            name16: "string",
            friends16: "user86[]?",
            groups16: "group48[]"
        },
        user17: {
            name17: "string",
            friends17: "user95[]?",
            groups17: "group118[]"
        },
        user18: {
            name18: "string",
            friends18: "user117[]?",
            groups18: "group22[]"
        },
        user19: {
            name19: "string",
            friends19: "user28[]?",
            groups19: "group154[]"
        },
        user20: {
            name20: "string",
            friends20: "user223[]?",
            groups20: "group143[]"
        },
        user21: {
            name21: "string",
            friends21: "user12[]?",
            groups21: "group121[]"
        },
        user22: {
            name22: "string",
            friends22: "user96[]?",
            groups22: "group47[]"
        },
        user23: {
            name23: "string",
            friends23: "user110[]?",
            groups23: "group36[]"
        },
        user24: {
            name24: "string",
            friends24: "user233[]?",
            groups24: "group153[]"
        },
        user25: {
            name25: "string",
            friends25: "user101[]?",
            groups25: "group193[]"
        },
        user26: {
            name26: "string",
            friends26: "user36[]?",
            groups26: "group152[]"
        },
        user27: {
            name27: "string",
            friends27: "user173[]?",
            groups27: "group114[]"
        },
        user28: {
            name28: "string",
            friends28: "user122[]?",
            groups28: "group104[]"
        },
        user29: {
            name29: "string",
            friends29: "user99[]?",
            groups29: "group145[]"
        },
        user30: {
            name30: "string",
            friends30: "user56[]?",
            groups30: "group175[]"
        },
        user31: {
            name31: "string",
            friends31: "user217[]?",
            groups31: "group155[]"
        },
        user32: {
            name32: "string",
            friends32: "user146[]?",
            groups32: "group65[]"
        },
        user33: {
            name33: "string",
            friends33: "user178[]?",
            groups33: "group165[]"
        },
        user34: {
            name34: "string",
            friends34: "user245[]?",
            groups34: "group7[]"
        },
        user35: {
            name35: "string",
            friends35: "user61[]?",
            groups35: "group53[]"
        },
        user36: {
            name36: "string",
            friends36: "user100[]?",
            groups36: "group62[]"
        },
        user37: {
            name37: "string",
            friends37: "user138[]?",
            groups37: "group232[]"
        },
        user38: {
            name38: "string",
            friends38: "user30[]?",
            groups38: "group8[]"
        },
        user39: {
            name39: "string",
            friends39: "user151[]?",
            groups39: "group248[]"
        },
        user40: {
            name40: "string",
            friends40: "user85[]?",
            groups40: "group167[]"
        },
        user41: {
            name41: "string",
            friends41: "user80[]?",
            groups41: "group146[]"
        },
        user42: {
            name42: "string",
            friends42: "user59[]?",
            groups42: "group232[]"
        },
        user43: {
            name43: "string",
            friends43: "user246[]?",
            groups43: "group176[]"
        },
        user44: {
            name44: "string",
            friends44: "user15[]?",
            groups44: "group228[]"
        },
        user45: {
            name45: "string",
            friends45: "user125[]?",
            groups45: "group119[]"
        },
        user46: {
            name46: "string",
            friends46: "user91[]?",
            groups46: "group207[]"
        },
        user47: {
            name47: "string",
            friends47: "user164[]?",
            groups47: "group201[]"
        },
        user48: {
            name48: "string",
            friends48: "user108[]?",
            groups48: "group120[]"
        },
        user49: {
            name49: "string",
            friends49: "user242[]?",
            groups49: "group137[]"
        },
        user50: {
            name50: "string",
            friends50: "user36[]?",
            groups50: "group123[]"
        },
        user51: {
            name51: "string",
            friends51: "user119[]?",
            groups51: "group39[]"
        },
        user52: {
            name52: "string",
            friends52: "user21[]?",
            groups52: "group128[]"
        },
        user53: {
            name53: "string",
            friends53: "user64[]?",
            groups53: "group143[]"
        },
        user54: {
            name54: "string",
            friends54: "user130[]?",
            groups54: "group124[]"
        },
        user55: {
            name55: "string",
            friends55: "user148[]?",
            groups55: "group52[]"
        },
        user56: {
            name56: "string",
            friends56: "user115[]?",
            groups56: "group121[]"
        },
        user57: {
            name57: "string",
            friends57: "user146[]?",
            groups57: "group74[]"
        },
        user58: {
            name58: "string",
            friends58: "user100[]?",
            groups58: "group126[]"
        },
        user59: {
            name59: "string",
            friends59: "user82[]?",
            groups59: "group212[]"
        },
        user60: {
            name60: "string",
            friends60: "user2[]?",
            groups60: "group140[]"
        },
        user61: {
            name61: "string",
            friends61: "user97[]?",
            groups61: "group71[]"
        },
        user62: {
            name62: "string",
            friends62: "user22[]?",
            groups62: "group77[]"
        },
        user63: {
            name63: "string",
            friends63: "user157[]?",
            groups63: "group81[]"
        },
        user64: {
            name64: "string",
            friends64: "user182[]?",
            groups64: "group195[]"
        },
        user65: {
            name65: "string",
            friends65: "user50[]?",
            groups65: "group230[]"
        },
        user66: {
            name66: "string",
            friends66: "user219[]?",
            groups66: "group7[]"
        },
        user67: {
            name67: "string",
            friends67: "user223[]?",
            groups67: "group236[]"
        },
        user68: {
            name68: "string",
            friends68: "user118[]?",
            groups68: "group74[]"
        },
        user69: {
            name69: "string",
            friends69: "user145[]?",
            groups69: "group229[]"
        },
        user70: {
            name70: "string",
            friends70: "user49[]?",
            groups70: "group138[]"
        },
        user71: {
            name71: "string",
            friends71: "user248[]?",
            groups71: "group57[]"
        },
        user72: {
            name72: "string",
            friends72: "user121[]?",
            groups72: "group108[]"
        },
        user73: {
            name73: "string",
            friends73: "user73[]?",
            groups73: "group19[]"
        },
        user74: {
            name74: "string",
            friends74: "user173[]?",
            groups74: "group121[]"
        },
        user75: {
            name75: "string",
            friends75: "user109[]?",
            groups75: "group244[]"
        },
        user76: {
            name76: "string",
            friends76: "user134[]?",
            groups76: "group13[]"
        },
        user77: {
            name77: "string",
            friends77: "user28[]?",
            groups77: "group135[]"
        },
        user78: {
            name78: "string",
            friends78: "user4[]?",
            groups78: "group127[]"
        },
        user79: {
            name79: "string",
            friends79: "user86[]?",
            groups79: "group108[]"
        },
        user80: {
            name80: "string",
            friends80: "user53[]?",
            groups80: "group25[]"
        },
        user81: {
            name81: "string",
            friends81: "user168[]?",
            groups81: "group101[]"
        },
        user82: {
            name82: "string",
            friends82: "user190[]?",
            groups82: "group156[]"
        },
        user83: {
            name83: "string",
            friends83: "user113[]?",
            groups83: "group197[]"
        },
        user84: {
            name84: "string",
            friends84: "user238[]?",
            groups84: "group191[]"
        },
        user85: {
            name85: "string",
            friends85: "user187[]?",
            groups85: "group113[]"
        },
        user86: {
            name86: "string",
            friends86: "user224[]?",
            groups86: "group223[]"
        },
        user87: {
            name87: "string",
            friends87: "user221[]?",
            groups87: "group233[]"
        },
        user88: {
            name88: "string",
            friends88: "user19[]?",
            groups88: "group78[]"
        },
        user89: {
            name89: "string",
            friends89: "user85[]?",
            groups89: "group106[]"
        },
        user90: {
            name90: "string",
            friends90: "user229[]?",
            groups90: "group163[]"
        },
        user91: {
            name91: "string",
            friends91: "user101[]?",
            groups91: "group98[]"
        },
        user92: {
            name92: "string",
            friends92: "user90[]?",
            groups92: "group218[]"
        },
        user93: {
            name93: "string",
            friends93: "user195[]?",
            groups93: "group226[]"
        },
        user94: {
            name94: "string",
            friends94: "user237[]?",
            groups94: "group21[]"
        },
        user95: {
            name95: "string",
            friends95: "user13[]?",
            groups95: "group47[]"
        },
        user96: {
            name96: "string",
            friends96: "user183[]?",
            groups96: "group219[]"
        },
        user97: {
            name97: "string",
            friends97: "user134[]?",
            groups97: "group123[]"
        },
        user98: {
            name98: "string",
            friends98: "user231[]?",
            groups98: "group181[]"
        },
        user99: {
            name99: "string",
            friends99: "user110[]?",
            groups99: "group166[]"
        },
        user100: {
            name100: "string",
            friends100: "user109[]?",
            groups100: "group86[]"
        },
        user101: {
            name101: "string",
            friends101: "user183[]?",
            groups101: "group145[]"
        },
        user102: {
            name102: "string",
            friends102: "user228[]?",
            groups102: "group206[]"
        },
        user103: {
            name103: "string",
            friends103: "user124[]?",
            groups103: "group79[]"
        },
        user104: {
            name104: "string",
            friends104: "user71[]?",
            groups104: "group178[]"
        },
        user105: {
            name105: "string",
            friends105: "user143[]?",
            groups105: "group157[]"
        },
        user106: {
            name106: "string",
            friends106: "user233[]?",
            groups106: "group96[]"
        },
        user107: {
            name107: "string",
            friends107: "user42[]?",
            groups107: "group201[]"
        },
        user108: {
            name108: "string",
            friends108: "user65[]?",
            groups108: "group209[]"
        },
        user109: {
            name109: "string",
            friends109: "user78[]?",
            groups109: "group139[]"
        },
        user110: {
            name110: "string",
            friends110: "user237[]?",
            groups110: "group250[]"
        },
        user111: {
            name111: "string",
            friends111: "user66[]?",
            groups111: "group96[]"
        },
        user112: {
            name112: "string",
            friends112: "user133[]?",
            groups112: "group103[]"
        },
        user113: {
            name113: "string",
            friends113: "user110[]?",
            groups113: "group206[]"
        },
        user114: {
            name114: "string",
            friends114: "user109[]?",
            groups114: "group7[]"
        },
        user115: {
            name115: "string",
            friends115: "user82[]?",
            groups115: "group51[]"
        },
        user116: {
            name116: "string",
            friends116: "user241[]?",
            groups116: "group230[]"
        },
        user117: {
            name117: "string",
            friends117: "user36[]?",
            groups117: "group229[]"
        },
        user118: {
            name118: "string",
            friends118: "user154[]?",
            groups118: "group232[]"
        },
        user119: {
            name119: "string",
            friends119: "user158[]?",
            groups119: "group228[]"
        },
        user120: {
            name120: "string",
            friends120: "user104[]?",
            groups120: "group143[]"
        },
        user121: {
            name121: "string",
            friends121: "user61[]?",
            groups121: "group66[]"
        },
        user122: {
            name122: "string",
            friends122: "user181[]?",
            groups122: "group48[]"
        },
        user123: {
            name123: "string",
            friends123: "user10[]?",
            groups123: "group111[]"
        },
        user124: {
            name124: "string",
            friends124: "user119[]?",
            groups124: "group88[]"
        },
        user125: {
            name125: "string",
            friends125: "user126[]?",
            groups125: "group117[]"
        },
        user126: {
            name126: "string",
            friends126: "user133[]?",
            groups126: "group191[]"
        },
        user127: {
            name127: "string",
            friends127: "user118[]?",
            groups127: "group4[]"
        },
        user128: {
            name128: "string",
            friends128: "user198[]?",
            groups128: "group160[]"
        },
        user129: {
            name129: "string",
            friends129: "user35[]?",
            groups129: "group208[]"
        },
        user130: {
            name130: "string",
            friends130: "user140[]?",
            groups130: "group163[]"
        },
        user131: {
            name131: "string",
            friends131: "user16[]?",
            groups131: "group60[]"
        },
        user132: {
            name132: "string",
            friends132: "user26[]?",
            groups132: "group57[]"
        },
        user133: {
            name133: "string",
            friends133: "user31[]?",
            groups133: "group106[]"
        },
        user134: {
            name134: "string",
            friends134: "user155[]?",
            groups134: "group100[]"
        },
        user135: {
            name135: "string",
            friends135: "user167[]?",
            groups135: "group95[]"
        },
        user136: {
            name136: "string",
            friends136: "user32[]?",
            groups136: "group227[]"
        },
        user137: {
            name137: "string",
            friends137: "user222[]?",
            groups137: "group136[]"
        },
        user138: {
            name138: "string",
            friends138: "user163[]?",
            groups138: "group40[]"
        },
        user139: {
            name139: "string",
            friends139: "user231[]?",
            groups139: "group17[]"
        },
        user140: {
            name140: "string",
            friends140: "user48[]?",
            groups140: "group23[]"
        },
        user141: {
            name141: "string",
            friends141: "user224[]?",
            groups141: "group195[]"
        },
        user142: {
            name142: "string",
            friends142: "user222[]?",
            groups142: "group106[]"
        },
        user143: {
            name143: "string",
            friends143: "user57[]?",
            groups143: "group100[]"
        },
        user144: {
            name144: "string",
            friends144: "user179[]?",
            groups144: "group42[]"
        },
        user145: {
            name145: "string",
            friends145: "user181[]?",
            groups145: "group40[]"
        },
        user146: {
            name146: "string",
            friends146: "user237[]?",
            groups146: "group65[]"
        },
        user147: {
            name147: "string",
            friends147: "user242[]?",
            groups147: "group236[]"
        },
        user148: {
            name148: "string",
            friends148: "user74[]?",
            groups148: "group107[]"
        },
        user149: {
            name149: "string",
            friends149: "user19[]?",
            groups149: "group77[]"
        },
        user150: {
            name150: "string",
            friends150: "user231[]?",
            groups150: "group243[]"
        },
        user151: {
            name151: "string",
            friends151: "user242[]?",
            groups151: "group127[]"
        },
        user152: {
            name152: "string",
            friends152: "user100[]?",
            groups152: "group23[]"
        },
        user153: {
            name153: "string",
            friends153: "user21[]?",
            groups153: "group247[]"
        },
        user154: {
            name154: "string",
            friends154: "user218[]?",
            groups154: "group71[]"
        },
        user155: {
            name155: "string",
            friends155: "user49[]?",
            groups155: "group166[]"
        },
        user156: {
            name156: "string",
            friends156: "user85[]?",
            groups156: "group232[]"
        },
        user157: {
            name157: "string",
            friends157: "user214[]?",
            groups157: "group166[]"
        },
        user158: {
            name158: "string",
            friends158: "user34[]?",
            groups158: "group110[]"
        },
        user159: {
            name159: "string",
            friends159: "user36[]?",
            groups159: "group47[]"
        },
        user160: {
            name160: "string",
            friends160: "user148[]?",
            groups160: "group82[]"
        },
        user161: {
            name161: "string",
            friends161: "user8[]?",
            groups161: "group2[]"
        },
        user162: {
            name162: "string",
            friends162: "user184[]?",
            groups162: "group233[]"
        },
        user163: {
            name163: "string",
            friends163: "user197[]?",
            groups163: "group160[]"
        },
        user164: {
            name164: "string",
            friends164: "user74[]?",
            groups164: "group11[]"
        },
        user165: {
            name165: "string",
            friends165: "user13[]?",
            groups165: "group158[]"
        },
        user166: {
            name166: "string",
            friends166: "user95[]?",
            groups166: "group152[]"
        },
        user167: {
            name167: "string",
            friends167: "user55[]?",
            groups167: "group31[]"
        },
        user168: {
            name168: "string",
            friends168: "user167[]?",
            groups168: "group181[]"
        },
        user169: {
            name169: "string",
            friends169: "user89[]?",
            groups169: "group223[]"
        },
        user170: {
            name170: "string",
            friends170: "user212[]?",
            groups170: "group103[]"
        },
        user171: {
            name171: "string",
            friends171: "user34[]?",
            groups171: "group39[]"
        },
        user172: {
            name172: "string",
            friends172: "user183[]?",
            groups172: "group233[]"
        },
        user173: {
            name173: "string",
            friends173: "user93[]?",
            groups173: "group102[]"
        },
        user174: {
            name174: "string",
            friends174: "user10[]?",
            groups174: "group21[]"
        },
        user175: {
            name175: "string",
            friends175: "user216[]?",
            groups175: "group140[]"
        },
        user176: {
            name176: "string",
            friends176: "user25[]?",
            groups176: "group100[]"
        },
        user177: {
            name177: "string",
            friends177: "user151[]?",
            groups177: "group206[]"
        },
        user178: {
            name178: "string",
            friends178: "user73[]?",
            groups178: "group187[]"
        },
        user179: {
            name179: "string",
            friends179: "user42[]?",
            groups179: "group35[]"
        },
        user180: {
            name180: "string",
            friends180: "user164[]?",
            groups180: "group175[]"
        },
        user181: {
            name181: "string",
            friends181: "user28[]?",
            groups181: "group223[]"
        },
        user182: {
            name182: "string",
            friends182: "user157[]?",
            groups182: "group4[]"
        },
        user183: {
            name183: "string",
            friends183: "user45[]?",
            groups183: "group36[]"
        },
        user184: {
            name184: "string",
            friends184: "user85[]?",
            groups184: "group238[]"
        },
        user185: {
            name185: "string",
            friends185: "user118[]?",
            groups185: "group144[]"
        },
        user186: {
            name186: "string",
            friends186: "user162[]?",
            groups186: "group125[]"
        },
        user187: {
            name187: "string",
            friends187: "user123[]?",
            groups187: "group39[]"
        },
        user188: {
            name188: "string",
            friends188: "user92[]?",
            groups188: "group198[]"
        },
        user189: {
            name189: "string",
            friends189: "user248[]?",
            groups189: "group116[]"
        },
        user190: {
            name190: "string",
            friends190: "user245[]?",
            groups190: "group81[]"
        },
        user191: {
            name191: "string",
            friends191: "user195[]?",
            groups191: "group206[]"
        },
        user192: {
            name192: "string",
            friends192: "user21[]?",
            groups192: "group152[]"
        },
        user193: {
            name193: "string",
            friends193: "user31[]?",
            groups193: "group215[]"
        },
        user194: {
            name194: "string",
            friends194: "user36[]?",
            groups194: "group237[]"
        },
        user195: {
            name195: "string",
            friends195: "user23[]?",
            groups195: "group64[]"
        },
        user196: {
            name196: "string",
            friends196: "user52[]?",
            groups196: "group37[]"
        },
        user197: {
            name197: "string",
            friends197: "user136[]?",
            groups197: "group182[]"
        },
        user198: {
            name198: "string",
            friends198: "user207[]?",
            groups198: "group124[]"
        },
        user199: {
            name199: "string",
            friends199: "user223[]?",
            groups199: "group172[]"
        },
        user200: {
            name200: "string",
            friends200: "user26[]?",
            groups200: "group196[]"
        },
        user201: {
            name201: "string",
            friends201: "user97[]?",
            groups201: "group159[]"
        },
        user202: {
            name202: "string",
            friends202: "user173[]?",
            groups202: "group171[]"
        },
        user203: {
            name203: "string",
            friends203: "user186[]?",
            groups203: "group37[]"
        },
        user204: {
            name204: "string",
            friends204: "user38[]?",
            groups204: "group17[]"
        },
        user205: {
            name205: "string",
            friends205: "user179[]?",
            groups205: "group239[]"
        },
        user206: {
            name206: "string",
            friends206: "user151[]?",
            groups206: "group191[]"
        },
        user207: {
            name207: "string",
            friends207: "user23[]?",
            groups207: "group80[]"
        },
        user208: {
            name208: "string",
            friends208: "user139[]?",
            groups208: "group118[]"
        },
        user209: {
            name209: "string",
            friends209: "user154[]?",
            groups209: "group57[]"
        },
        user210: {
            name210: "string",
            friends210: "user179[]?",
            groups210: "group13[]"
        },
        user211: {
            name211: "string",
            friends211: "user51[]?",
            groups211: "group134[]"
        },
        user212: {
            name212: "string",
            friends212: "user33[]?",
            groups212: "group7[]"
        },
        user213: {
            name213: "string",
            friends213: "user136[]?",
            groups213: "group169[]"
        },
        user214: {
            name214: "string",
            friends214: "user41[]?",
            groups214: "group104[]"
        },
        user215: {
            name215: "string",
            friends215: "user58[]?",
            groups215: "group225[]"
        },
        user216: {
            name216: "string",
            friends216: "user102[]?",
            groups216: "group85[]"
        },
        user217: {
            name217: "string",
            friends217: "user235[]?",
            groups217: "group114[]"
        },
        user218: {
            name218: "string",
            friends218: "user76[]?",
            groups218: "group65[]"
        },
        user219: {
            name219: "string",
            friends219: "user182[]?",
            groups219: "group31[]"
        },
        user220: {
            name220: "string",
            friends220: "user199[]?",
            groups220: "group77[]"
        },
        user221: {
            name221: "string",
            friends221: "user107[]?",
            groups221: "group208[]"
        },
        user222: {
            name222: "string",
            friends222: "user180[]?",
            groups222: "group46[]"
        },
        user223: {
            name223: "string",
            friends223: "user30[]?",
            groups223: "group210[]"
        },
        user224: {
            name224: "string",
            friends224: "user7[]?",
            groups224: "group168[]"
        },
        user225: {
            name225: "string",
            friends225: "user192[]?",
            groups225: "group80[]"
        },
        user226: {
            name226: "string",
            friends226: "user40[]?",
            groups226: "group217[]"
        },
        user227: {
            name227: "string",
            friends227: "user190[]?",
            groups227: "group217[]"
        },
        user228: {
            name228: "string",
            friends228: "user210[]?",
            groups228: "group172[]"
        },
        user229: {
            name229: "string",
            friends229: "user185[]?",
            groups229: "group193[]"
        },
        user230: {
            name230: "string",
            friends230: "user234[]?",
            groups230: "group208[]"
        },
        user231: {
            name231: "string",
            friends231: "user182[]?",
            groups231: "group69[]"
        },
        user232: {
            name232: "string",
            friends232: "user151[]?",
            groups232: "group241[]"
        },
        user233: {
            name233: "string",
            friends233: "user149[]?",
            groups233: "group128[]"
        },
        user234: {
            name234: "string",
            friends234: "user2[]?",
            groups234: "group149[]"
        },
        user235: {
            name235: "string",
            friends235: "user150[]?",
            groups235: "group41[]"
        },
        user236: {
            name236: "string",
            friends236: "user18[]?",
            groups236: "group124[]"
        },
        user237: {
            name237: "string",
            friends237: "user114[]?",
            groups237: "group202[]"
        },
        user238: {
            name238: "string",
            friends238: "user220[]?",
            groups238: "group118[]"
        },
        user239: {
            name239: "string",
            friends239: "user108[]?",
            groups239: "group55[]"
        },
        user240: {
            name240: "string",
            friends240: "user223[]?",
            groups240: "group170[]"
        },
        user241: {
            name241: "string",
            friends241: "user200[]?",
            groups241: "group25[]"
        },
        user242: {
            name242: "string",
            friends242: "user36[]?",
            groups242: "group42[]"
        },
        user243: {
            name243: "string",
            friends243: "user236[]?",
            groups243: "group104[]"
        },
        user244: {
            name244: "string",
            friends244: "user36[]?",
            groups244: "group227[]"
        },
        user245: {
            name245: "string",
            friends245: "user120[]?",
            groups245: "group61[]"
        },
        user246: {
            name246: "string",
            friends246: "user148[]?",
            groups246: "group184[]"
        },
        user247: {
            name247: "string",
            friends247: "user235[]?",
            groups247: "group77[]"
        },
        user248: {
            name248: "string",
            friends248: "user224[]?",
            groups248: "group14[]"
        },
        user249: {
            name249: "string",
            friends249: "user15[]?",
            groups249: "group142[]"
        },
        user250: {
            name250: "string",
            friends250: "user110[]?",
            groups250: "group185[]"
        },
        group: {
            title: "string",
            members: "user[]",
            isActive: "boolean|undefined"
        },
        group2: {
            title2: "string",
            members2: "user47[]",
            isActive2: "boolean|undefined"
        },
        group3: {
            title3: "string",
            members3: "user102[]",
            isActive3: "boolean|undefined"
        },
        group4: {
            title4: "string",
            members4: "user139[]",
            isActive4: "boolean|undefined"
        },
        group5: {
            title5: "string",
            members5: "user141[]",
            isActive5: "boolean|undefined"
        },
        group6: {
            title6: "string",
            members6: "user191[]",
            isActive6: "boolean|undefined"
        },
        group7: {
            title7: "string",
            members7: "user25[]",
            isActive7: "boolean|undefined"
        },
        group8: {
            title8: "string",
            members8: "user19[]",
            isActive8: "boolean|undefined"
        },
        group9: {
            title9: "string",
            members9: "user4[]",
            isActive9: "boolean|undefined"
        },
        group10: {
            title10: "string",
            members10: "user90[]",
            isActive10: "boolean|undefined"
        },
        group11: {
            title11: "string",
            members11: "user175[]",
            isActive11: "boolean|undefined"
        },
        group12: {
            title12: "string",
            members12: "user57[]",
            isActive12: "boolean|undefined"
        },
        group13: {
            title13: "string",
            members13: "user60[]",
            isActive13: "boolean|undefined"
        },
        group14: {
            title14: "string",
            members14: "user47[]",
            isActive14: "boolean|undefined"
        },
        group15: {
            title15: "string",
            members15: "user195[]",
            isActive15: "boolean|undefined"
        },
        group16: {
            title16: "string",
            members16: "user83[]",
            isActive16: "boolean|undefined"
        },
        group17: {
            title17: "string",
            members17: "user235[]",
            isActive17: "boolean|undefined"
        },
        group18: {
            title18: "string",
            members18: "user58[]",
            isActive18: "boolean|undefined"
        },
        group19: {
            title19: "string",
            members19: "user238[]",
            isActive19: "boolean|undefined"
        },
        group20: {
            title20: "string",
            members20: "user186[]",
            isActive20: "boolean|undefined"
        },
        group21: {
            title21: "string",
            members21: "user205[]",
            isActive21: "boolean|undefined"
        },
        group22: {
            title22: "string",
            members22: "user202[]",
            isActive22: "boolean|undefined"
        },
        group23: {
            title23: "string",
            members23: "user166[]",
            isActive23: "boolean|undefined"
        },
        group24: {
            title24: "string",
            members24: "user23[]",
            isActive24: "boolean|undefined"
        },
        group25: {
            title25: "string",
            members25: "user158[]",
            isActive25: "boolean|undefined"
        },
        group26: {
            title26: "string",
            members26: "user189[]",
            isActive26: "boolean|undefined"
        },
        group27: {
            title27: "string",
            members27: "user135[]",
            isActive27: "boolean|undefined"
        },
        group28: {
            title28: "string",
            members28: "user16[]",
            isActive28: "boolean|undefined"
        },
        group29: {
            title29: "string",
            members29: "user114[]",
            isActive29: "boolean|undefined"
        },
        group30: {
            title30: "string",
            members30: "user97[]",
            isActive30: "boolean|undefined"
        },
        group31: {
            title31: "string",
            members31: "user151[]",
            isActive31: "boolean|undefined"
        },
        group32: {
            title32: "string",
            members32: "user236[]",
            isActive32: "boolean|undefined"
        },
        group33: {
            title33: "string",
            members33: "user174[]",
            isActive33: "boolean|undefined"
        },
        group34: {
            title34: "string",
            members34: "user10[]",
            isActive34: "boolean|undefined"
        },
        group35: {
            title35: "string",
            members35: "user238[]",
            isActive35: "boolean|undefined"
        },
        group36: {
            title36: "string",
            members36: "user5[]",
            isActive36: "boolean|undefined"
        },
        group37: {
            title37: "string",
            members37: "user4[]",
            isActive37: "boolean|undefined"
        },
        group38: {
            title38: "string",
            members38: "user49[]",
            isActive38: "boolean|undefined"
        },
        group39: {
            title39: "string",
            members39: "user29[]",
            isActive39: "boolean|undefined"
        },
        group40: {
            title40: "string",
            members40: "user191[]",
            isActive40: "boolean|undefined"
        },
        group41: {
            title41: "string",
            members41: "user178[]",
            isActive41: "boolean|undefined"
        },
        group42: {
            title42: "string",
            members42: "user7[]",
            isActive42: "boolean|undefined"
        },
        group43: {
            title43: "string",
            members43: "user155[]",
            isActive43: "boolean|undefined"
        },
        group44: {
            title44: "string",
            members44: "user29[]",
            isActive44: "boolean|undefined"
        },
        group45: {
            title45: "string",
            members45: "user49[]",
            isActive45: "boolean|undefined"
        },
        group46: {
            title46: "string",
            members46: "user89[]",
            isActive46: "boolean|undefined"
        },
        group47: {
            title47: "string",
            members47: "user11[]",
            isActive47: "boolean|undefined"
        },
        group48: {
            title48: "string",
            members48: "user242[]",
            isActive48: "boolean|undefined"
        },
        group49: {
            title49: "string",
            members49: "user25[]",
            isActive49: "boolean|undefined"
        },
        group50: {
            title50: "string",
            members50: "user110[]",
            isActive50: "boolean|undefined"
        },
        group51: {
            title51: "string",
            members51: "user168[]",
            isActive51: "boolean|undefined"
        },
        group52: {
            title52: "string",
            members52: "user61[]",
            isActive52: "boolean|undefined"
        },
        group53: {
            title53: "string",
            members53: "user226[]",
            isActive53: "boolean|undefined"
        },
        group54: {
            title54: "string",
            members54: "user123[]",
            isActive54: "boolean|undefined"
        },
        group55: {
            title55: "string",
            members55: "user160[]",
            isActive55: "boolean|undefined"
        },
        group56: {
            title56: "string",
            members56: "user107[]",
            isActive56: "boolean|undefined"
        },
        group57: {
            title57: "string",
            members57: "user220[]",
            isActive57: "boolean|undefined"
        },
        group58: {
            title58: "string",
            members58: "user247[]",
            isActive58: "boolean|undefined"
        },
        group59: {
            title59: "string",
            members59: "user168[]",
            isActive59: "boolean|undefined"
        },
        group60: {
            title60: "string",
            members60: "user39[]",
            isActive60: "boolean|undefined"
        },
        group61: {
            title61: "string",
            members61: "user30[]",
            isActive61: "boolean|undefined"
        },
        group62: {
            title62: "string",
            members62: "user160[]",
            isActive62: "boolean|undefined"
        },
        group63: {
            title63: "string",
            members63: "user127[]",
            isActive63: "boolean|undefined"
        },
        group64: {
            title64: "string",
            members64: "user206[]",
            isActive64: "boolean|undefined"
        },
        group65: {
            title65: "string",
            members65: "user86[]",
            isActive65: "boolean|undefined"
        },
        group66: {
            title66: "string",
            members66: "user136[]",
            isActive66: "boolean|undefined"
        },
        group67: {
            title67: "string",
            members67: "user105[]",
            isActive67: "boolean|undefined"
        },
        group68: {
            title68: "string",
            members68: "user204[]",
            isActive68: "boolean|undefined"
        },
        group69: {
            title69: "string",
            members69: "user197[]",
            isActive69: "boolean|undefined"
        },
        group70: {
            title70: "string",
            members70: "user200[]",
            isActive70: "boolean|undefined"
        },
        group71: {
            title71: "string",
            members71: "user55[]",
            isActive71: "boolean|undefined"
        },
        group72: {
            title72: "string",
            members72: "user117[]",
            isActive72: "boolean|undefined"
        },
        group73: {
            title73: "string",
            members73: "user87[]",
            isActive73: "boolean|undefined"
        },
        group74: {
            title74: "string",
            members74: "user157[]",
            isActive74: "boolean|undefined"
        },
        group75: {
            title75: "string",
            members75: "user194[]",
            isActive75: "boolean|undefined"
        },
        group76: {
            title76: "string",
            members76: "user129[]",
            isActive76: "boolean|undefined"
        },
        group77: {
            title77: "string",
            members77: "user11[]",
            isActive77: "boolean|undefined"
        },
        group78: {
            title78: "string",
            members78: "user85[]",
            isActive78: "boolean|undefined"
        },
        group79: {
            title79: "string",
            members79: "user141[]",
            isActive79: "boolean|undefined"
        },
        group80: {
            title80: "string",
            members80: "user239[]",
            isActive80: "boolean|undefined"
        },
        group81: {
            title81: "string",
            members81: "user144[]",
            isActive81: "boolean|undefined"
        },
        group82: {
            title82: "string",
            members82: "user89[]",
            isActive82: "boolean|undefined"
        },
        group83: {
            title83: "string",
            members83: "user223[]",
            isActive83: "boolean|undefined"
        },
        group84: {
            title84: "string",
            members84: "user13[]",
            isActive84: "boolean|undefined"
        },
        group85: {
            title85: "string",
            members85: "user28[]",
            isActive85: "boolean|undefined"
        },
        group86: {
            title86: "string",
            members86: "user130[]",
            isActive86: "boolean|undefined"
        },
        group87: {
            title87: "string",
            members87: "user41[]",
            isActive87: "boolean|undefined"
        },
        group88: {
            title88: "string",
            members88: "user164[]",
            isActive88: "boolean|undefined"
        },
        group89: {
            title89: "string",
            members89: "user235[]",
            isActive89: "boolean|undefined"
        },
        group90: {
            title90: "string",
            members90: "user143[]",
            isActive90: "boolean|undefined"
        },
        group91: {
            title91: "string",
            members91: "user21[]",
            isActive91: "boolean|undefined"
        },
        group92: {
            title92: "string",
            members92: "user62[]",
            isActive92: "boolean|undefined"
        },
        group93: {
            title93: "string",
            members93: "user247[]",
            isActive93: "boolean|undefined"
        },
        group94: {
            title94: "string",
            members94: "user65[]",
            isActive94: "boolean|undefined"
        },
        group95: {
            title95: "string",
            members95: "user23[]",
            isActive95: "boolean|undefined"
        },
        group96: {
            title96: "string",
            members96: "user192[]",
            isActive96: "boolean|undefined"
        },
        group97: {
            title97: "string",
            members97: "user109[]",
            isActive97: "boolean|undefined"
        },
        group98: {
            title98: "string",
            members98: "user196[]",
            isActive98: "boolean|undefined"
        },
        group99: {
            title99: "string",
            members99: "user51[]",
            isActive99: "boolean|undefined"
        },
        group100: {
            title100: "string",
            members100: "user213[]",
            isActive100: "boolean|undefined"
        },
        group101: {
            title101: "string",
            members101: "user85[]",
            isActive101: "boolean|undefined"
        },
        group102: {
            title102: "string",
            members102: "user139[]",
            isActive102: "boolean|undefined"
        },
        group103: {
            title103: "string",
            members103: "user84[]",
            isActive103: "boolean|undefined"
        },
        group104: {
            title104: "string",
            members104: "user165[]",
            isActive104: "boolean|undefined"
        },
        group105: {
            title105: "string",
            members105: "user99[]",
            isActive105: "boolean|undefined"
        },
        group106: {
            title106: "string",
            members106: "user147[]",
            isActive106: "boolean|undefined"
        },
        group107: {
            title107: "string",
            members107: "user229[]",
            isActive107: "boolean|undefined"
        },
        group108: {
            title108: "string",
            members108: "user101[]",
            isActive108: "boolean|undefined"
        },
        group109: {
            title109: "string",
            members109: "user124[]",
            isActive109: "boolean|undefined"
        },
        group110: {
            title110: "string",
            members110: "user19[]",
            isActive110: "boolean|undefined"
        },
        group111: {
            title111: "string",
            members111: "user79[]",
            isActive111: "boolean|undefined"
        },
        group112: {
            title112: "string",
            members112: "user59[]",
            isActive112: "boolean|undefined"
        },
        group113: {
            title113: "string",
            members113: "user156[]",
            isActive113: "boolean|undefined"
        },
        group114: {
            title114: "string",
            members114: "user191[]",
            isActive114: "boolean|undefined"
        },
        group115: {
            title115: "string",
            members115: "user50[]",
            isActive115: "boolean|undefined"
        },
        group116: {
            title116: "string",
            members116: "user230[]",
            isActive116: "boolean|undefined"
        },
        group117: {
            title117: "string",
            members117: "user81[]",
            isActive117: "boolean|undefined"
        },
        group118: {
            title118: "string",
            members118: "user170[]",
            isActive118: "boolean|undefined"
        },
        group119: {
            title119: "string",
            members119: "user173[]",
            isActive119: "boolean|undefined"
        },
        group120: {
            title120: "string",
            members120: "user134[]",
            isActive120: "boolean|undefined"
        },
        group121: {
            title121: "string",
            members121: "user19[]",
            isActive121: "boolean|undefined"
        },
        group122: {
            title122: "string",
            members122: "user227[]",
            isActive122: "boolean|undefined"
        },
        group123: {
            title123: "string",
            members123: "user185[]",
            isActive123: "boolean|undefined"
        },
        group124: {
            title124: "string",
            members124: "user105[]",
            isActive124: "boolean|undefined"
        },
        group125: {
            title125: "string",
            members125: "user19[]",
            isActive125: "boolean|undefined"
        },
        group126: {
            title126: "string",
            members126: "user187[]",
            isActive126: "boolean|undefined"
        },
        group127: {
            title127: "string",
            members127: "user211[]",
            isActive127: "boolean|undefined"
        },
        group128: {
            title128: "string",
            members128: "user106[]",
            isActive128: "boolean|undefined"
        },
        group129: {
            title129: "string",
            members129: "user48[]",
            isActive129: "boolean|undefined"
        },
        group130: {
            title130: "string",
            members130: "user78[]",
            isActive130: "boolean|undefined"
        },
        group131: {
            title131: "string",
            members131: "user131[]",
            isActive131: "boolean|undefined"
        },
        group132: {
            title132: "string",
            members132: "user74[]",
            isActive132: "boolean|undefined"
        },
        group133: {
            title133: "string",
            members133: "user34[]",
            isActive133: "boolean|undefined"
        },
        group134: {
            title134: "string",
            members134: "user121[]",
            isActive134: "boolean|undefined"
        },
        group135: {
            title135: "string",
            members135: "user234[]",
            isActive135: "boolean|undefined"
        },
        group136: {
            title136: "string",
            members136: "user189[]",
            isActive136: "boolean|undefined"
        },
        group137: {
            title137: "string",
            members137: "user181[]",
            isActive137: "boolean|undefined"
        },
        group138: {
            title138: "string",
            members138: "user32[]",
            isActive138: "boolean|undefined"
        },
        group139: {
            title139: "string",
            members139: "user118[]",
            isActive139: "boolean|undefined"
        },
        group140: {
            title140: "string",
            members140: "user82[]",
            isActive140: "boolean|undefined"
        },
        group141: {
            title141: "string",
            members141: "user97[]",
            isActive141: "boolean|undefined"
        },
        group142: {
            title142: "string",
            members142: "user226[]",
            isActive142: "boolean|undefined"
        },
        group143: {
            title143: "string",
            members143: "user168[]",
            isActive143: "boolean|undefined"
        },
        group144: {
            title144: "string",
            members144: "user10[]",
            isActive144: "boolean|undefined"
        },
        group145: {
            title145: "string",
            members145: "user174[]",
            isActive145: "boolean|undefined"
        },
        group146: {
            title146: "string",
            members146: "user111[]",
            isActive146: "boolean|undefined"
        },
        group147: {
            title147: "string",
            members147: "user7[]",
            isActive147: "boolean|undefined"
        },
        group148: {
            title148: "string",
            members148: "user213[]",
            isActive148: "boolean|undefined"
        },
        group149: {
            title149: "string",
            members149: "user71[]",
            isActive149: "boolean|undefined"
        },
        group150: {
            title150: "string",
            members150: "user197[]",
            isActive150: "boolean|undefined"
        },
        group151: {
            title151: "string",
            members151: "user41[]",
            isActive151: "boolean|undefined"
        },
        group152: {
            title152: "string",
            members152: "user158[]",
            isActive152: "boolean|undefined"
        },
        group153: {
            title153: "string",
            members153: "user6[]",
            isActive153: "boolean|undefined"
        },
        group154: {
            title154: "string",
            members154: "user48[]",
            isActive154: "boolean|undefined"
        },
        group155: {
            title155: "string",
            members155: "user24[]",
            isActive155: "boolean|undefined"
        },
        group156: {
            title156: "string",
            members156: "user32[]",
            isActive156: "boolean|undefined"
        },
        group157: {
            title157: "string",
            members157: "user59[]",
            isActive157: "boolean|undefined"
        },
        group158: {
            title158: "string",
            members158: "user135[]",
            isActive158: "boolean|undefined"
        },
        group159: {
            title159: "string",
            members159: "user128[]",
            isActive159: "boolean|undefined"
        },
        group160: {
            title160: "string",
            members160: "user244[]",
            isActive160: "boolean|undefined"
        },
        group161: {
            title161: "string",
            members161: "user140[]",
            isActive161: "boolean|undefined"
        },
        group162: {
            title162: "string",
            members162: "user65[]",
            isActive162: "boolean|undefined"
        },
        group163: {
            title163: "string",
            members163: "user217[]",
            isActive163: "boolean|undefined"
        },
        group164: {
            title164: "string",
            members164: "user96[]",
            isActive164: "boolean|undefined"
        },
        group165: {
            title165: "string",
            members165: "user211[]",
            isActive165: "boolean|undefined"
        },
        group166: {
            title166: "string",
            members166: "user231[]",
            isActive166: "boolean|undefined"
        },
        group167: {
            title167: "string",
            members167: "user181[]",
            isActive167: "boolean|undefined"
        },
        group168: {
            title168: "string",
            members168: "user144[]",
            isActive168: "boolean|undefined"
        },
        group169: {
            title169: "string",
            members169: "user237[]",
            isActive169: "boolean|undefined"
        },
        group170: {
            title170: "string",
            members170: "user10[]",
            isActive170: "boolean|undefined"
        },
        group171: {
            title171: "string",
            members171: "user98[]",
            isActive171: "boolean|undefined"
        },
        group172: {
            title172: "string",
            members172: "user112[]",
            isActive172: "boolean|undefined"
        },
        group173: {
            title173: "string",
            members173: "user122[]",
            isActive173: "boolean|undefined"
        },
        group174: {
            title174: "string",
            members174: "user184[]",
            isActive174: "boolean|undefined"
        },
        group175: {
            title175: "string",
            members175: "user242[]",
            isActive175: "boolean|undefined"
        },
        group176: {
            title176: "string",
            members176: "user229[]",
            isActive176: "boolean|undefined"
        },
        group177: {
            title177: "string",
            members177: "user156[]",
            isActive177: "boolean|undefined"
        },
        group178: {
            title178: "string",
            members178: "user182[]",
            isActive178: "boolean|undefined"
        },
        group179: {
            title179: "string",
            members179: "user23[]",
            isActive179: "boolean|undefined"
        },
        group180: {
            title180: "string",
            members180: "user66[]",
            isActive180: "boolean|undefined"
        },
        group181: {
            title181: "string",
            members181: "user10[]",
            isActive181: "boolean|undefined"
        },
        group182: {
            title182: "string",
            members182: "user223[]",
            isActive182: "boolean|undefined"
        },
        group183: {
            title183: "string",
            members183: "user219[]",
            isActive183: "boolean|undefined"
        },
        group184: {
            title184: "string",
            members184: "user41[]",
            isActive184: "boolean|undefined"
        },
        group185: {
            title185: "string",
            members185: "user206[]",
            isActive185: "boolean|undefined"
        },
        group186: {
            title186: "string",
            members186: "user248[]",
            isActive186: "boolean|undefined"
        },
        group187: {
            title187: "string",
            members187: "user72[]",
            isActive187: "boolean|undefined"
        },
        group188: {
            title188: "string",
            members188: "user203[]",
            isActive188: "boolean|undefined"
        },
        group189: {
            title189: "string",
            members189: "user126[]",
            isActive189: "boolean|undefined"
        },
        group190: {
            title190: "string",
            members190: "user154[]",
            isActive190: "boolean|undefined"
        },
        group191: {
            title191: "string",
            members191: "user96[]",
            isActive191: "boolean|undefined"
        },
        group192: {
            title192: "string",
            members192: "user136[]",
            isActive192: "boolean|undefined"
        },
        group193: {
            title193: "string",
            members193: "user58[]",
            isActive193: "boolean|undefined"
        },
        group194: {
            title194: "string",
            members194: "user66[]",
            isActive194: "boolean|undefined"
        },
        group195: {
            title195: "string",
            members195: "user44[]",
            isActive195: "boolean|undefined"
        },
        group196: {
            title196: "string",
            members196: "user220[]",
            isActive196: "boolean|undefined"
        },
        group197: {
            title197: "string",
            members197: "user42[]",
            isActive197: "boolean|undefined"
        },
        group198: {
            title198: "string",
            members198: "user3[]",
            isActive198: "boolean|undefined"
        },
        group199: {
            title199: "string",
            members199: "user172[]",
            isActive199: "boolean|undefined"
        },
        group200: {
            title200: "string",
            members200: "user113[]",
            isActive200: "boolean|undefined"
        },
        group201: {
            title201: "string",
            members201: "user166[]",
            isActive201: "boolean|undefined"
        },
        group202: {
            title202: "string",
            members202: "user45[]",
            isActive202: "boolean|undefined"
        },
        group203: {
            title203: "string",
            members203: "user85[]",
            isActive203: "boolean|undefined"
        },
        group204: {
            title204: "string",
            members204: "user156[]",
            isActive204: "boolean|undefined"
        },
        group205: {
            title205: "string",
            members205: "user108[]",
            isActive205: "boolean|undefined"
        },
        group206: {
            title206: "string",
            members206: "user91[]",
            isActive206: "boolean|undefined"
        },
        group207: {
            title207: "string",
            members207: "user231[]",
            isActive207: "boolean|undefined"
        },
        group208: {
            title208: "string",
            members208: "user96[]",
            isActive208: "boolean|undefined"
        },
        group209: {
            title209: "string",
            members209: "user177[]",
            isActive209: "boolean|undefined"
        },
        group210: {
            title210: "string",
            members210: "user197[]",
            isActive210: "boolean|undefined"
        },
        group211: {
            title211: "string",
            members211: "user114[]",
            isActive211: "boolean|undefined"
        },
        group212: {
            title212: "string",
            members212: "user245[]",
            isActive212: "boolean|undefined"
        },
        group213: {
            title213: "string",
            members213: "user233[]",
            isActive213: "boolean|undefined"
        },
        group214: {
            title214: "string",
            members214: "user73[]",
            isActive214: "boolean|undefined"
        },
        group215: {
            title215: "string",
            members215: "user65[]",
            isActive215: "boolean|undefined"
        },
        group216: {
            title216: "string",
            members216: "user24[]",
            isActive216: "boolean|undefined"
        },
        group217: {
            title217: "string",
            members217: "user217[]",
            isActive217: "boolean|undefined"
        },
        group218: {
            title218: "string",
            members218: "user198[]",
            isActive218: "boolean|undefined"
        },
        group219: {
            title219: "string",
            members219: "user219[]",
            isActive219: "boolean|undefined"
        },
        group220: {
            title220: "string",
            members220: "user125[]",
            isActive220: "boolean|undefined"
        },
        group221: {
            title221: "string",
            members221: "user77[]",
            isActive221: "boolean|undefined"
        },
        group222: {
            title222: "string",
            members222: "user69[]",
            isActive222: "boolean|undefined"
        },
        group223: {
            title223: "string",
            members223: "user84[]",
            isActive223: "boolean|undefined"
        },
        group224: {
            title224: "string",
            members224: "user33[]",
            isActive224: "boolean|undefined"
        },
        group225: {
            title225: "string",
            members225: "user205[]",
            isActive225: "boolean|undefined"
        },
        group226: {
            title226: "string",
            members226: "user196[]",
            isActive226: "boolean|undefined"
        },
        group227: {
            title227: "string",
            members227: "user199[]",
            isActive227: "boolean|undefined"
        },
        group228: {
            title228: "string",
            members228: "user12[]",
            isActive228: "boolean|undefined"
        },
        group229: {
            title229: "string",
            members229: "user150[]",
            isActive229: "boolean|undefined"
        },
        group230: {
            title230: "string",
            members230: "user214[]",
            isActive230: "boolean|undefined"
        },
        group231: {
            title231: "string",
            members231: "user240[]",
            isActive231: "boolean|undefined"
        },
        group232: {
            title232: "string",
            members232: "user226[]",
            isActive232: "boolean|undefined"
        },
        group233: {
            title233: "string",
            members233: "user19[]",
            isActive233: "boolean|undefined"
        },
        group234: {
            title234: "string",
            members234: "user70[]",
            isActive234: "boolean|undefined"
        },
        group235: {
            title235: "string",
            members235: "user81[]",
            isActive235: "boolean|undefined"
        },
        group236: {
            title236: "string",
            members236: "user249[]",
            isActive236: "boolean|undefined"
        },
        group237: {
            title237: "string",
            members237: "user46[]",
            isActive237: "boolean|undefined"
        },
        group238: {
            title238: "string",
            members238: "user36[]",
            isActive238: "boolean|undefined"
        },
        group239: {
            title239: "string",
            members239: "user170[]",
            isActive239: "boolean|undefined"
        },
        group240: {
            title240: "string",
            members240: "user70[]",
            isActive240: "boolean|undefined"
        },
        group241: {
            title241: "string",
            members241: "user126[]",
            isActive241: "boolean|undefined"
        },
        group242: {
            title242: "string",
            members242: "user98[]",
            isActive242: "boolean|undefined"
        },
        group243: {
            title243: "string",
            members243: "user6[]",
            isActive243: "boolean|undefined"
        },
        group244: {
            title244: "string",
            members244: "user108[]",
            isActive244: "boolean|undefined"
        },
        group245: {
            title245: "string",
            members245: "user121[]",
            isActive245: "boolean|undefined"
        },
        group246: {
            title246: "string",
            members246: "user163[]",
            isActive246: "boolean|undefined"
        },
        group247: {
            title247: "string",
            members247: "user135[]",
            isActive247: "boolean|undefined"
        },
        group248: {
            title248: "string",
            members248: "user166[]",
            isActive248: "boolean|undefined"
        },
        group249: {
            title249: "string",
            members249: "user132[]",
            isActive249: "boolean|undefined"
        },
        group250: {
            title250: "string",
            members250: "user158[]",
            isActive250: "boolean|undefined"
        }
    })
})
    .median("69.52s")
    .type.median("1.72s")
