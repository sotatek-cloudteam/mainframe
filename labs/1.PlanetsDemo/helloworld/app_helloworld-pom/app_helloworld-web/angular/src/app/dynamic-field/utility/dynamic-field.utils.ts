import { SplitProperties } from '../../term/view-data.model';

/**
 * Utils class used to perform various operations in Dynamic fields
 */
export class DynamicFieldUtils {
    /**
     * This is a Utils class. Constructor should not be called
     */
    constructor() {
        throw new Error('Utils class');
    }

    static computeFontWidth(element: any): number {
        if (window['CACHED_FONT_WIDTH'] === undefined) {
            // Compute and cache font width, using a hidden canvas
            let st: CSSStyleDeclaration = window.getComputedStyle(element);

            // For firefox compatibility: do not use the "font" shorthand property of CSSStyleDeclaration
            let font: string = st.fontStyle + ' ' + st.fontVariant + ' ' + st.fontWeight + ' ' + st.fontSize + '/' + st.lineHeight + ' ' +
                st.fontFamily;

            let canvas = document.createElement('canvas');
            let context: CanvasRenderingContext2D = canvas.getContext('2d');
            context.font = font;
            window['CACHED_FONT_WIDTH'] = Math.ceil(context.measureText('W').width)
        }

        return window['CACHED_FONT_WIDTH'];
    }

    static isDefinedAndDifferentOf(value: string, notExpected: string) {
        return value && (value !== notExpected);
    }

    /**
     * Perform word wrapping for the split.
     *
     * @param value the value to perform word wrap on
     * @param split the properties of the split that we need to wrap
     *
     * @returns an object with properties wrapped and offset.
     *      Wrapped is the wrapped value and offset is the number of characters that were pushed to the next split
     */
    static wrapWordsForSplit(value: string, split: SplitProperties): { wrapped: string, offset: number } {
        let end = split.offset + split.size;
        let result = {wrapped: value, offset: 0};
        if (end < value.length && value.charAt(end - 1) !== ' ') {
            // Try to Wrap the current line to the next line
            let lastWordStart: number = value.substring(split.offset, end).lastIndexOf(' ') + split.offset;
            if (lastWordStart < split.offset) {
                // no need to wrap
                return result;
            }
            let spaceAdded = ' '.repeat(end - 1 - lastWordStart);
            if (value.endsWith(spaceAdded)) {
                // We can now wrap
                value = value.substring(0, lastWordStart + 1) + spaceAdded +
                    value.substring(lastWordStart + 1, value.length - spaceAdded.length);
                result.wrapped = value;
                result.offset = spaceAdded.length;
            }
        }
        return result;
    }
}
