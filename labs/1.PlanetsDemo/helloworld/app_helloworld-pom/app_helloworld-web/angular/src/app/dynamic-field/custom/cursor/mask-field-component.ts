import { Directive, Input } from '@angular/core';
import { CursorDynamicFieldComponent } from './cursor-dynamic-field.component';

/**
 * Abstract class which represents a dynamic field component which can perform masking.
 * Masking is used to protected specific areas from user interaction.
 */
@Directive()
export abstract class MaskFieldComponent extends CursorDynamicFieldComponent {

    /**
     * A cache for masked value. Key is the raw value and value is the masked value.
     * @private
     */
    private maskValueCache: { key: string, value: string };

    /**
     * The location of the first unprotected character in the mask.
     * @private
     */
    private firstUnprotectedChar: number = 0;

    /**
     * The mask stored
     * @private
     */
    private _mask: string;

    /**
     * Set the mask for the component
     *
     * @param mask the mask to set
     */
    @Input() set mask(mask: string) {
        this._mask = mask;
        // Invalidate the mask cache
        this.maskValueCache = undefined;
    }

    /**
     * Get the mask for the component
     * @returns the mask
     */
    get mask(): string {
        return this._mask;
    }

    /**
     * The type of the mask
     * Can be either 'FIXED' or 'DYNAMIC'
     *
     * -> For a dynamic mask, the fixed characters will be built on the initialization phase. (Usually used with edit code or edit word)
     *    The fixed characters provided as input by the parent component will be overridden every time based on the initialization phase.
     * -> For a fixed mask, the fixed characters should be provided by the parent component.
     *
     * @protected
     */
    @Input()
    protected maskType: string = 'FIXED';

    /**
     * The character which represents a value of the data in the mask.
     * Care must be taken that provided mask character is not part of the mask
     *
     * @protected
     */
    @Input()
    protected maskChar: string = '0';

    /**
     * Check if the given character in mask represents a protected character or not
     * @param maskChar the character in mask
     * @returns true if maskChar represents a protected character, otherwise false
     * @private
     */
    private isProtectedChar(maskChar: string): boolean {
        return this.maskChar !== maskChar;
    }

    /**
     * Fetches the raw value for the given masked value
     *
     * @param formatedValue the masked value
     * @returns the raw value
     * @protected
     */
    protected getRawValue(formatedValue: string): string {
        if (!this._mask) {
            return formatedValue;
        }
        let rawValue: string = '';
        for (let i = 0; i < formatedValue.length; i++) {
            let maskChar = this.mask.substring(i, i + 1);
            if (!this.isProtectedChar(maskChar)) {
                rawValue += formatedValue.substring(i, i + 1);
            }
        }
        return rawValue;
    }

    /**
     * Format masked value from the raw value
     *
     * @param rawValue the raw value
     * @returns masked value
     * @private
     */
    private formatMaskedValue(rawValue: string): string {
        if (!this._mask) {
            return rawValue;
        }
        let formatedValue: string = '';
        let nb = 0;

        for (let i = 0; i < this.mask.length; i++) {

            let maskChar = this.mask.substring(i, i + 1);
            if (i - nb < rawValue.length) {
                if (this.isProtectedChar(maskChar)) {
                    formatedValue += maskChar;
                    nb++;
                } else {
                    formatedValue += rawValue.substring(i - nb, i - nb + 1);
                }
            }
        }

        return formatedValue;
    }

    /**
     * Calculate the raw positions from the masked positions
     *
     * @param start the masked value start
     * @param end the masked value end
     * @returns an object of type { start: number, end: number } representing the raw positions for the given masked positions.
     * @protected
     */
    protected override calculateRawPositions(start: number, end: number): { start: number, end: number } {
        if (!this._mask) {
            return {start: start, end: end};
        }
        let newCursorPositionStart = start;
        let newCursorPositionEnd = end;
        for (let index = 0; index < this.mask.length; index++) {
            if (this.isProtectedChar(this.mask[index])) {
                if (index < start) {
                    newCursorPositionStart--;
                    newCursorPositionEnd--;
                } else if (index >= start && index < end) {
                    newCursorPositionEnd--;
                }
            }
        }
        return {start: newCursorPositionStart, end: newCursorPositionEnd};
    }

