"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_extra_1 = require("fs-extra");
const path_1 = require("path");
const moize_1 = __importDefault(require("moize"));
const class_transformer_1 = require("class-transformer");
exports.walk = (dir) => exports.fromEntries(fs_extra_1.readdirSync(dir).map(item => [
    item,
    fs_extra_1.lstatSync(path_1.join(dir, item)).isDirectory()
        ? exports.walk(path_1.join(dir, item))
        : null
]));
exports.objectify = class_transformer_1.classToPlain;
exports.classify = class_transformer_1.plainToClass;
exports.memoize = moize_1.default;
exports.isRecursible = (o) => o && typeof o === "object";
exports.deepMap = (from, map) => exports.fromEntries(Object.entries(from).map(([k, v]) => [
    k,
    exports.isRecursible(v) ? exports.deepMap(map(v), map) : map(v)
]), Array.isArray(from));
exports.listify = (o) => [].concat(o);
exports.fromEntries = (entries, asArray = false) => {
    const obj = asArray ? [] : {};
    entries.forEach(([k, v]) => (obj[k] = v));
    return obj;
};
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7QUFBQSx1Q0FBaUQ7QUFDakQsK0JBQTJCO0FBQzNCLGtEQUF5QjtBQUN6Qix5REFBOEQ7QUFFakQsUUFBQSxJQUFJLEdBQUcsQ0FBQyxHQUFXLEVBQVksRUFBRSxDQUMxQyxtQkFBVyxDQUNQLHNCQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7SUFDekIsSUFBSTtJQUNKLG9CQUFTLENBQUMsV0FBSSxDQUFDLEdBQUcsRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRTtRQUNwQyxDQUFDLENBQUMsWUFBSSxDQUFDLFdBQUksQ0FBQyxHQUFHLEVBQUUsSUFBSSxDQUFDLENBQUM7UUFDdkIsQ0FBQyxDQUFDLElBQUk7Q0FDYixDQUFDLENBQ0wsQ0FBQTtBQUVRLFFBQUEsU0FBUyxHQUFHLGdDQUFZLENBQUE7QUFDeEIsUUFBQSxRQUFRLEdBQUcsZ0NBQVksQ0FBQTtBQUl2QixRQUFBLE9BQU8sR0FBRyxlQUF1RCxDQUFBO0FBcUJqRSxRQUFBLFlBQVksR0FBRyxDQUFDLENBQU0sRUFBRSxFQUFFLENBQUMsQ0FBQyxJQUFJLE9BQU8sQ0FBQyxLQUFLLFFBQVEsQ0FBQTtBQUVyRCxRQUFBLE9BQU8sR0FBRyxDQUNuQixJQUFvQixFQUNwQixHQUF3QixFQUNsQixFQUFFLENBQ1IsbUJBQVcsQ0FDUCxNQUFNLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQztJQUNqQyxDQUFDO0lBQ0Qsb0JBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztDQUNsRCxDQUFDLEVBQ0YsS0FBSyxDQUFDLE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FDdEIsQ0FBQTtBQUlRLFFBQUEsT0FBTyxHQUFHLENBQUksQ0FBZ0IsRUFBRSxFQUFFLENBQUUsRUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQTtBQUt4RCxRQUFBLFdBQVcsR0FBRyxDQUFDLE9BQWdCLEVBQUUsT0FBTyxHQUFHLEtBQUssRUFBRSxFQUFFO0lBQzdELE1BQU0sR0FBRyxHQUFRLE9BQU8sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7SUFDbEMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFBO0lBQ3pDLE9BQU8sR0FBRyxDQUFBO0FBQ2QsQ0FBQyxDQUFBIn0=