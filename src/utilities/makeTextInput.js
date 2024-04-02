/**
 * Attach listeners to `element` making it a reasonably working text input that
 * doesn't interact poorly with keyboard shortcuts and calls saveCallback in a
 * reasonably debounced way
 * @param {Element} element
 * @param {function} saveCallback
 */
export function makeTextInput(element, saveCallback) {
    let debouncedSave = null;
    element.addEventListener('keydown', (event) => {
        const code = event.keyCode || event.which;
        // 13 is Enter
        if (code === 13) {
            event.preventDefault();
            element.blur();
        }
        event.stopPropagation();
    });
    element.addEventListener('keypress', (event) => {
        event.stopPropagation();
    });
    element.addEventListener('keyup', (event) => {
        event.stopPropagation();

        if (debouncedSave) {
            clearTimeout(debouncedSave);
        }
        debouncedSave = setTimeout(() => {
            saveCallback();
            debouncedSave = null;
        }, 1000);
    });
}