    /**
     * Mask the given value. Will look at internal cache for the masked value.
     * If found it will return, otherwise the cache is updated.
     *
     * @param value the value to mask
     * @returns the masked value
     * @protected
     */
    protected maskValue(value: string): string {
        // Check for mask
        if (!this.mask) {
            // No masking
            return value;
        }
        if (this.maskValueCache && this.maskValueCache.key !== value) {
            this.maskValueCache.key = value;
            this.maskValueCache.value = this.formatMaskedValue(value);
        } else if (!this.maskValueCache) {
            this.maskValueCache = {
                key: value,
                value: this.formatMaskedValue(value)
            }
        }
        return this.maskValueCache.value;
    }

    /**
     * Gets the next unprotected position from the starting position after a given offset.
     * When there is a mask, we will skip 'offset' number of unprotected characters. This offset
     * number does not include the protected Characters in between.
     *
     * @param start the starting position of the masked value
     * @param offset the offset after which we require the unprotected field
     * @returns a number which represents the next unprotected position. If none found, the last position will be returned
     * @protected
     */
    protected override getNextUnprotectedPosition(start: number, offset: number): number {
        if (!this.mask) {
            return super.getNextUnprotectedPosition(start, offset);
        }
        let remaining: number = offset;
        let index: number;
        for (index = start; index < this.mask.length; index++) {
            if (!this.isProtectedChar(this.mask[index])) {
                remaining--;
                if (remaining < 0) {
                    break;
                }
            }
        }
        return index;
    }

    /**
     * Gets the previous position which is not protected.
     * When there is a mask, and there is no unprotected field before start,
     * this method will return the first unprotected position
     *
     * @param start the starting position of the masked value
     * @returns a number which represents the previous unprotected position. If none found, the first unprotected position will be returned
     * @protected
     */
    protected override getPrevUnprotectedPosition(start: number): number {
        if (!this.mask) {
            return super.getPrevUnprotectedPosition(start);
        }
        if (this.firstUnprotectedChar >= start - 1) {
            return this.firstUnprotectedChar;
        }
        let index: number;
        for (index = start - 1; index > 0; index--) {
            if (!this.isProtectedChar(this.mask[index])) {
                return index;
            }
        }
        return this.firstUnprotectedChar;
    }

    /**
     * Initialize the mask based on the value provided and build the initial value for the view data
     *
     * @param value the value based on which the mask must be initialized.
     *     If mask type is dynamic, the value will already contain the protected characters, otherwise the value will only contain the view
     *     data value. If mask type is dynamic and the protected values in the value contain the maskChar, then that character is skipped.
     * @returns The same value if Fixed, otherwise value with protected characters stripped out (raw value).
     * @protected
     */
    protected initializeMask(value: string): string {
        if (!this._mask) {
            return value;
        }
        if (this.maskType === 'DYNAMIC') {
            if (value.length < this._mask.length) {
                value = value.padEnd(this._mask.length);
            }
            this.buildDynamicMask(value);
            return this.getRawValue(value);
        }
        // populate firstProtectedChar
        this.firstUnprotectedChar = 0;
        for (let i = 0; i < this.mask.length; i++) {
            if (!this.isProtectedChar(this.mask[i])) {
                this.firstUnprotectedChar = i;
            }
        }
        return value;
    }

    /**
     * Build a dynamic mask based on the initial value.
     *
     * @param value the initial value
     * @private
     */
    private buildDynamicMask(value: string) {
        let newMask: string = '';
        let lastAdded: number = 0;
        // Build new mask
        for (let index = 0; index < this.mask.length; index++) {
            if (this.isProtectedChar(this.mask[index]) && value.charAt(index) !== this.maskChar) {
                if (lastAdded !== index) {
                    newMask += this._mask.substring(lastAdded, index);
                }
                newMask += value.charAt(index)
                lastAdded = index + 1;
            }
        }
        if (lastAdded !== this.mask.length) {
            newMask += this._mask.substring(lastAdded, this.mask.length);
        }
        this.mask = newMask;
    }
}
