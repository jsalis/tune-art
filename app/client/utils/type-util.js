/**
 * Returns whether a value is null.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isNull(val) {
    return val === null;
}

/**
 * Returns whether a value is defined.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isDefined(val) {
    return val !== undefined;
}

/**
 * Returns whether a value is undefined.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isUndefined(val) {
    return val === undefined;
}

/**
 * Returns whether a value is an object and not null.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isObjectLike(val) {
    return typeof val === "object" && val !== null;
}

/**
 * Returns whether a value is a function.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isFunction(val) {
    return typeof val === "function";
}

/**
 * Returns whether a value is a boolean.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isBoolean(val) {
    return typeof val === "boolean";
}

/**
 * Returns whether a value is a number.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isNumber(val) {
    return typeof val === "number";
}

/**
 * Returns whether a value is a string.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isString(val) {
    return typeof val === "string";
}

/**
 * Returns whether a value is an empty string.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isEmptyString(val) {
    return isString(val) && val.length === 0;
}

/**
 * Returns whether a value is a non-empty string.
 *
 * @param   {*} val
 * @returns {Boolean}
 */
export function isNonEmptyString(val) {
    return isString(val) && val.length !== 0;
}
