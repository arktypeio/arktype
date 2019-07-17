"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const filter_1 = require("./filter");
exports.filterKeys = (o, keys, deep) => filter_1.filter(o, {
    objectFilter: ([k]) => keys.includes(k),
    deep
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsdGVyS2V5cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uL3NyYy9maWx0ZXJzL2ZpbHRlcktleXMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7QUFDQSxxQ0FBaUM7QUFhcEIsUUFBQSxVQUFVLEdBQUcsQ0FDdEIsQ0FBSSxFQUNKLElBQU8sRUFDUCxJQUFRLEVBQ1YsRUFBRSxDQUNDLGVBQU0sQ0FBQyxDQUFDLEVBQUU7SUFDUCxZQUFZLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQztJQUN2QyxJQUFJO0NBQ1AsQ0FFeUIsQ0FBQSJ9