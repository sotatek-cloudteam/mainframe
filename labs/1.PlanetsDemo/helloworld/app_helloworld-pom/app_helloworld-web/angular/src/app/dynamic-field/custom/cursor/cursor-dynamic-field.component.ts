import { DynamicFieldComponent } from '../../dynamic-field.component';
import { Directive, Input } from '@angular/core';
import { Attributes } from '../../../term/message';
import { DynamicFieldUtils } from '../../utility/dynamic-field.utils';

/**
 * A Dynamic field component which tracks a cursor upon the focus of the field.
 */
@Directive()
export abstract class CursorDynamicFieldComponent extends DynamicFieldComponent {

    /**
     * The input Type to use (by default it is text)
     */
    @Input()
    inputType: string = 'text';

    protected classes = [];

    /**
     * Cursor start index
     * @protected
     */
    protected _cursorStart = 0;

    /**
     * Cursor end index
     * @protected
     */
    protected _cursorEnd = 0;

    /**
     * Sets the cursor start at the end.
     *
     * @protected
     */
    protected setEqualsPosition() {
        this._cursorEnd = this._cursorStart;
    }

    /**
     * Insert value into the view data
     * For example,
     * 'abcdef ' -> _insertValue(3, 4, 'uuu') will be (selected 'd')
     * => 'abcuuef', regardless of insert mode => {start: 5, end: 5}
     * 'abcdef ' -> _insertValue(4, 4, 'p') will be
     * -> Insert mode => Cursor before 'e'
     *    => 'abcdpef' {start: 5, end: 5}
     * -> Overwrite mode => Cursor on 'e'
     *   => 'abcdpf ' {start: 5, end: 5}
     * @param start the start index of the value of data to be inserted
     * @param end the end index of the value of the data to be inserted
     * @param value the value to be inserted
     * @protected
     */
    protected _insertViewValue(start: number, end: number, value: string): { start: number, end: number } {
        // Check cursor
        if (end < start) {
            return this._insertViewValue(end, start, value);
        }

        value = value ? value : '';
        let rawPos: { start: number, end: number } = this.calculateRawPositions(start, end);

        let viewDataValue: string = this.data.viewData.value;
        // Filled
        if (this._insertMode && rawPos.start === rawPos.end && !viewDataValue.endsWith(' ')) {
            return {start: start, end: end};
        }

        // Make sure the value is at-least the start size
        if (this.data.viewData.value.length < rawPos.start) {
            this.data.viewData.value = this.data.viewData.value.padEnd(rawPos.start);
        }

        let insertedLength = value.length;
        if (this._insertMode || rawPos.start !== rawPos.end) {
            // Insert mode
            // Calculate the excess length because of insertion
            let excess: number = value.length - rawPos.end + rawPos.start;
            let viewValue: string = this.data.viewData.value;
            // If we are losing fewer characters than we are adding calculate how much in value we can actually insert
            if (excess > 0) {
                // Calculate how many blanks we have at the end that can cover the excess
                // lec = viewValue.slice(excess * -1) -> The Last 'excess' characters (considering blanks at the end)
                // lec.trimEnd().length -> number of characters that covers the excess
                insertedLength = (excess - viewValue.slice(excess * -1).trimEnd().length) + rawPos.end - rawPos.start;
                value = value.substring(0, insertedLength);
                // There is no more excess
                excess = 0;
            }
            // Update the view value
            this.data.viewData.value = (this.data.viewData.value.substring(0, rawPos.start) + value + this.data.viewData.value.substring(
                rawPos.end) + ' '.repeat(excess * -1)).substring(0, this.data.viewData.maxLength);
        } else {
            this.data.viewData.value = this.data.viewData.value.substring(0, rawPos.start) + value + this.data.viewData.value.substring(
                rawPos.start + value.length);
        }
        let newPos: number = this.getNextUnprotectedPosition(start, insertedLength);
        return {start: newPos, end: newPos};
    }

    /**
     * Inserts value in the data.
     * Note this function will modify the data's value rather than the view data.
     *
     * @param start the start selection
     * @param end the end selection
     * @param value the value to insert
     * @returns an object of type {start: number, end: number} describing the new position
     * @protected
     */
    protected _insertValue(start: number, end: number, value: string): { start: number, end: number } {
        // Filled
        if(this._insertMode && start === end && !this.data.value.endsWith(' ')) {
            return { start: start, end: end };
        }

        // Check cursor
        if (end < start) {
            return this._insertValue(end, start, value);
        }

        // Insert value
        if(this._insertMode) {
            this.data.value = this.data.value.substring(0, start)
                + value
                + this.data.value.substring(end, this.size - 1);
        } else {
            this.data.value = this.data.value.substring(0, start)
                + value
                + this.data.value.substring(start === end ? Math.min(end + 1, this.size) : Math.min(end, this.size), this.size);
        }

        if(this.data.value.length < this.size){
            this.data.value += ' '.repeat(this.size - this.data.value.length);
        }
        this.data.value = this.data.value.slice(0, this.size);
        end = start + value.length;

        return { start: start, end: end };
    }

