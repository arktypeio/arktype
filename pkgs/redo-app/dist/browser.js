/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ({

/***/ "../../common/temp/node_modules/@medv/finder/dist/index.js":
/*!**************************************************************************************!*\
  !*** /home/ssalbdivad/redo/redo/common/temp/node_modules/@medv/finder/dist/index.js ***!
  \**************************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
Object.defineProperty(exports, "__esModule", { value: true });
var cssesc = __webpack_require__(/*! cssesc */ "../../common/temp/node_modules/cssesc/cssesc.js");
var Limit;
(function (Limit) {
    Limit[Limit["All"] = 0] = "All";
    Limit[Limit["Two"] = 1] = "Two";
    Limit[Limit["One"] = 2] = "One";
})(Limit || (Limit = {}));
var config;
var rootDocument;
function default_1(input, options) {
    if (input.nodeType !== Node.ELEMENT_NODE) {
        throw new Error("Can't generate CSS selector for non-element node type.");
    }
    if ('html' === input.tagName.toLowerCase()) {
        return input.tagName.toLowerCase();
    }
    var defaults = {
        root: document.body,
        idName: function (name) { return true; },
        className: function (name) { return true; },
        tagName: function (name) { return true; },
        seedMinLength: 1,
        optimizedMinLength: 2,
        threshold: 1000,
    };
    config = __assign({}, defaults, options);
    rootDocument = findRootDocument(config.root, defaults);
    var path = bottomUpSearch(input, Limit.All, function () {
        return bottomUpSearch(input, Limit.Two, function () {
            return bottomUpSearch(input, Limit.One);
        });
    });
    if (path) {
        var optimized = sort(optimize(path, input));
        if (optimized.length > 0) {
            path = optimized[0];
        }
        return selector(path);
    }
    else {
        throw new Error("Selector was not found.");
    }
}
exports.default = default_1;
function findRootDocument(rootNode, defaults) {
    if (rootNode.nodeType === Node.DOCUMENT_NODE) {
        return rootNode;
    }
    if (rootNode === defaults.root) {
        return rootNode.ownerDocument;
    }
    return rootNode;
}
function bottomUpSearch(input, limit, fallback) {
    var path = null;
    var stack = [];
    var current = input;
    var i = 0;
    var _loop_1 = function () {
        var level = maybe(id(current)) || maybe.apply(void 0, classNames(current)) || maybe(tagName(current)) || [any()];
        var nth = index(current);
        if (limit === Limit.All) {
            if (nth) {
                level = level.concat(level.filter(dispensableNth).map(function (node) { return nthChild(node, nth); }));
            }
        }
        else if (limit === Limit.Two) {
            level = level.slice(0, 1);
            if (nth) {
                level = level.concat(level.filter(dispensableNth).map(function (node) { return nthChild(node, nth); }));
            }
        }
        else if (limit === Limit.One) {
            var node = (level = level.slice(0, 1))[0];
            if (nth && dispensableNth(node)) {
                level = [nthChild(node, nth)];
            }
        }
        for (var _i = 0, level_1 = level; _i < level_1.length; _i++) {
            var node = level_1[_i];
            node.level = i;
        }
        stack.push(level);
        if (stack.length >= config.seedMinLength) {
            path = findUniquePath(stack, fallback);
            if (path) {
                return "break";
            }
        }
        current = current.parentElement;
        i++;
    };
    while (current && current !== config.root.parentElement) {
        var state_1 = _loop_1();
        if (state_1 === "break")
            break;
    }
    if (!path) {
        path = findUniquePath(stack, fallback);
    }
    return path;
}
function findUniquePath(stack, fallback) {
    var paths = sort(combinations(stack));
    if (paths.length > config.threshold) {
        return fallback ? fallback() : null;
    }
    for (var _i = 0, paths_1 = paths; _i < paths_1.length; _i++) {
        var candidate = paths_1[_i];
        if (unique(candidate)) {
            return candidate;
        }
    }
    return null;
}
function selector(path) {
    var node = path[0];
    var query = node.name;
    for (var i = 1; i < path.length; i++) {
        var level = path[i].level || 0;
        if (node.level === level - 1) {
            query = path[i].name + " > " + query;
        }
        else {
            query = path[i].name + " " + query;
        }
        node = path[i];
    }
    return query;
}
function penalty(path) {
    return path.map(function (node) { return node.penalty; }).reduce(function (acc, i) { return acc + i; }, 0);
}
function unique(path) {
    switch (rootDocument.querySelectorAll(selector(path)).length) {
        case 0:
            throw new Error("Can't select any node with this selector: " + selector(path));
        case 1:
            return true;
        default:
            return false;
    }
}
function id(input) {
    var elementId = input.getAttribute('id');
    if (elementId && config.idName(elementId)) {
        return {
            name: '#' + cssesc(elementId, { isIdentifier: true }),
            penalty: 0,
        };
    }
    return null;
}
function classNames(input) {
    var names = Array.from(input.classList)
        .filter(config.className);
    return names.map(function (name) { return ({
        name: '.' + cssesc(name, { isIdentifier: true }),
        penalty: 1
    }); });
}
function tagName(input) {
    var name = input.tagName.toLowerCase();
    if (config.tagName(name)) {
        return {
            name: name,
            penalty: 2
        };
    }
    return null;
}
function any() {
    return {
        name: '*',
        penalty: 3
    };
}
function index(input) {
    var parent = input.parentNode;
    if (!parent) {
        return null;
    }
    var child = parent.firstChild;
    if (!child) {
        return null;
    }
    var i = 0;
    while (child) {
        if (child.nodeType === Node.ELEMENT_NODE) {
            i++;
        }
        if (child === input) {
            break;
        }
        child = child.nextSibling;
    }
    return i;
}
function nthChild(node, i) {
    return {
        name: node.name + (":nth-child(" + i + ")"),
        penalty: node.penalty + 1
    };
}
function dispensableNth(node) {
    return node.name !== 'html' && !node.name.startsWith('#');
}
function maybe() {
    var level = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        level[_i] = arguments[_i];
    }
    var list = level.filter(notEmpty);
    if (list.length > 0) {
        return list;
    }
    return null;
}
function notEmpty(value) {
    return value !== null && value !== undefined;
}
function combinations(stack, path) {
    var _i, _a, node;
    if (path === void 0) { path = []; }
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                if (!(stack.length > 0)) return [3 /*break*/, 5];
                _i = 0, _a = stack[0];
                _b.label = 1;
            case 1:
                if (!(_i < _a.length)) return [3 /*break*/, 4];
                node = _a[_i];
                return [5 /*yield**/, __values(combinations(stack.slice(1, stack.length), path.concat(node)))];
            case 2:
                _b.sent();
                _b.label = 3;
            case 3:
                _i++;
                return [3 /*break*/, 1];
            case 4: return [3 /*break*/, 7];
            case 5: return [4 /*yield*/, path];
            case 6:
                _b.sent();
                _b.label = 7;
            case 7: return [2 /*return*/];
        }
    });
}
function sort(paths) {
    return Array.from(paths).sort(function (a, b) { return penalty(a) - penalty(b); });
}
function optimize(path, input) {
    var i, newPath;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                if (!(path.length > 2 && path.length > config.optimizedMinLength)) return [3 /*break*/, 5];
                i = 1;
                _a.label = 1;
            case 1:
                if (!(i < path.length - 1)) return [3 /*break*/, 5];
                newPath = path.slice();
                newPath.splice(i, 1);
                if (!(unique(newPath) && same(newPath, input))) return [3 /*break*/, 4];
                return [4 /*yield*/, newPath];
            case 2:
                _a.sent();
                return [5 /*yield**/, __values(optimize(newPath, input))];
            case 3:
                _a.sent();
                _a.label = 4;
            case 4:
                i++;
                return [3 /*break*/, 1];
            case 5: return [2 /*return*/];
        }
    });
}
function same(path, input) {
    return rootDocument.querySelector(selector(path)) === input;
}
//# sourceMappingURL=index.js.map

/***/ }),

/***/ "../../common/temp/node_modules/cssesc/cssesc.js":
/*!****************************************************************************!*\
  !*** /home/ssalbdivad/redo/redo/common/temp/node_modules/cssesc/cssesc.js ***!
  \****************************************************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";
/*! https://mths.be/cssesc v1.0.1 by @mathias */


var object = {};
var hasOwnProperty = object.hasOwnProperty;
var merge = function merge(options, defaults) {
	if (!options) {
		return defaults;
	}
	var result = {};
	for (var key in defaults) {
		// `if (defaults.hasOwnProperty(key) { … }` is not needed here, since
		// only recognized option names are used.
		result[key] = hasOwnProperty.call(options, key) ? options[key] : defaults[key];
	}
	return result;
};

