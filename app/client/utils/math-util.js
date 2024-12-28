const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/**
 * Converts degrees to radians.
 *
 * @param   {Number} degrees
 * @returns {Number}
 */
export function degToRad(degrees) {
    return degrees * DEG_TO_RAD;
}

/**
 * Converts radians to degrees.
 *
 * @param   {Number} degrees
 * @returns {Number}
 */
export function radToDeg(radians) {
    return radians * RAD_TO_DEG;
}

/**
 * Rounds a value to a given number of digits.
 */
export function round(val, digits = 0, base = 10 ** digits) {
    return Math.round((val + Number.EPSILON) * base) / base;
}

/**
 * Clamps a value between a minimum and maximum.
 *
 * @param   {Number} val
 * @param   {Number} min
 * @param   {Number} max
 * @returns {Number}
 */
export function clamp(val, min, max) {
    if (min < max) {
        return val < min ? min : val > max ? max : val;
    }
    return val < max ? max : val > min ? min : val;
}

/**
 * Wraps a value between a minimum and maximum.
 *
 * @param   {Number} val
 * @param   {Number} min
 * @param   {Number} max
 * @returns {Number}
 */
export function wrap(val, min, max) {
    if (min < max) {
        return ((((val - min) % (max + 1 - min)) + (max + 1 - min)) % (max + 1 - min)) + min;
    }
    return ((((val - max) % (min + 1 - max)) + (min + 1 - max)) % (min + 1 - max)) + max;
}
