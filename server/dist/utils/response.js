export function success(data, message = 'ok') {
    return { code: 0, data, message };
}
export function error(codeOrMessage, message) {
    if (typeof codeOrMessage === 'string') {
        return { code: 500, data: null, message: codeOrMessage };
    }
    return { code: codeOrMessage, data: null, message: message ?? '' };
}