    /**
     * Process backspace key press on the data value.
     * Note: This method will process backspace on the data value. The view value remains untouched.
     *
     * @param start the start selection
     * @param end the end selection
     * @protected
     */
    protected processBackspace(start: number, end: number): void {
        let startValue = this.data.value.substring(0, start === end ? start - 1 : start) + this.data.value.slice(end);
        this.data.value = startValue + this.defaultValue.substring(startValue.length);
        this._updateCursor(start === end ? -1 : 0, start === end ? -1 : 0, this._cursorEnd - this._cursorStart === this.size);
        this._updateCursor(0, 0, false);
        this.setEqualsPosition();
    }

    /**
     * Process a delete input on the data.
     *
     * @param start the start selection
     * @param end the end selection
     * @protected
     */
    protected processDelete(start: number, end: number): void {
        let startValue = this.data.value.substring(0, start) + this.data.value.slice(start === end ? end + 1 : end);
        this.data.value = startValue + this.defaultValue.substring(startValue.length, this.size);
        this._updateCursor(0, 0, this._cursorEnd - this._cursorStart === this.size);
        this.setEqualsPosition();
    }

    /**
     * Process a backspace key input with selection at start and end
     * Note: This function will process backspace on the view value, the data value will remain untouched.
     *
     * @param start the starting selection in the input
     * @param end the ending selection in the input
     *
     * @returns object of type {start: number, end: number } representing the new position after pressing backspace
     * @protected
     */
    protected processBackspaceOnView(start: number, end: number): {start: number, end: number} {
        // Make sure that start <= end, otherwise switch.
        let rawPositions: { start: number, end: number };
        if (start > end) {
            rawPositions = this.calculateRawPositions(end, start);
        } else {
            rawPositions = this.calculateRawPositions(start, end);
        }
        // If we selected protected values
        if (rawPositions.start > rawPositions.end) {
            // Do nothing
            return;
        }
        // Backspace pressed on 0'th position
        if (rawPositions.start === 0 && rawPositions.end === 0) {
            // Do nothing
            return undefined;
        }
        // if raw start and end is the same
        let viewValue: string = this.data.viewData.value;
        if (rawPositions.start === rawPositions.end) {
            this.data.viewData.value = viewValue.substring(0, rawPositions.start - 1) + viewValue.substring(rawPositions.start) + ' ';
        } else {
            // We just have to remove the start and end
            this.data.viewData.value = viewValue.substring(0, rawPositions.start) + viewValue.substring(rawPositions.end) + ' '.repeat(
                rawPositions.end - rawPositions.start);
        }
        if (start === end) {
            let newPos: number = this.getPrevUnprotectedPosition(start);
            return { start: newPos, end: newPos };
        } else {
            return { start: start, end: start };
        }
    }

    /**
     * Process a delete key input with selection at start and end on view data
     * Note: This function will process delete on the view value, the data value will remain untouched.
     *
     * @param start the starting selection in the input
     * @param end the ending selection in the input
     *
     * @protected
     */
    protected processDeleteOnView(start: number, end: number): void {
        // Make sure that start <= end, otherwise switch.
        let rawPositions: { start: number, end: number };
        if (start > end) {
            rawPositions = this.calculateRawPositions(end, start);
        } else {
            rawPositions = this.calculateRawPositions(start, end);
        }

        // If we selected protected values
        if (rawPositions.start > rawPositions.end) {
            // Do nothing
            return;
        }
        // Backspace pressed on the last position
        if (rawPositions.start === this.data.viewData.maxLength && rawPositions.end === this.data.viewData.maxLength) {
            // Do nothing
            return;
        }
        // if raw start and end is the same delete the next character
        let viewValue: string = this.data.viewData.value;
        if (rawPositions.start === rawPositions.end) {
            this.data.viewData.value = viewValue.substring(0, rawPositions.start) + viewValue.substring(rawPositions.start + 1) + ' ';
        } else {
            // We just have to remove the start and end
            this.data.viewData.value = viewValue.substring(0, rawPositions.start) + viewValue.substring(rawPositions.end) + ' '.repeat(
                rawPositions.end - rawPositions.start);
        }
        this._updateCursor(0, 0, this._cursorEnd - this._cursorStart === this.size);
        this.setEqualsPosition();
    }