var regexAnySingleEscape = /[ -,\.\/;-@\[-\^`\{-~]/;
var regexSingleEscape = /[ -,\.\/;-@\[\]\^`\{-~]/;
var regexAlwaysEscape = /['"\\]/;
var regexExcessiveSpaces = /(^|\\+)?(\\[A-F0-9]{1,6})\x20(?![a-fA-F0-9\x20])/g;

// https://mathiasbynens.be/notes/css-escapes#css
var cssesc = function cssesc(string, options) {
	options = merge(options, cssesc.options);
	if (options.quotes != 'single' && options.quotes != 'double') {
		options.quotes = 'single';
	}
	var quote = options.quotes == 'double' ? '"' : '\'';
	var isIdentifier = options.isIdentifier;

	var firstChar = string.charAt(0);
	var output = '';
	var counter = 0;
	var length = string.length;
	while (counter < length) {
		var character = string.charAt(counter++);
		var codePoint = character.charCodeAt();
		var value = void 0;
		// If it’s not a printable ASCII character…
		if (codePoint < 0x20 || codePoint > 0x7E) {
			if (codePoint >= 0xD800 && codePoint <= 0xDBFF && counter < length) {
				// It’s a high surrogate, and there is a next character.
				var extra = string.charCodeAt(counter++);
				if ((extra & 0xFC00) == 0xDC00) {
					// next character is low surrogate
					codePoint = ((codePoint & 0x3FF) << 10) + (extra & 0x3FF) + 0x10000;
				} else {
					// It’s an unmatched surrogate; only append this code unit, in case
					// the next code unit is the high surrogate of a surrogate pair.
					counter--;
				}
			}
			value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
		} else {
			if (options.escapeEverything) {
				if (regexAnySingleEscape.test(character)) {
					value = '\\' + character;
				} else {
					value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
				}
				// Note: `:` could be escaped as `\:`, but that fails in IE < 8.
			} else if (/[\t\n\f\r\x0B:]/.test(character)) {
				if (!isIdentifier && character == ':') {
					value = character;
				} else {
					value = '\\' + codePoint.toString(16).toUpperCase() + ' ';
				}
			} else if (character == '\\' || !isIdentifier && (character == '"' && quote == character || character == '\'' && quote == character) || isIdentifier && regexSingleEscape.test(character)) {
				value = '\\' + character;
			} else {
				value = character;
			}
		}
		output += value;
	}

	if (isIdentifier) {
		if (/^_/.test(output)) {
			// Prevent IE6 from ignoring the rule altogether (in case this is for an
			// identifier used as a selector)
			output = '\\_' + output.slice(1);
		} else if (/^-[-\d]/.test(output)) {
			output = '\\-' + output.slice(1);
		} else if (/\d/.test(firstChar)) {
			output = '\\3' + firstChar + ' ' + output.slice(1);
		}
	}

	// Remove spaces after `\HEX` escapes that are not followed by a hex digit,
	// since they’re redundant. Note that this is only possible if the escape
	// sequence isn’t preceded by an odd number of backslashes.
	output = output.replace(regexExcessiveSpaces, function ($0, $1, $2) {
		if ($1 && $1.length % 2) {
			// It’s not safe to remove the space, so don’t.
			return $0;
		}
		// Strip the space.
		return ($1 || '') + $2;
	});

	if (!isIdentifier && options.wrap) {
		return quote + output + quote;
	}
	return output;
};

// Expose default options (so they can be overridden globally).
cssesc.options = {
	'escapeEverything': false,
	'isIdentifier': false,
	'quotes': 'single',
	'wrap': false
};

cssesc.version = '1.0.1';

module.exports = cssesc;


/***/ }),

/***/ "./src/browser/index.ts":
/*!******************************!*\
  !*** ./src/browser/index.ts ***!
  \******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";

var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const finder_1 = __importDefault(__webpack_require__(/*! @medv/finder */ "../../common/temp/node_modules/@medv/finder/dist/index.js"));
exports.watchPage = () => __awaiter(this, void 0, void 0, function* () {
    const browserWindow = window;
    const events = {
        CLICK: "click",
        DBLCLICK: "dblclick",
        CHANGE: "change",
        SELECT: "select",
        SUBMIT: "submit"
    };
    Object.values(events).forEach(event => browserWindow.addEventListener(event, (e) => __awaiter(this, void 0, void 0, function* () {
        const browserEvent = {
            type: e.type,
            selector: "",
            value: ""
        };
        if (e.target) {
            const target = e.target;
            browserEvent.selector = finder_1.default(target);
            switch (e.type) {
                case "change":
                    if (e.target) {
                        const inputTarget = target;
                        browserEvent.value = inputTarget.value;
                    }
            }
        }
        browserWindow.notify(browserEvent);
    }), true));
});
exports.watchPage();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi9zcmMvYnJvd3Nlci9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7O0FBQUEsMERBQWlDO0FBR3BCLFFBQUEsU0FBUyxHQUFHLEdBQVMsRUFBRTtJQUNoQyxNQUFNLGFBQWEsR0FFZixNQUFhLENBQUE7SUFDakIsTUFBTSxNQUFNLEdBQUc7UUFDWCxLQUFLLEVBQUUsT0FBTztRQUNkLFFBQVEsRUFBRSxVQUFVO1FBQ3BCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLE1BQU0sRUFBRSxRQUFRO1FBQ2hCLE1BQU0sRUFBRSxRQUFRO0tBQ25CLENBQUE7SUFDRCxNQUFNLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUNsQyxhQUFhLENBQUMsZ0JBQWdCLENBQzFCLEtBQUssRUFDTCxDQUFPLENBQVEsRUFBRSxFQUFFO1FBQ2YsTUFBTSxZQUFZLEdBQWlCO1lBQy9CLElBQUksRUFBRSxDQUFDLENBQUMsSUFBSTtZQUNaLFFBQVEsRUFBRSxFQUFFO1lBQ1osS0FBSyxFQUFFLEVBQUU7U0FDWixDQUFBO1FBQ0QsSUFBSSxDQUFDLENBQUMsTUFBTSxFQUFFO1lBQ1YsTUFBTSxNQUFNLEdBQUcsQ0FBQyxDQUFDLE1BQXFCLENBQUE7WUFDdEMsWUFBWSxDQUFDLFFBQVEsR0FBRyxnQkFBTSxDQUFDLE1BQXFCLENBQUMsQ0FBQTtZQUNyRCxRQUFRLENBQUMsQ0FBQyxJQUFJLEVBQUU7Z0JBQ1osS0FBSyxRQUFRO29CQUNULElBQUksQ0FBQyxDQUFDLE1BQU0sRUFBRTt3QkFDVixNQUFNLFdBQVcsR0FBRyxNQUEwQixDQUFBO3dCQUM5QyxZQUFZLENBQUMsS0FBSyxHQUFHLFdBQVcsQ0FBQyxLQUFLLENBQUE7cUJBQ3pDO2FBQ1I7U0FDSjtRQUNELGFBQWEsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLENBQUE7SUFDdEMsQ0FBQyxDQUFBLEVBQ0QsSUFBSSxDQUNQLENBQ0osQ0FBQTtBQUNMLENBQUMsQ0FBQSxDQUFBO0FBRUQsaUJBQVMsRUFBRSxDQUFBIn0=

/***/ }),

/***/ 0:
/*!************************************!*\
  !*** multi ./src/browser/index.ts ***!
  \************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

module.exports = __webpack_require__(/*! /home/ssalbdivad/redo/redo/pkgs/redo-app/src/browser/index.ts */"./src/browser/index.ts");


/***/ })

