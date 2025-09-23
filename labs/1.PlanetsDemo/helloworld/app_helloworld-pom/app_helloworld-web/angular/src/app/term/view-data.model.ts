import { NumericalService } from '../dynamic-field/utility/numerical.service';
import { NumericProperties } from './term.model';
import { PriorityQueue } from '../models/priority-queue.model';
import { DynamicFieldUtils } from '../dynamic-field/utility/dynamic-field.utils';

/**
 * Abstract class representing a data of a view. A view data is an object used by the dynamic field component to interact with the user.
 * The view data object is responsible for converting to/from program value.
 */
export abstract class ViewData {

    /**
     * Value of the data. This value is updated either by initializing or
     * through user interactions inside the component.
     *
     * Note: Must not be updated outside the dynamic field component!!!
     */
    value: string;

    /**
     * Store the initial value so that
     */
    initialValue: string;

    /**
     * Variable to store the max length of the field.
     */
    protected _maxLength: number;

    /**
     * Initialize the view data with a value which is formatted from program value.
     *
     * @param initialValue the initial value
     */
    initialize(initialValue: string): void {
        initialValue = initialValue ?? '';
        this.value = initialValue;
        this.initialValue = this.value;
        if (this._maxLength < initialValue.length) {
            this._maxLength = initialValue.length;
        }
    }

    /**
     * Convert the view data value into a value which can be passed to the program
     */
    abstract computeProgramValue(): string;

    /**
     * Check if the value was modified by the user
     */
    isModifiedByUser(): boolean {
        return this.value !== this.initialValue;
    }

    /**
     * Get the max length that this data can hold
     */
    get maxLength(): number {
        return this._maxLength;
    }

    /**
     * Constructor for the abstract class view data
     *
     * @param maxLength the max length of the value which is stored by this object.
     * @protected
     */
    protected constructor(maxLength: number) {
        this._maxLength = maxLength;
    }
}

/**
 * VD representing a standard numeric field.
 * In BLU4IV environment, this represents a field with NUMERIC ONLY (Y) keyboard shift
 */
export class StdNumVD extends ViewData {
    override value: string;

    /**
     * Create a Standard numeric view data.
     *
     * @param qdecfmt the decimal format type
     * @param fieldSize the field size
     */
    constructor(
        private qdecfmt: string,
        fieldSize: number
    ) {
        super(fieldSize);
    }

    override computeProgramValue(): string {
        return NumericalService.convertStdNumToProgramValue(this.value, this.qdecfmt);
    }
}

/**
 * VD representing a signed numeric field.
 * In BLU4IV environment, this represents a field with SIGNED NUMERIC (S) keyboard shift
 */
export class SignedNumVD extends ViewData {
    override value: string;

    constructor(
        private numericProperties: NumericProperties,
        fieldSize: number
    ) {
        super(fieldSize);
    }

    override computeProgramValue(): string {
        return NumericalService.convertFromSignedNumeric(this.value, this.numericProperties.scale);
    }
}

/**
 * VD representing a simple text field.
 */
export class SimpleTextVD extends ViewData {

    constructor(
        size: number
    ) {
        super(size);
    }

    computeProgramValue(): string {
        return this.value;
    }
}

/**
 * VD representing a split text field.
 */
export class SplitTextVD extends ViewData {
    override value: string;
    /**
     * Queue to store the split properties based on the offset value.
     * @private
     */
    private readonly splitsPriorityQueue: PriorityQueue<SplitProperties>;

    /**
     * Constructor for Split Text view data
     *
     * @param size the initial size
     * @param wrap flag to denote if we should wrap the value based on splits
     */
    constructor(
        size: number,
        public wrap: boolean
    ) {
        super(size);
        this.splitsPriorityQueue = new PriorityQueue<SplitProperties>();
    }

    override computeProgramValue(): string {
        return this.value;
    }

    /**
     * Add a field which splits the view data at a particular offset.
     *
     * @param splitProp the split properties
     */
    public addSplitField(splitProp: SplitProperties): void {
        if (splitProp.offset + splitProp.size > this._maxLength) {
            this._maxLength = splitProp.offset + splitProp.size;
        }
        this.splitsPriorityQueue.enqueue(splitProp, splitProp.offset);
    }

    /**
     * Remove a split field from the view data
     *
     * @param splitProp the split properties of the split field
     */
    public removeSplitField(splitProp: SplitProperties) {
        this.splitsPriorityQueue.remove(splitProp);
    }

    override initialize(initialValue: string) {
        initialValue = initialValue.padEnd(this._maxLength);
        // If wrap is enabled, try to wrap based on the split.
        if (this.wrap && initialValue.charAt(initialValue.length - 1) === ' ') {
            for (let split of this.splitsPriorityQueue) {
                initialValue = DynamicFieldUtils.wrapWordsForSplit(initialValue, split).wrapped;
                if (initialValue.charAt(initialValue.length - 1) !== ' ') {
                    break;
                }
            }
        }
        super.initialize(initialValue);
    }

    /**
     * Perform word wrap starting from the split.
     *
     * @param fromSplit the split to start the word wrap from.
     * @returns the number of characters pushed to the next split
     */
    public wrapFromSplit(fromSplit: SplitProperties): number {
        let isFirstSplit: boolean = true;
        let result: number = 0;
        for (let split of this.splitsPriorityQueue.iterableFrom(fromSplit)) {
            let wrapResult = DynamicFieldUtils.wrapWordsForSplit(this.value, split);
            if (isFirstSplit) {
                result = wrapResult.offset;
            }
            isFirstSplit = false;
            this.value = wrapResult.wrapped;
            if (this.value.charAt(this.value.length - 1) !== ' ') {
                break;
            }
        }
        return result;
    }

    /**
     * Performs the placement of cursor at the specified position
     *
     * @param position the position to place cursor on
     * @returns true if a split field was selected and placement was done, otherwise false
     */
    public performCursorPlacement(position: number): boolean {
        for (let split of this.splitsPriorityQueue) {
            if (split.offset <= position && position < split.offset + split.size) {
                split.focusCallback(position - split.offset, position - split.offset);
                return true;
            }
        }
        return false;
    }
}

/**
 * Class representing the properties of a split of data.
 * The properties are readonly and can only be initialized once.
 */
export class SplitProperties {
    /**
     * Create a new Split properties
     *
     * @param offset the offset of the split
     * @param size the size of the split
     * @param focusCallback the call back to call to focus at a particular position
     */
    constructor(
        public readonly offset: number,
        public readonly size: number,
        public readonly focusCallback: (start: number, end: number) => void
    ) {
    }
}
