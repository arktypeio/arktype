"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filter_1 = require("./filter");
exports.excludeKeys = (o, keys, deep) => filter_1.filter(o, {
    objectFilter: ([k]) => !keys.includes(k),
    deep
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhjbHVkZUtleXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvZmlsdGVycy9leGNsdWRlS2V5cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUNBLHFDQUFpQztBQWFwQixRQUFBLFdBQVcsR0FBRyxDQUN2QixDQUFJLEVBQ0osSUFBTyxFQUNQLElBQVEsRUFDVixFQUFFLENBQ0MsZUFBTSxDQUFDLENBQUMsRUFBRTtJQUNQLFlBQVksRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDeEMsSUFBSTtDQUNQLENBRXlCLENBQUEifQ==