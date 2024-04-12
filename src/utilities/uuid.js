/**
 * Generates a random 12 character unique identifier using uppercase, lowercase, and numbers (e.g. "OXezc4urfwja")
 * @return {string}
 */
export function uuidTime() {
    var dateUuidTime = new Date();
    var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var stampUuidTime = parseInt(Math.floor((Math.random() * 199) + 1) + "" + dateUuidTime.getTime()).toString(36);
    while (stampUuidTime.length < 12) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
}

/**
 * Generates a random 8 character unique identifier using uppercase, lowercase, and numbers (e.g. "jzY3y338")
 * @return {string}
 */
export function uuidTimeShort() {
    var dateUuidTime = new Date();
    var abcUuidTime = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    var stampUuidTime = parseInt("" + dateUuidTime.getMilliseconds() + dateUuidTime.getMinutes() + dateUuidTime.getHours() + dateUuidTime.getDay()).toString(36);
    while (stampUuidTime.length < 8) stampUuidTime = abcUuidTime.charAt(Math.floor(Math.random() * abcUuidTime.length)) + stampUuidTime;
    return stampUuidTime;
}