/******/ });
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIndlYnBhY2s6Ly8vd2VicGFjay9ib290c3RyYXAiLCJ3ZWJwYWNrOi8vLy9ob21lL3NzYWxiZGl2YWQvcmVkby9yZWRvL2NvbW1vbi90ZW1wL25vZGVfbW9kdWxlcy9AbWVkdi9maW5kZXIvZGlzdC9pbmRleC5qcyIsIndlYnBhY2s6Ly8vL2hvbWUvc3NhbGJkaXZhZC9yZWRvL3JlZG8vY29tbW9uL3RlbXAvbm9kZV9tb2R1bGVzL2Nzc2VzYy9jc3Nlc2MuanMiLCJ3ZWJwYWNrOi8vLy4vc3JjL2Jyb3dzZXIvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBO0FBQ0E7O0FBRUE7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBOzs7QUFHQTtBQUNBOztBQUVBO0FBQ0E7O0FBRUE7QUFDQTtBQUNBO0FBQ0Esa0RBQTBDLGdDQUFnQztBQUMxRTtBQUNBOztBQUVBO0FBQ0E7QUFDQTtBQUNBLGdFQUF3RCxrQkFBa0I7QUFDMUU7QUFDQSx5REFBaUQsY0FBYztBQUMvRDs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsaURBQXlDLGlDQUFpQztBQUMxRSx3SEFBZ0gsbUJBQW1CLEVBQUU7QUFDckk7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQSxtQ0FBMkIsMEJBQTBCLEVBQUU7QUFDdkQseUNBQWlDLGVBQWU7QUFDaEQ7QUFDQTtBQUNBOztBQUVBO0FBQ0EsOERBQXNELCtEQUErRDs7QUFFckg7QUFDQTs7O0FBR0E7QUFDQTs7Ozs7Ozs7Ozs7OztBQ2xGYTtBQUNiO0FBQ0E7QUFDQSxnREFBZ0QsT0FBTztBQUN2RDtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSxhQUFhLDZCQUE2QiwwQkFBMEIsYUFBYSxFQUFFLHFCQUFxQjtB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QTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsR0FBRztBQUNIO0FBQ0EsR0FBRztBQUNIO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBLEVBQUU7O0FBRUY7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUFFQTs7QUFFQTs7Ozs7Ozs7Ozs7OztBQ3RIYTtBQUNiO0FBQ0E7QUFDQSxtQ0FBbUMsTUFBTSw2QkFBNkIsRUFBRSxZQUFZLFdBQVcsRUFBRTtBQUNqRyxrQ0FBa0MsTUFBTSxpQ0FBaUMsRUFBRSxZQUFZLFdBQVcsRUFBRTtBQUNwRywrQkFBK0IsaUVBQWlFLHVCQUF1QixFQUFFLDRCQUE0QjtBQUNySjtBQUNBLEtBQUs7QUFDTDtBQUNBO0FBQ0EsNENBQTRDO0FBQzVDO0FBQ0EsOENBQThDLGNBQWM7QUFDNUQsaUNBQWlDLG1CQUFPLENBQUMsK0VBQWM7QUFDdkQ7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EsS0FBSztBQUNMLENBQUM7QUFDRDtBQUNBLDJDQUEyQyxteUMiLCJmaWxlIjoiYnJvd3Nlci5qcyIsInNvdXJjZXNDb250ZW50IjpbIiBcdC8vIFRoZSBtb2R1bGUgY2FjaGVcbiBcdHZhciBpbnN0YWxsZWRNb2R1bGVzID0ge307XG5cbiBcdC8vIFRoZSByZXF1aXJlIGZ1bmN0aW9uXG4gXHRmdW5jdGlvbiBfX3dlYnBhY2tfcmVxdWlyZV9fKG1vZHVsZUlkKSB7XG5cbiBcdFx0Ly8gQ2hlY2sgaWYgbW9kdWxlIGlzIGluIGNhY2hlXG4gXHRcdGlmKGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdKSB7XG4gXHRcdFx0cmV0dXJuIGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdLmV4cG9ydHM7XG4gXHRcdH1cbiBcdFx0Ly8gQ3JlYXRlIGEgbmV3IG1vZHVsZSAoYW5kIHB1dCBpdCBpbnRvIHRoZSBjYWNoZSlcbiBcdFx0dmFyIG1vZHVsZSA9IGluc3RhbGxlZE1vZHVsZXNbbW9kdWxlSWRdID0ge1xuIFx0XHRcdGk6IG1vZHVsZUlkLFxuIFx0XHRcdGw6IGZhbHNlLFxuIFx0XHRcdGV4cG9ydHM6IHt9XG4gXHRcdH07XG5cbiBcdFx0Ly8gRXhlY3V0ZSB0aGUgbW9kdWxlIGZ1bmN0aW9uXG4gXHRcdG1vZHVsZXNbbW9kdWxlSWRdLmNhbGwobW9kdWxlLmV4cG9ydHMsIG1vZHVsZSwgbW9kdWxlLmV4cG9ydHMsIF9fd2VicGFja19yZXF1aXJlX18pO1xuXG4gXHRcdC8vIEZsYWcgdGhlIG1vZHVsZSBhcyBsb2FkZWRcbiBcdFx0bW9kdWxlLmwgPSB0cnVlO1xuXG4gXHRcdC8vIFJldHVybiB0aGUgZXhwb3J0cyBvZiB0aGUgbW9kdWxlXG4gXHRcdHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiBcdH1cblxuXG4gXHQvLyBleHBvc2UgdGhlIG1vZHVsZXMgb2JqZWN0IChfX3dlYnBhY2tfbW9kdWxlc19fKVxuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5tID0gbW9kdWxlcztcblxuIFx0Ly8gZXhwb3NlIHRoZSBtb2R1bGUgY2FjaGVcbiBcdF9fd2VicGFja19yZXF1aXJlX18uYyA9IGluc3RhbGxlZE1vZHVsZXM7XG5cbiBcdC8vIGRlZmluZSBnZXR0ZXIgZnVuY3Rpb24gZm9yIGhhcm1vbnkgZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5kID0gZnVuY3Rpb24oZXhwb3J0cywgbmFtZSwgZ2V0dGVyKSB7XG4gXHRcdGlmKCFfX3dlYnBhY2tfcmVxdWlyZV9fLm8oZXhwb3J0cywgbmFtZSkpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgbmFtZSwgeyBlbnVtZXJhYmxlOiB0cnVlLCBnZXQ6IGdldHRlciB9KTtcbiBcdFx0fVxuIFx0fTtcblxuIFx0Ly8gZGVmaW5lIF9fZXNNb2R1bGUgb24gZXhwb3J0c1xuIFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yID0gZnVuY3Rpb24oZXhwb3J0cykge1xuIFx0XHRpZih0eXBlb2YgU3ltYm9sICE9PSAndW5kZWZpbmVkJyAmJiBTeW1ib2wudG9TdHJpbmdUYWcpIHtcbiBcdFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgU3ltYm9sLnRvU3RyaW5nVGFnLCB7IHZhbHVlOiAnTW9kdWxlJyB9KTtcbiBcdFx0fVxuIFx0XHRPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgJ19fZXNNb2R1bGUnLCB7IHZhbHVlOiB0cnVlIH0pO1xuIFx0fTtcblxuIFx0Ly8gY3JlYXRlIGEgZmFrZSBuYW1lc3BhY2Ugb2JqZWN0XG4gXHQvLyBtb2RlICYgMTogdmFsdWUgaXMgYSBtb2R1bGUgaWQsIHJlcXVpcmUgaXRcbiBcdC8vIG1vZGUgJiAyOiBtZXJnZSBhbGwgcHJvcGVydGllcyBvZiB2YWx1ZSBpbnRvIHRoZSBuc1xuIFx0Ly8gbW9kZSAmIDQ6IHJldHVybiB2YWx1ZSB3aGVuIGFscmVhZHkgbnMgb2JqZWN0XG4gXHQvLyBtb2RlICYgOHwxOiBiZWhhdmUgbGlrZSByZXF1aXJlXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLnQgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZSkge1xuIFx0XHRpZihtb2RlICYgMSkgdmFsdWUgPSBfX3dlYnBhY2tfcmVxdWlyZV9fKHZhbHVlKTtcbiBcdFx0aWYobW9kZSAmIDgpIHJldHVybiB2YWx1ZTtcbiBcdFx0aWYoKG1vZGUgJiA0KSAmJiB0eXBlb2YgdmFsdWUgPT09ICdvYmplY3QnICYmIHZhbHVlICYmIHZhbHVlLl9fZXNNb2R1bGUpIHJldHVybiB2YWx1ZTtcbiBcdFx0dmFyIG5zID0gT2JqZWN0LmNyZWF0ZShudWxsKTtcbiBcdFx0X193ZWJwYWNrX3JlcXVpcmVfXy5yKG5zKTtcbiBcdFx0T2JqZWN0LmRlZmluZVByb3BlcnR5KG5zLCAnZGVmYXVsdCcsIHsgZW51bWVyYWJsZTogdHJ1ZSwgdmFsdWU6IHZhbHVlIH0pO1xuIFx0XHRpZihtb2RlICYgMiAmJiB0eXBlb2YgdmFsdWUgIT0gJ3N0cmluZycpIGZvcih2YXIga2V5IGluIHZhbHVlKSBfX3dlYnBhY2tfcmVxdWlyZV9fLmQobnMsIGtleSwgZnVuY3Rpb24oa2V5KSB7IHJldHVybiB2YWx1ZVtrZXldOyB9LmJpbmQobnVsbCwga2V5KSk7XG4gXHRcdHJldHVybiBucztcbiBcdH07XG5cbiBcdC8vIGdldERlZmF1bHRFeHBvcnQgZnVuY3Rpb24gZm9yIGNvbXBhdGliaWxpdHkgd2l0aCBub24taGFybW9ueSBtb2R1bGVzXG4gXHRfX3dlYnBhY2tfcmVxdWlyZV9fLm4gPSBmdW5jdGlvbihtb2R1bGUpIHtcbiBcdFx0dmFyIGdldHRlciA9IG1vZHVsZSAmJiBtb2R1bGUuX19lc01vZHVsZSA/XG4gXHRcdFx0ZnVuY3Rpb24gZ2V0RGVmYXVsdCgpIHsgcmV0dXJuIG1vZHVsZVsnZGVmYXVsdCddOyB9IDpcbiBcdFx0XHRmdW5jdGlvbiBnZXRNb2R1bGVFeHBvcnRzKCkgeyByZXR1cm4gbW9kdWxlOyB9O1xuIFx0XHRfX3dlYnBhY2tfcmVxdWlyZV9fLmQoZ2V0dGVyLCAnYScsIGdldHRlcik7XG4gXHRcdHJldHVybiBnZXR0ZXI7XG4gXHR9O1xuXG4gXHQvLyBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGxcbiBcdF9fd2VicGFja19yZXF1aXJlX18ubyA9IGZ1bmN0aW9uKG9iamVjdCwgcHJvcGVydHkpIHsgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmplY3QsIHByb3BlcnR5KTsgfTtcblxuIFx0Ly8gX193ZWJwYWNrX3B1YmxpY19wYXRoX19cbiBcdF9fd2VicGFja19yZXF1aXJlX18ucCA9IFwiXCI7XG5cblxuIFx0Ly8gTG9hZCBlbnRyeSBtb2R1bGUgYW5kIHJldHVybiBleHBvcnRzXG4gXHRyZXR1cm4gX193ZWJwYWNrX3JlcXVpcmVfXyhfX3dlYnBhY2tfcmVxdWlyZV9fLnMgPSAwKTtcbiIsIlwidXNlIHN0cmljdFwiO1xudmFyIF9fYXNzaWduID0gKHRoaXMgJiYgdGhpcy5fX2Fzc2lnbikgfHwgZnVuY3Rpb24gKCkge1xuICAgIF9fYXNzaWduID0gT2JqZWN0LmFzc2lnbiB8fCBmdW5jdGlvbih0KSB7XG4gICAgICAgIGZvciAodmFyIHMsIGkgPSAxLCBuID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IG47IGkrKykge1xuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSlcbiAgICAgICAgICAgICAgICB0W3BdID0gc1twXTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdDtcbiAgICB9O1xuICAgIHJldHVybiBfX2Fzc2lnbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xufTtcbnZhciBfX2dlbmVyYXRvciA9ICh0aGlzICYmIHRoaXMuX19nZW5lcmF0b3IpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBib2R5KSB7XG4gICAgdmFyIF8gPSB7IGxhYmVsOiAwLCBzZW50OiBmdW5jdGlvbigpIHsgaWYgKHRbMF0gJiAxKSB0aHJvdyB0WzFdOyByZXR1cm4gdFsxXTsgfSwgdHJ5czogW10sIG9wczogW10gfSwgZiwgeSwgdCwgZztcbiAgICByZXR1cm4gZyA9IHsgbmV4dDogdmVyYigwKSwgXCJ0aHJvd1wiOiB2ZXJiKDEpLCBcInJldHVyblwiOiB2ZXJiKDIpIH0sIHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiAoZ1tTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24oKSB7IHJldHVybiB0aGlzOyB9KSwgZztcbiAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgcmV0dXJuIGZ1bmN0aW9uICh2KSB7IHJldHVybiBzdGVwKFtuLCB2XSk7IH07IH1cbiAgICBmdW5jdGlvbiBzdGVwKG9wKSB7XG4gICAgICAgIGlmIChmKSB0aHJvdyBuZXcgVHlwZUVycm9yKFwiR2VuZXJhdG9yIGlzIGFscmVhZHkgZXhlY3V0aW5nLlwiKTtcbiAgICAgICAgd2hpbGUgKF8pIHRyeSB7XG4gICAgICAgICAgICBpZiAoZiA9IDEsIHkgJiYgKHQgPSBvcFswXSAmIDIgPyB5W1wicmV0dXJuXCJdIDogb3BbMF0gPyB5W1widGhyb3dcIl0gfHwgKCh0ID0geVtcInJldHVyblwiXSkgJiYgdC5jYWxsKHkpLCAwKSA6IHkubmV4dCkgJiYgISh0ID0gdC5jYWxsKHksIG9wWzFdKSkuZG9uZSkgcmV0dXJuIHQ7XG4gICAgICAgICAgICBpZiAoeSA9IDAsIHQpIG9wID0gW29wWzBdICYgMiwgdC52YWx1ZV07XG4gICAgICAgICAgICBzd2l0Y2ggKG9wWzBdKSB7XG4gICAgICAgICAgICAgICAgY2FzZSAwOiBjYXNlIDE6IHQgPSBvcDsgYnJlYWs7XG4gICAgICAgICAgICAgICAgY2FzZSA0OiBfLmxhYmVsKys7IHJldHVybiB7IHZhbHVlOiBvcFsxXSwgZG9uZTogZmFsc2UgfTtcbiAgICAgICAgICAgICAgICBjYXNlIDU6IF8ubGFiZWwrKzsgeSA9IG9wWzFdOyBvcCA9IFswXTsgY29udGludWU7XG4gICAgICAgICAgICAgICAgY2FzZSA3OiBvcCA9IF8ub3BzLnBvcCgpOyBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICAgICAgICAgIGlmICghKHQgPSBfLnRyeXMsIHQgPSB0Lmxlbmd0aCA+IDAgJiYgdFt0Lmxlbmd0aCAtIDFdKSAmJiAob3BbMF0gPT09IDYgfHwgb3BbMF0gPT09IDIpKSB7IF8gPSAwOyBjb250aW51ZTsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDMgJiYgKCF0IHx8IChvcFsxXSA+IHRbMF0gJiYgb3BbMV0gPCB0WzNdKSkpIHsgXy5sYWJlbCA9IG9wWzFdOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAob3BbMF0gPT09IDYgJiYgXy5sYWJlbCA8IHRbMV0pIHsgXy5sYWJlbCA9IHRbMV07IHQgPSBvcDsgYnJlYWs7IH1cbiAgICAgICAgICAgICAgICAgICAgaWYgKHQgJiYgXy5sYWJlbCA8IHRbMl0pIHsgXy5sYWJlbCA9IHRbMl07IF8ub3BzLnB1c2gob3ApOyBicmVhazsgfVxuICAgICAgICAgICAgICAgICAgICBpZiAodFsyXSkgXy5vcHMucG9wKCk7XG4gICAgICAgICAgICAgICAgICAgIF8udHJ5cy5wb3AoKTsgY29udGludWU7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBvcCA9IGJvZHkuY2FsbCh0aGlzQXJnLCBfKTtcbiAgICAgICAgfSBjYXRjaCAoZSkgeyBvcCA9IFs2LCBlXTsgeSA9IDA7IH0gZmluYWxseSB7IGYgPSB0ID0gMDsgfVxuICAgICAgICBpZiAob3BbMF0gJiA1KSB0aHJvdyBvcFsxXTsgcmV0dXJuIHsgdmFsdWU6IG9wWzBdID8gb3BbMV0gOiB2b2lkIDAsIGRvbmU6IHRydWUgfTtcbiAgICB9XG59O1xudmFyIF9fdmFsdWVzID0gKHRoaXMgJiYgdGhpcy5fX3ZhbHVlcykgfHwgZnVuY3Rpb24gKG8pIHtcbiAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl0sIGkgPSAwO1xuICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xuICAgIHJldHVybiB7XG4gICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XG4gICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XG4gICAgICAgIH1cbiAgICB9O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbnZhciBjc3Nlc2MgPSByZXF1aXJlKFwiY3NzZXNjXCIpO1xudmFyIExpbWl0O1xuKGZ1bmN0aW9uIChMaW1pdCkge1xuICAgIExpbWl0W0xpbWl0W1wiQWxsXCJdID0gMF0gPSBcIkFsbFwiO1xuICAgIExpbWl0W0xpbWl0W1wiVHdvXCJdID0gMV0gPSBcIlR3b1wiO1xuICAgIExpbWl0W0xpbWl0W1wiT25lXCJdID0gMl0gPSBcIk9uZVwiO1xufSkoTGltaXQgfHwgKExpbWl0ID0ge30pKTtcbnZhciBjb25maWc7XG52YXIgcm9vdERvY3VtZW50O1xuZnVuY3Rpb24gZGVmYXVsdF8xKGlucHV0LCBvcHRpb25zKSB7XG4gICAgaWYgKGlucHV0Lm5vZGVUeXBlICE9PSBOb2RlLkVMRU1FTlRfTk9ERSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBnZW5lcmF0ZSBDU1Mgc2VsZWN0b3IgZm9yIG5vbi1lbGVtZW50IG5vZGUgdHlwZS5cIik7XG4gICAgfVxuICAgIGlmICgnaHRtbCcgPT09IGlucHV0LnRhZ05hbWUudG9Mb3dlckNhc2UoKSkge1xuICAgICAgICByZXR1cm4gaW5wdXQudGFnTmFtZS50b0xvd2VyQ2FzZSgpO1xuICAgIH1cbiAgICB2YXIgZGVmYXVsdHMgPSB7XG4gICAgICAgIHJvb3Q6IGRvY3VtZW50LmJvZHksXG4gICAgICAgIGlkTmFtZTogZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICAgIGNsYXNzTmFtZTogZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuIHRydWU7IH0sXG4gICAgICAgIHRhZ05hbWU6IGZ1bmN0aW9uIChuYW1lKSB7IHJldHVybiB0cnVlOyB9LFxuICAgICAgICBzZWVkTWluTGVuZ3RoOiAxLFxuICAgICAgICBvcHRpbWl6ZWRNaW5MZW5ndGg6IDIsXG4gICAgICAgIHRocmVzaG9sZDogMTAwMCxcbiAgICB9O1xuICAgIGNvbmZpZyA9IF9fYXNzaWduKHt9LCBkZWZhdWx0cywgb3B0aW9ucyk7XG4gICAgcm9vdERvY3VtZW50ID0gZmluZFJvb3REb2N1bWVudChjb25maWcucm9vdCwgZGVmYXVsdHMpO1xuICAgIHZhciBwYXRoID0gYm90dG9tVXBTZWFyY2goaW5wdXQsIExpbWl0LkFsbCwgZnVuY3Rpb24gKCkge1xuICAgICAgICByZXR1cm4gYm90dG9tVXBTZWFyY2goaW5wdXQsIExpbWl0LlR3bywgZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmV0dXJuIGJvdHRvbVVwU2VhcmNoKGlucHV0LCBMaW1pdC5PbmUpO1xuICAgICAgICB9KTtcbiAgICB9KTtcbiAgICBpZiAocGF0aCkge1xuICAgICAgICB2YXIgb3B0aW1pemVkID0gc29ydChvcHRpbWl6ZShwYXRoLCBpbnB1dCkpO1xuICAgICAgICBpZiAob3B0aW1pemVkLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIHBhdGggPSBvcHRpbWl6ZWRbMF07XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHNlbGVjdG9yKHBhdGgpO1xuICAgIH1cbiAgICBlbHNlIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKFwiU2VsZWN0b3Igd2FzIG5vdCBmb3VuZC5cIik7XG4gICAgfVxufVxuZXhwb3J0cy5kZWZhdWx0ID0gZGVmYXVsdF8xO1xuZnVuY3Rpb24gZmluZFJvb3REb2N1bWVudChyb290Tm9kZSwgZGVmYXVsdHMpIHtcbiAgICBpZiAocm9vdE5vZGUubm9kZVR5cGUgPT09IE5vZGUuRE9DVU1FTlRfTk9ERSkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGU7XG4gICAgfVxuICAgIGlmIChyb290Tm9kZSA9PT0gZGVmYXVsdHMucm9vdCkge1xuICAgICAgICByZXR1cm4gcm9vdE5vZGUub3duZXJEb2N1bWVudDtcbiAgICB9XG4gICAgcmV0dXJuIHJvb3ROb2RlO1xufVxuZnVuY3Rpb24gYm90dG9tVXBTZWFyY2goaW5wdXQsIGxpbWl0LCBmYWxsYmFjaykge1xuICAgIHZhciBwYXRoID0gbnVsbDtcbiAgICB2YXIgc3RhY2sgPSBbXTtcbiAgICB2YXIgY3VycmVudCA9IGlucHV0O1xuICAgIHZhciBpID0gMDtcbiAgICB2YXIgX2xvb3BfMSA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGxldmVsID0gbWF5YmUoaWQoY3VycmVudCkpIHx8IG1heWJlLmFwcGx5KHZvaWQgMCwgY2xhc3NOYW1lcyhjdXJyZW50KSkgfHwgbWF5YmUodGFnTmFtZShjdXJyZW50KSkgfHwgW2FueSgpXTtcbiAgICAgICAgdmFyIG50aCA9IGluZGV4KGN1cnJlbnQpO1xuICAgICAgICBpZiAobGltaXQgPT09IExpbWl0LkFsbCkge1xuICAgICAgICAgICAgaWYgKG50aCkge1xuICAgICAgICAgICAgICAgIGxldmVsID0gbGV2ZWwuY29uY2F0KGxldmVsLmZpbHRlcihkaXNwZW5zYWJsZU50aCkubWFwKGZ1bmN0aW9uIChub2RlKSB7IHJldHVybiBudGhDaGlsZChub2RlLCBudGgpOyB9KSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSBpZiAobGltaXQgPT09IExpbWl0LlR3bykge1xuICAgICAgICAgICAgbGV2ZWwgPSBsZXZlbC5zbGljZSgwLCAxKTtcbiAgICAgICAgICAgIGlmIChudGgpIHtcbiAgICAgICAgICAgICAgICBsZXZlbCA9IGxldmVsLmNvbmNhdChsZXZlbC5maWx0ZXIoZGlzcGVuc2FibGVOdGgpLm1hcChmdW5jdGlvbiAobm9kZSkgeyByZXR1cm4gbnRoQ2hpbGQobm9kZSwgbnRoKTsgfSkpO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGVsc2UgaWYgKGxpbWl0ID09PSBMaW1pdC5PbmUpIHtcbiAgICAgICAgICAgIHZhciBub2RlID0gKGxldmVsID0gbGV2ZWwuc2xpY2UoMCwgMSkpWzBdO1xuICAgICAgICAgICAgaWYgKG50aCAmJiBkaXNwZW5zYWJsZU50aChub2RlKSkge1xuICAgICAgICAgICAgICAgIGxldmVsID0gW250aENoaWxkKG5vZGUsIG50aCldO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgbGV2ZWxfMSA9IGxldmVsOyBfaSA8IGxldmVsXzEubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgICAgICB2YXIgbm9kZSA9IGxldmVsXzFbX2ldO1xuICAgICAgICAgICAgbm9kZS5sZXZlbCA9IGk7XG4gICAgICAgIH1cbiAgICAgICAgc3RhY2sucHVzaChsZXZlbCk7XG4gICAgICAgIGlmIChzdGFjay5sZW5ndGggPj0gY29uZmlnLnNlZWRNaW5MZW5ndGgpIHtcbiAgICAgICAgICAgIHBhdGggPSBmaW5kVW5pcXVlUGF0aChzdGFjaywgZmFsbGJhY2spO1xuICAgICAgICAgICAgaWYgKHBhdGgpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJicmVha1wiO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGN1cnJlbnQgPSBjdXJyZW50LnBhcmVudEVsZW1lbnQ7XG4gICAgICAgIGkrKztcbiAgICB9O1xuICAgIHdoaWxlIChjdXJyZW50ICYmIGN1cnJlbnQgIT09IGNvbmZpZy5yb290LnBhcmVudEVsZW1lbnQpIHtcbiAgICAgICAgdmFyIHN0YXRlXzEgPSBfbG9vcF8xKCk7XG4gICAgICAgIGlmIChzdGF0ZV8xID09PSBcImJyZWFrXCIpXG4gICAgICAgICAgICBicmVhaztcbiAgICB9XG4gICAgaWYgKCFwYXRoKSB7XG4gICAgICAgIHBhdGggPSBmaW5kVW5pcXVlUGF0aChzdGFjaywgZmFsbGJhY2spO1xuICAgIH1cbiAgICByZXR1cm4gcGF0aDtcbn1cbmZ1bmN0aW9uIGZpbmRVbmlxdWVQYXRoKHN0YWNrLCBmYWxsYmFjaykge1xuICAgIHZhciBwYXRocyA9IHNvcnQoY29tYmluYXRpb25zKHN0YWNrKSk7XG4gICAgaWYgKHBhdGhzLmxlbmd0aCA+IGNvbmZpZy50aHJlc2hvbGQpIHtcbiAgICAgICAgcmV0dXJuIGZhbGxiYWNrID8gZmFsbGJhY2soKSA6IG51bGw7XG4gICAgfVxuICAgIGZvciAodmFyIF9pID0gMCwgcGF0aHNfMSA9IHBhdGhzOyBfaSA8IHBhdGhzXzEubGVuZ3RoOyBfaSsrKSB7XG4gICAgICAgIHZhciBjYW5kaWRhdGUgPSBwYXRoc18xW19pXTtcbiAgICAgICAgaWYgKHVuaXF1ZShjYW5kaWRhdGUpKSB7XG4gICAgICAgICAgICByZXR1cm4gY2FuZGlkYXRlO1xuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gc2VsZWN0b3IocGF0aCkge1xuICAgIHZhciBub2RlID0gcGF0aFswXTtcbiAgICB2YXIgcXVlcnkgPSBub2RlLm5hbWU7XG4gICAgZm9yICh2YXIgaSA9IDE7IGkgPCBwYXRoLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhciBsZXZlbCA9IHBhdGhbaV0ubGV2ZWwgfHwgMDtcbiAgICAgICAgaWYgKG5vZGUubGV2ZWwgPT09IGxldmVsIC0gMSkge1xuICAgICAgICAgICAgcXVlcnkgPSBwYXRoW2ldLm5hbWUgKyBcIiA+IFwiICsgcXVlcnk7XG4gICAgICAgIH1cbiAgICAgICAgZWxzZSB7XG4gICAgICAgICAgICBxdWVyeSA9IHBhdGhbaV0ubmFtZSArIFwiIFwiICsgcXVlcnk7XG4gICAgICAgIH1cbiAgICAgICAgbm9kZSA9IHBhdGhbaV07XG4gICAgfVxuICAgIHJldHVybiBxdWVyeTtcbn1cbmZ1bmN0aW9uIHBlbmFsdHkocGF0aCkge1xuICAgIHJldHVybiBwYXRoLm1hcChmdW5jdGlvbiAobm9kZSkgeyByZXR1cm4gbm9kZS5wZW5hbHR5OyB9KS5yZWR1Y2UoZnVuY3Rpb24gKGFjYywgaSkgeyByZXR1cm4gYWNjICsgaTsgfSwgMCk7XG59XG5mdW5jdGlvbiB1bmlxdWUocGF0aCkge1xuICAgIHN3aXRjaCAocm9vdERvY3VtZW50LnF1ZXJ5U2VsZWN0b3JBbGwoc2VsZWN0b3IocGF0aCkpLmxlbmd0aCkge1xuICAgICAgICBjYXNlIDA6XG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJDYW4ndCBzZWxlY3QgYW55IG5vZGUgd2l0aCB0aGlzIHNlbGVjdG9yOiBcIiArIHNlbGVjdG9yKHBhdGgpKTtcbiAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgICAgIGRlZmF1bHQ6XG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxufVxuZnVuY3Rpb24gaWQoaW5wdXQpIHtcbiAgICB2YXIgZWxlbWVudElkID0gaW5wdXQuZ2V0QXR0cmlidXRlKCdpZCcpO1xuICAgIGlmIChlbGVtZW50SWQgJiYgY29uZmlnLmlkTmFtZShlbGVtZW50SWQpKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBuYW1lOiAnIycgKyBjc3Nlc2MoZWxlbWVudElkLCB7IGlzSWRlbnRpZmllcjogdHJ1ZSB9KSxcbiAgICAgICAgICAgIHBlbmFsdHk6IDAsXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gY2xhc3NOYW1lcyhpbnB1dCkge1xuICAgIHZhciBuYW1lcyA9IEFycmF5LmZyb20oaW5wdXQuY2xhc3NMaXN0KVxuICAgICAgICAuZmlsdGVyKGNvbmZpZy5jbGFzc05hbWUpO1xuICAgIHJldHVybiBuYW1lcy5tYXAoZnVuY3Rpb24gKG5hbWUpIHsgcmV0dXJuICh7XG4gICAgICAgIG5hbWU6ICcuJyArIGNzc2VzYyhuYW1lLCB7IGlzSWRlbnRpZmllcjogdHJ1ZSB9KSxcbiAgICAgICAgcGVuYWx0eTogMVxuICAgIH0pOyB9KTtcbn1cbmZ1bmN0aW9uIHRhZ05hbWUoaW5wdXQpIHtcbiAgICB2YXIgbmFtZSA9IGlucHV0LnRhZ05hbWUudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAoY29uZmlnLnRhZ05hbWUobmFtZSkpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgICAgICBwZW5hbHR5OiAyXG4gICAgICAgIH07XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gYW55KCkge1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6ICcqJyxcbiAgICAgICAgcGVuYWx0eTogM1xuICAgIH07XG59XG5mdW5jdGlvbiBpbmRleChpbnB1dCkge1xuICAgIHZhciBwYXJlbnQgPSBpbnB1dC5wYXJlbnROb2RlO1xuICAgIGlmICghcGFyZW50KSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgY2hpbGQgPSBwYXJlbnQuZmlyc3RDaGlsZDtcbiAgICBpZiAoIWNoaWxkKSB7XG4gICAgICAgIHJldHVybiBudWxsO1xuICAgIH1cbiAgICB2YXIgaSA9IDA7XG4gICAgd2hpbGUgKGNoaWxkKSB7XG4gICAgICAgIGlmIChjaGlsZC5ub2RlVHlwZSA9PT0gTm9kZS5FTEVNRU5UX05PREUpIHtcbiAgICAgICAgICAgIGkrKztcbiAgICAgICAgfVxuICAgICAgICBpZiAoY2hpbGQgPT09IGlucHV0KSB7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgfVxuICAgICAgICBjaGlsZCA9IGNoaWxkLm5leHRTaWJsaW5nO1xuICAgIH1cbiAgICByZXR1cm4gaTtcbn1cbmZ1bmN0aW9uIG50aENoaWxkKG5vZGUsIGkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBuYW1lOiBub2RlLm5hbWUgKyAoXCI6bnRoLWNoaWxkKFwiICsgaSArIFwiKVwiKSxcbiAgICAgICAgcGVuYWx0eTogbm9kZS5wZW5hbHR5ICsgMVxuICAgIH07XG59XG5mdW5jdGlvbiBkaXNwZW5zYWJsZU50aChub2RlKSB7XG4gICAgcmV0dXJuIG5vZGUubmFtZSAhPT0gJ2h0bWwnICYmICFub2RlLm5hbWUuc3RhcnRzV2l0aCgnIycpO1xufVxuZnVuY3Rpb24gbWF5YmUoKSB7XG4gICAgdmFyIGxldmVsID0gW107XG4gICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcbiAgICAgICAgbGV2ZWxbX2ldID0gYXJndW1lbnRzW19pXTtcbiAgICB9XG4gICAgdmFyIGxpc3QgPSBsZXZlbC5maWx0ZXIobm90RW1wdHkpO1xuICAgIGlmIChsaXN0Lmxlbmd0aCA+IDApIHtcbiAgICAgICAgcmV0dXJuIGxpc3Q7XG4gICAgfVxuICAgIHJldHVybiBudWxsO1xufVxuZnVuY3Rpb24gbm90RW1wdHkodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgIT09IG51bGwgJiYgdmFsdWUgIT09IHVuZGVmaW5lZDtcbn1cbmZ1bmN0aW9uIGNvbWJpbmF0aW9ucyhzdGFjaywgcGF0aCkge1xuICAgIHZhciBfaSwgX2EsIG5vZGU7XG4gICAgaWYgKHBhdGggPT09IHZvaWQgMCkgeyBwYXRoID0gW107IH1cbiAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9iKSB7XG4gICAgICAgIHN3aXRjaCAoX2IubGFiZWwpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBpZiAoIShzdGFjay5sZW5ndGggPiAwKSkgcmV0dXJuIFszIC8qYnJlYWsqLywgNV07XG4gICAgICAgICAgICAgICAgX2kgPSAwLCBfYSA9IHN0YWNrWzBdO1xuICAgICAgICAgICAgICAgIF9iLmxhYmVsID0gMTtcbiAgICAgICAgICAgIGNhc2UgMTpcbiAgICAgICAgICAgICAgICBpZiAoIShfaSA8IF9hLmxlbmd0aCkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDRdO1xuICAgICAgICAgICAgICAgIG5vZGUgPSBfYVtfaV07XG4gICAgICAgICAgICAgICAgcmV0dXJuIFs1IC8qeWllbGQqKi8sIF9fdmFsdWVzKGNvbWJpbmF0aW9ucyhzdGFjay5zbGljZSgxLCBzdGFjay5sZW5ndGgpLCBwYXRoLmNvbmNhdChub2RlKSkpXTtcbiAgICAgICAgICAgIGNhc2UgMjpcbiAgICAgICAgICAgICAgICBfYi5zZW50KCk7XG4gICAgICAgICAgICAgICAgX2IubGFiZWwgPSAzO1xuICAgICAgICAgICAgY2FzZSAzOlxuICAgICAgICAgICAgICAgIF9pKys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgMV07XG4gICAgICAgICAgICBjYXNlIDQ6IHJldHVybiBbMyAvKmJyZWFrKi8sIDddO1xuICAgICAgICAgICAgY2FzZSA1OiByZXR1cm4gWzQgLyp5aWVsZCovLCBwYXRoXTtcbiAgICAgICAgICAgIGNhc2UgNjpcbiAgICAgICAgICAgICAgICBfYi5zZW50KCk7XG4gICAgICAgICAgICAgICAgX2IubGFiZWwgPSA3O1xuICAgICAgICAgICAgY2FzZSA3OiByZXR1cm4gWzIgLypyZXR1cm4qL107XG4gICAgICAgIH1cbiAgICB9KTtcbn1cbmZ1bmN0aW9uIHNvcnQocGF0aHMpIHtcbiAgICByZXR1cm4gQXJyYXkuZnJvbShwYXRocykuc29ydChmdW5jdGlvbiAoYSwgYikgeyByZXR1cm4gcGVuYWx0eShhKSAtIHBlbmFsdHkoYik7IH0pO1xufVxuZnVuY3Rpb24gb3B0aW1pemUocGF0aCwgaW5wdXQpIHtcbiAgICB2YXIgaSwgbmV3UGF0aDtcbiAgICByZXR1cm4gX19nZW5lcmF0b3IodGhpcywgZnVuY3Rpb24gKF9hKSB7XG4gICAgICAgIHN3aXRjaCAoX2EubGFiZWwpIHtcbiAgICAgICAgICAgIGNhc2UgMDpcbiAgICAgICAgICAgICAgICBpZiAoIShwYXRoLmxlbmd0aCA+IDIgJiYgcGF0aC5sZW5ndGggPiBjb25maWcub3B0aW1pemVkTWluTGVuZ3RoKSkgcmV0dXJuIFszIC8qYnJlYWsqLywgNV07XG4gICAgICAgICAgICAgICAgaSA9IDE7XG4gICAgICAgICAgICAgICAgX2EubGFiZWwgPSAxO1xuICAgICAgICAgICAgY2FzZSAxOlxuICAgICAgICAgICAgICAgIGlmICghKGkgPCBwYXRoLmxlbmd0aCAtIDEpKSByZXR1cm4gWzMgLypicmVhayovLCA1XTtcbiAgICAgICAgICAgICAgICBuZXdQYXRoID0gcGF0aC5zbGljZSgpO1xuICAgICAgICAgICAgICAgIG5ld1BhdGguc3BsaWNlKGksIDEpO1xuICAgICAgICAgICAgICAgIGlmICghKHVuaXF1ZShuZXdQYXRoKSAmJiBzYW1lKG5ld1BhdGgsIGlucHV0KSkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDRdO1xuICAgICAgICAgICAgICAgIHJldHVybiBbNCAvKnlpZWxkKi8sIG5ld1BhdGhdO1xuICAgICAgICAgICAgY2FzZSAyOlxuICAgICAgICAgICAgICAgIF9hLnNlbnQoKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gWzUgLyp5aWVsZCoqLywgX192YWx1ZXMob3B0aW1pemUobmV3UGF0aCwgaW5wdXQpKV07XG4gICAgICAgICAgICBjYXNlIDM6XG4gICAgICAgICAgICAgICAgX2Euc2VudCgpO1xuICAgICAgICAgICAgICAgIF9hLmxhYmVsID0gNDtcbiAgICAgICAgICAgIGNhc2UgNDpcbiAgICAgICAgICAgICAgICBpKys7XG4gICAgICAgICAgICAgICAgcmV0dXJuIFszIC8qYnJlYWsqLywgMV07XG4gICAgICAgICAgICBjYXNlIDU6IHJldHVybiBbMiAvKnJldHVybiovXTtcbiAgICAgICAgfVxuICAgIH0pO1xufVxuZnVuY3Rpb24gc2FtZShwYXRoLCBpbnB1dCkge1xuICAgIHJldHVybiByb290RG9jdW1lbnQucXVlcnlTZWxlY3RvcihzZWxlY3RvcihwYXRoKSkgPT09IGlucHV0O1xufVxuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguanMubWFwIiwiLyohIGh0dHBzOi8vbXRocy5iZS9jc3Nlc2MgdjEuMC4xIGJ5IEBtYXRoaWFzICovXG4ndXNlIHN0cmljdCc7XG5cbnZhciBvYmplY3QgPSB7fTtcbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdC5oYXNPd25Qcm9wZXJ0eTtcbnZhciBtZXJnZSA9IGZ1bmN0aW9uIG1lcmdlKG9wdGlvbnMsIGRlZmF1bHRzKSB7XG5cdGlmICghb3B0aW9ucykge1xuXHRcdHJldHVybiBkZWZhdWx0cztcblx0fVxuXHR2YXIgcmVzdWx0ID0ge307XG5cdGZvciAodmFyIGtleSBpbiBkZWZhdWx0cykge1xuXHRcdC8vIGBpZiAoZGVmYXVsdHMuaGFzT3duUHJvcGVydHkoa2V5KSB7IOKApiB9YCBpcyBub3QgbmVlZGVkIGhlcmUsIHNpbmNlXG5cdFx0Ly8gb25seSByZWNvZ25pemVkIG9wdGlvbiBuYW1lcyBhcmUgdXNlZC5cblx0XHRyZXN1bHRba2V5XSA9IGhhc093blByb3BlcnR5LmNhbGwob3B0aW9ucywga2V5KSA/IG9wdGlvbnNba2V5XSA6IGRlZmF1bHRzW2tleV07XG5cdH1cblx0cmV0dXJuIHJlc3VsdDtcbn07XG5cbnZhciByZWdleEFueVNpbmdsZUVzY2FwZSA9IC9bIC0sXFwuXFwvOy1AXFxbLVxcXmBcXHstfl0vO1xudmFyIHJlZ2V4U2luZ2xlRXNjYXBlID0gL1sgLSxcXC5cXC87LUBcXFtcXF1cXF5gXFx7LX5dLztcbnZhciByZWdleEFsd2F5c0VzY2FwZSA9IC9bJ1wiXFxcXF0vO1xudmFyIHJlZ2V4RXhjZXNzaXZlU3BhY2VzID0gLyhefFxcXFwrKT8oXFxcXFtBLUYwLTldezEsNn0pXFx4MjAoPyFbYS1mQS1GMC05XFx4MjBdKS9nO1xuXG4vLyBodHRwczovL21hdGhpYXNieW5lbnMuYmUvbm90ZXMvY3NzLWVzY2FwZXMjY3NzXG52YXIgY3NzZXNjID0gZnVuY3Rpb24gY3NzZXNjKHN0cmluZywgb3B0aW9ucykge1xuXHRvcHRpb25zID0gbWVyZ2Uob3B0aW9ucywgY3NzZXNjLm9wdGlvbnMpO1xuXHRpZiAob3B0aW9ucy5xdW90ZXMgIT0gJ3NpbmdsZScgJiYgb3B0aW9ucy5xdW90ZXMgIT0gJ2RvdWJsZScpIHtcblx0XHRvcHRpb25zLnF1b3RlcyA9ICdzaW5nbGUnO1xuXHR9XG5cdHZhciBxdW90ZSA9IG9wdGlvbnMucXVvdGVzID09ICdkb3VibGUnID8gJ1wiJyA6ICdcXCcnO1xuXHR2YXIgaXNJZGVudGlmaWVyID0gb3B0aW9ucy5pc0lkZW50aWZpZXI7XG5cblx0dmFyIGZpcnN0Q2hhciA9IHN0cmluZy5jaGFyQXQoMCk7XG5cdHZhciBvdXRwdXQgPSAnJztcblx0dmFyIGNvdW50ZXIgPSAwO1xuXHR2YXIgbGVuZ3RoID0gc3RyaW5nLmxlbmd0aDtcblx0d2hpbGUgKGNvdW50ZXIgPCBsZW5ndGgpIHtcblx0XHR2YXIgY2hhcmFjdGVyID0gc3RyaW5nLmNoYXJBdChjb3VudGVyKyspO1xuXHRcdHZhciBjb2RlUG9pbnQgPSBjaGFyYWN0ZXIuY2hhckNvZGVBdCgpO1xuXHRcdHZhciB2YWx1ZSA9IHZvaWQgMDtcblx0XHQvLyBJZiBpdOKAmXMgbm90IGEgcHJpbnRhYmxlIEFTQ0lJIGNoYXJhY3RlcuKAplxuXHRcdGlmIChjb2RlUG9pbnQgPCAweDIwIHx8IGNvZGVQb2ludCA+IDB4N0UpIHtcblx0XHRcdGlmIChjb2RlUG9pbnQgPj0gMHhEODAwICYmIGNvZGVQb2ludCA8PSAweERCRkYgJiYgY291bnRlciA8IGxlbmd0aCkge1xuXHRcdFx0XHQvLyBJdOKAmXMgYSBoaWdoIHN1cnJvZ2F0ZSwgYW5kIHRoZXJlIGlzIGEgbmV4dCBjaGFyYWN0ZXIuXG5cdFx0XHRcdHZhciBleHRyYSA9IHN0cmluZy5jaGFyQ29kZUF0KGNvdW50ZXIrKyk7XG5cdFx0XHRcdGlmICgoZXh0cmEgJiAweEZDMDApID09IDB4REMwMCkge1xuXHRcdFx0XHRcdC8vIG5leHQgY2hhcmFjdGVyIGlzIGxvdyBzdXJyb2dhdGVcblx0XHRcdFx0XHRjb2RlUG9pbnQgPSAoKGNvZGVQb2ludCAmIDB4M0ZGKSA8PCAxMCkgKyAoZXh0cmEgJiAweDNGRikgKyAweDEwMDAwO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdC8vIEl04oCZcyBhbiB1bm1hdGNoZWQgc3Vycm9nYXRlOyBvbmx5IGFwcGVuZCB0aGlzIGNvZGUgdW5pdCwgaW4gY2FzZVxuXHRcdFx0XHRcdC8vIHRoZSBuZXh0IGNvZGUgdW5pdCBpcyB0aGUgaGlnaCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpci5cblx0XHRcdFx0XHRjb3VudGVyLS07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHZhbHVlID0gJ1xcXFwnICsgY29kZVBvaW50LnRvU3RyaW5nKDE2KS50b1VwcGVyQ2FzZSgpICsgJyAnO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAob3B0aW9ucy5lc2NhcGVFdmVyeXRoaW5nKSB7XG5cdFx0XHRcdGlmIChyZWdleEFueVNpbmdsZUVzY2FwZS50ZXN0KGNoYXJhY3RlcikpIHtcblx0XHRcdFx0XHR2YWx1ZSA9ICdcXFxcJyArIGNoYXJhY3Rlcjtcblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHR2YWx1ZSA9ICdcXFxcJyArIGNvZGVQb2ludC50b1N0cmluZygxNikudG9VcHBlckNhc2UoKSArICcgJztcblx0XHRcdFx0fVxuXHRcdFx0XHQvLyBOb3RlOiBgOmAgY291bGQgYmUgZXNjYXBlZCBhcyBgXFw6YCwgYnV0IHRoYXQgZmFpbHMgaW4gSUUgPCA4LlxuXHRcdFx0fSBlbHNlIGlmICgvW1xcdFxcblxcZlxcclxceDBCOl0vLnRlc3QoY2hhcmFjdGVyKSkge1xuXHRcdFx0XHRpZiAoIWlzSWRlbnRpZmllciAmJiBjaGFyYWN0ZXIgPT0gJzonKSB7XG5cdFx0XHRcdFx0dmFsdWUgPSBjaGFyYWN0ZXI7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dmFsdWUgPSAnXFxcXCcgKyBjb2RlUG9pbnQudG9TdHJpbmcoMTYpLnRvVXBwZXJDYXNlKCkgKyAnICc7XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSBpZiAoY2hhcmFjdGVyID09ICdcXFxcJyB8fCAhaXNJZGVudGlmaWVyICYmIChjaGFyYWN0ZXIgPT0gJ1wiJyAmJiBxdW90ZSA9PSBjaGFyYWN0ZXIgfHwgY2hhcmFjdGVyID09ICdcXCcnICYmIHF1b3RlID09IGNoYXJhY3RlcikgfHwgaXNJZGVudGlmaWVyICYmIHJlZ2V4U2luZ2xlRXNjYXBlLnRlc3QoY2hhcmFjdGVyKSkge1xuXHRcdFx0XHR2YWx1ZSA9ICdcXFxcJyArIGNoYXJhY3Rlcjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHZhbHVlID0gY2hhcmFjdGVyO1xuXHRcdFx0fVxuXHRcdH1cblx0XHRvdXRwdXQgKz0gdmFsdWU7XG5cdH1cblxuXHRpZiAoaXNJZGVudGlmaWVyKSB7XG5cdFx0aWYgKC9eXy8udGVzdChvdXRwdXQpKSB7XG5cdFx0XHQvLyBQcmV2ZW50IElFNiBmcm9tIGlnbm9yaW5nIHRoZSBydWxlIGFsdG9nZXRoZXIgKGluIGNhc2UgdGhpcyBpcyBmb3IgYW5cblx0XHRcdC8vIGlkZW50aWZpZXIgdXNlZCBhcyBhIHNlbGVjdG9yKVxuXHRcdFx0b3V0cHV0ID0gJ1xcXFxfJyArIG91dHB1dC5zbGljZSgxKTtcblx0XHR9IGVsc2UgaWYgKC9eLVstXFxkXS8udGVzdChvdXRwdXQpKSB7XG5cdFx0XHRvdXRwdXQgPSAnXFxcXC0nICsgb3V0cHV0LnNsaWNlKDEpO1xuXHRcdH0gZWxzZSBpZiAoL1xcZC8udGVzdChmaXJzdENoYXIpKSB7XG5cdFx0XHRvdXRwdXQgPSAnXFxcXDMnICsgZmlyc3RDaGFyICsgJyAnICsgb3V0cHV0LnNsaWNlKDEpO1xuXHRcdH1cblx0fVxuXG5cdC8vIFJlbW92ZSBzcGFjZXMgYWZ0ZXIgYFxcSEVYYCBlc2NhcGVzIHRoYXQgYXJlIG5vdCBmb2xsb3dlZCBieSBhIGhleCBkaWdpdCxcblx0Ly8gc2luY2UgdGhleeKAmXJlIHJlZHVuZGFudC4gTm90ZSB0aGF0IHRoaXMgaXMgb25seSBwb3NzaWJsZSBpZiB0aGUgZXNjYXBlXG5cdC8vIHNlcXVlbmNlIGlzbuKAmXQgcHJlY2VkZWQgYnkgYW4gb2RkIG51bWJlciBvZiBiYWNrc2xhc2hlcy5cblx0b3V0cHV0ID0gb3V0cHV0LnJlcGxhY2UocmVnZXhFeGNlc3NpdmVTcGFjZXMsIGZ1bmN0aW9uICgkMCwgJDEsICQyKSB7XG5cdFx0aWYgKCQxICYmICQxLmxlbmd0aCAlIDIpIHtcblx0XHRcdC8vIEl04oCZcyBub3Qgc2FmZSB0byByZW1vdmUgdGhlIHNwYWNlLCBzbyBkb27igJl0LlxuXHRcdFx0cmV0dXJuICQwO1xuXHRcdH1cblx0XHQvLyBTdHJpcCB0aGUgc3BhY2UuXG5cdFx0cmV0dXJuICgkMSB8fCAnJykgKyAkMjtcblx0fSk7XG5cblx0aWYgKCFpc0lkZW50aWZpZXIgJiYgb3B0aW9ucy53cmFwKSB7XG5cdFx0cmV0dXJuIHF1b3RlICsgb3V0cHV0ICsgcXVvdGU7XG5cdH1cblx0cmV0dXJuIG91dHB1dDtcbn07XG5cbi8vIEV4cG9zZSBkZWZhdWx0IG9wdGlvbnMgKHNvIHRoZXkgY2FuIGJlIG92ZXJyaWRkZW4gZ2xvYmFsbHkpLlxuY3NzZXNjLm9wdGlvbnMgPSB7XG5cdCdlc2NhcGVFdmVyeXRoaW5nJzogZmFsc2UsXG5cdCdpc0lkZW50aWZpZXInOiBmYWxzZSxcblx0J3F1b3Rlcyc6ICdzaW5nbGUnLFxuXHQnd3JhcCc6IGZhbHNlXG59O1xuXG5jc3Nlc2MudmVyc2lvbiA9ICcxLjAuMSc7XG5cbm1vZHVsZS5leHBvcnRzID0gY3NzZXNjO1xuIiwiXCJ1c2Ugc3RyaWN0XCI7XG52YXIgX19hd2FpdGVyID0gKHRoaXMgJiYgdGhpcy5fX2F3YWl0ZXIpIHx8IGZ1bmN0aW9uICh0aGlzQXJnLCBfYXJndW1lbnRzLCBQLCBnZW5lcmF0b3IpIHtcbiAgICByZXR1cm4gbmV3IChQIHx8IChQID0gUHJvbWlzZSkpKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgZnVuY3Rpb24gZnVsZmlsbGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yLm5leHQodmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxuICAgICAgICBmdW5jdGlvbiByZWplY3RlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvcltcInRocm93XCJdKHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cbiAgICAgICAgZnVuY3Rpb24gc3RlcChyZXN1bHQpIHsgcmVzdWx0LmRvbmUgPyByZXNvbHZlKHJlc3VsdC52YWx1ZSkgOiBuZXcgUChmdW5jdGlvbiAocmVzb2x2ZSkgeyByZXNvbHZlKHJlc3VsdC52YWx1ZSk7IH0pLnRoZW4oZnVsZmlsbGVkLCByZWplY3RlZCk7IH1cbiAgICAgICAgc3RlcCgoZ2VuZXJhdG9yID0gZ2VuZXJhdG9yLmFwcGx5KHRoaXNBcmcsIF9hcmd1bWVudHMgfHwgW10pKS5uZXh0KCkpO1xuICAgIH0pO1xufTtcbnZhciBfX2ltcG9ydERlZmF1bHQgPSAodGhpcyAmJiB0aGlzLl9faW1wb3J0RGVmYXVsdCkgfHwgZnVuY3Rpb24gKG1vZCkge1xuICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgXCJkZWZhdWx0XCI6IG1vZCB9O1xufTtcbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCBcIl9fZXNNb2R1bGVcIiwgeyB2YWx1ZTogdHJ1ZSB9KTtcbmNvbnN0IGZpbmRlcl8xID0gX19pbXBvcnREZWZhdWx0KHJlcXVpcmUoXCJAbWVkdi9maW5kZXJcIikpO1xuZXhwb3J0cy53YXRjaFBhZ2UgPSAoKSA9PiBfX2F3YWl0ZXIodGhpcywgdm9pZCAwLCB2b2lkIDAsIGZ1bmN0aW9uKiAoKSB7XG4gICAgY29uc3QgYnJvd3NlcldpbmRvdyA9IHdpbmRvdztcbiAgICBjb25zdCBldmVudHMgPSB7XG4gICAgICAgIENMSUNLOiBcImNsaWNrXCIsXG4gICAgICAgIERCTENMSUNLOiBcImRibGNsaWNrXCIsXG4gICAgICAgIENIQU5HRTogXCJjaGFuZ2VcIixcbiAgICAgICAgU0VMRUNUOiBcInNlbGVjdFwiLFxuICAgICAgICBTVUJNSVQ6IFwic3VibWl0XCJcbiAgICB9O1xuICAgIE9iamVjdC52YWx1ZXMoZXZlbnRzKS5mb3JFYWNoKGV2ZW50ID0+IGJyb3dzZXJXaW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihldmVudCwgKGUpID0+IF9fYXdhaXRlcih0aGlzLCB2b2lkIDAsIHZvaWQgMCwgZnVuY3Rpb24qICgpIHtcbiAgICAgICAgY29uc3QgYnJvd3NlckV2ZW50ID0ge1xuICAgICAgICAgICAgdHlwZTogZS50eXBlLFxuICAgICAgICAgICAgc2VsZWN0b3I6IFwiXCIsXG4gICAgICAgICAgICB2YWx1ZTogXCJcIlxuICAgICAgICB9O1xuICAgICAgICBpZiAoZS50YXJnZXQpIHtcbiAgICAgICAgICAgIGNvbnN0IHRhcmdldCA9IGUudGFyZ2V0O1xuICAgICAgICAgICAgYnJvd3NlckV2ZW50LnNlbGVjdG9yID0gZmluZGVyXzEuZGVmYXVsdCh0YXJnZXQpO1xuICAgICAgICAgICAgc3dpdGNoIChlLnR5cGUpIHtcbiAgICAgICAgICAgICAgICBjYXNlIFwiY2hhbmdlXCI6XG4gICAgICAgICAgICAgICAgICAgIGlmIChlLnRhcmdldCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgaW5wdXRUYXJnZXQgPSB0YXJnZXQ7XG4gICAgICAgICAgICAgICAgICAgICAgICBicm93c2VyRXZlbnQudmFsdWUgPSBpbnB1dFRhcmdldC52YWx1ZTtcbiAgICAgICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICAgIGJyb3dzZXJXaW5kb3cubm90aWZ5KGJyb3dzZXJFdmVudCk7XG4gICAgfSksIHRydWUpKTtcbn0pO1xuZXhwb3J0cy53YXRjaFBhZ2UoKTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWRhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsZXlKMlpYSnphVzl1SWpvekxDSm1hV3hsSWpvaWFXNWtaWGd1YW5NaUxDSnpiM1Z5WTJWU2IyOTBJam9pSWl3aWMyOTFjbU5sY3lJNld5SXVMaTh1TGk5emNtTXZZbkp2ZDNObGNpOXBibVJsZUM1MGN5SmRMQ0p1WVcxbGN5STZXMTBzSW0xaGNIQnBibWR6SWpvaU96czdPenM3T3pzN096czdPMEZCUVVFc01FUkJRV2xETzBGQlIzQkNMRkZCUVVFc1UwRkJVeXhIUVVGSExFZEJRVk1zUlVGQlJUdEpRVU5vUXl4TlFVRk5MR0ZCUVdFc1IwRkZaaXhOUVVGaExFTkJRVUU3U1VGRGFrSXNUVUZCVFN4TlFVRk5MRWRCUVVjN1VVRkRXQ3hMUVVGTExFVkJRVVVzVDBGQlR6dFJRVU5rTEZGQlFWRXNSVUZCUlN4VlFVRlZPMUZCUTNCQ0xFMUJRVTBzUlVGQlJTeFJRVUZSTzFGQlEyaENMRTFCUVUwc1JVRkJSU3hSUVVGUk8xRkJRMmhDTEUxQlFVMHNSVUZCUlN4UlFVRlJPMHRCUTI1Q0xFTkJRVUU3U1VGRFJDeE5RVUZOTEVOQlFVTXNUVUZCVFN4RFFVRkRMRTFCUVUwc1EwRkJReXhEUVVGRExFOUJRVThzUTBGQlF5eExRVUZMTEVOQlFVTXNSVUZCUlN4RFFVTnNReXhoUVVGaExFTkJRVU1zWjBKQlFXZENMRU5CUXpGQ0xFdEJRVXNzUlVGRFRDeERRVUZQTEVOQlFWRXNSVUZCUlN4RlFVRkZPMUZCUTJZc1RVRkJUU3haUVVGWkxFZEJRV2xDTzFsQlF5OUNMRWxCUVVrc1JVRkJSU3hEUVVGRExFTkJRVU1zU1VGQlNUdFpRVU5hTEZGQlFWRXNSVUZCUlN4RlFVRkZPMWxCUTFvc1MwRkJTeXhGUVVGRkxFVkJRVVU3VTBGRFdpeERRVUZCTzFGQlEwUXNTVUZCU1N4RFFVRkRMRU5CUVVNc1RVRkJUU3hGUVVGRk8xbEJRMVlzVFVGQlRTeE5RVUZOTEVkQlFVY3NRMEZCUXl4RFFVRkRMRTFCUVhGQ0xFTkJRVUU3V1VGRGRFTXNXVUZCV1N4RFFVRkRMRkZCUVZFc1IwRkJSeXhuUWtGQlRTeERRVUZETEUxQlFYRkNMRU5CUVVNc1EwRkJRVHRaUVVOeVJDeFJRVUZSTEVOQlFVTXNRMEZCUXl4SlFVRkpMRVZCUVVVN1owSkJRMW9zUzBGQlN5eFJRVUZSTzI5Q1FVTlVMRWxCUVVrc1EwRkJReXhEUVVGRExFMUJRVTBzUlVGQlJUdDNRa0ZEVml4TlFVRk5MRmRCUVZjc1IwRkJSeXhOUVVFd1FpeERRVUZCTzNkQ1FVTTVReXhaUVVGWkxFTkJRVU1zUzBGQlN5eEhRVUZITEZkQlFWY3NRMEZCUXl4TFFVRkxMRU5CUVVFN2NVSkJRM3BETzJGQlExSTdVMEZEU2p0UlFVTkVMR0ZCUVdFc1EwRkJReXhOUVVGTkxFTkJRVU1zV1VGQldTeERRVUZETEVOQlFVRTdTVUZEZEVNc1EwRkJReXhEUVVGQkxFVkJRMFFzU1VGQlNTeERRVU5RTEVOQlEwb3NRMEZCUVR0QlFVTk1MRU5CUVVNc1EwRkJRU3hEUVVGQk8wRkJSVVFzYVVKQlFWTXNSVUZCUlN4RFFVRkJJbjA9Il0sInNvdXJjZVJvb3QiOiIifQ==