    /**
     * Calculate the raw positions of the cursor
     * Will be overridden if masking
     *
     * @param start the start
     * @param end the end
     * @protected
     */
    protected calculateRawPositions(start: number, end: number): { start: number, end: number } {
        return {start: start, end: end};
    }

    /**
     * Update the cursor indexes
     *
     * @param start the start o
     * @param end
     * @protected
     */
    protected updateCursorIndexes(start: number, end: number): void {
        this._cursorStart = start;
        this._cursorEnd = end;
    }

    /**
     * Update the position of the cursor to the offset provided both in input and in index
     *
     * @param cursorStartOffset the cursor start offset
     * @param cursorEndOffset the cursor end offset
     * @protected
     */
    protected updatePosition(cursorStartOffset: number, cursorEndOffset: number): void {
        let newStart = Math.min(Math.max(0, this._cursorStart + cursorStartOffset), this.size - 1);
        let newEnd = Math.min(Math.max(0, this._cursorEnd + cursorEndOffset), this.size - 1);
        this.setPosition(newStart, newEnd);
    }

    /**
     * Update the position of cursor to the provided position both in the input and in index
     *
     * @param cursorStart
     * @param cursorEnd
     * @protected
     */
    protected setPosition(cursorStart: number, cursorEnd: number) {
        this.updateCursorIndexes(cursorStart, cursorEnd);
        this.updateInputSelect(cursorStart, cursorEnd);
    }

    /**
     * Update the input's select offsets
     *
     * @param start the start of the select
     * @param end the end of the select
     * @protected
     */
    protected abstract updateInputSelect(start: number, end: number): void;

    /**
     * Update the cursor position. This updates the cursor position in the DOM.
     *
     * @param offsetStart The offset to apply on the start selection
     * @param offsetEnd The offset to apply on the end selection
     * @param reset reset to the beginning before applying offset
     * @protected
     */
    protected abstract _updateCursor(offsetStart: number, offsetEnd: number, reset: boolean): void;

    /**
     * Get the next position which is not protected relative to the start and an offset of unprotected characters
     *
     * @param start the start position
     * @param offset the number of unprotected characters of data that needs to be offset
     * @protected
     */
    protected getNextUnprotectedPosition(start: number, offset: number): number {
        return start + offset;
    }

    /**
     * Gets the previous position which is not protected
     *
     * @param start the start position
     * @protected
     */
    protected getPrevUnprotectedPosition(start: number): number {
        return start - 1;
    }

    /**
     * Compute the classes for the input
     * @protected
     */
    protected computeClasses(): string[] {
        let classes = [];
        // Decode attributes
        let attributes: Attributes = this.data.attributes;
        if (!attributes) {
            // May happen due to SEND TEXT
            return classes;
        }
        // Determinate classes
        if (DynamicFieldUtils.isDefinedAndDifferentOf(attributes.intensity, 'NORM')) {
            classes.push(attributes.intensity.toLowerCase());
        }
        if (attributes.color !== undefined) {
            classes.push(attributes.color.toLowerCase());
        }
        if (DynamicFieldUtils.isDefinedAndDifferentOf(attributes.highlight, 'OFF')) {
            classes.push(attributes.highlight.toLowerCase());
        }
        if (attributes.charsetMode !== undefined) {
            classes.push(attributes.charsetMode.toLowerCase());
        }
        if (attributes.detectability !== undefined) {
            classes.push(attributes.detectability.toLowerCase());
        }
        if (attributes.protection !== undefined) {
            classes.push(attributes.protection.toLowerCase());
        }

        // Add hidden class to parent div if needed
        if (this.parentDiv) {
            if (classes.indexOf('hidden') >= 0) {
                this.parentDiv.classList.add('hidden');
            } else {
                this.parentDiv.classList.remove('hidden');
            }
        }

        return classes;
    }

    /**
     * Compute attributes for the component.
     *
     * @private
     */
    protected computeAttributes() {
        // Decode attributes
        let attributes: Attributes = this.data.attributes;
        if (!attributes) {
            // May happen due to SEND TEXT
            return;
        }

        if (this.inputType !== undefined && this.inputType === 'password') {
            attributes.isPassword = true;
        }

        if (attributes.isPassword) {
            this.inputType = 'password'
        }

        // Determine classes
        this.classes = this.computeClasses();

        if (attributes.underline !== undefined) {
            this.underline = attributes.underline;
        }

        // Determinate consultation mode (readOnly)
        this.data.disabled = attributes.protection === 'ASKIP';
        this.data.protected = attributes.protection === 'PROT';
    }
}
