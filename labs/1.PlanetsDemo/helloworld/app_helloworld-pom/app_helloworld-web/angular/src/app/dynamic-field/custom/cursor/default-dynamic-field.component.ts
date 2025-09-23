import {AfterViewInit, Component, ElementRef, inject, Input, OnDestroy, ViewChild} from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppService } from '../../../app.service';
import { TransactionService } from '../../../term/transaction.service';
import { ConfigService } from '../../../config-service';
import { EditCodeService } from '../../utility/editcode.service';
import { EditWordService } from '../../utility/editword.service';
import { NumericalService } from '../../utility/numerical.service';
import { ModalService } from '../../../modal.service';
import { Subscription } from 'rxjs';
import { CHARSET } from '../../utility/charset.enum';
import { FieldMessageLine } from '../../../models/field-message-line.model';
import { DynamicFieldUtils } from '../../utility/dynamic-field.utils';
import { SignedNumVD, SimpleTextVD, StdNumVD } from '../../../term/view-data.model';
import { NumericProperties } from '../../../term/term.model';
import { MaskFieldComponent } from './mask-field-component';
import {MessageLineService} from '../../../services/message-line.service';
import { EventsService } from '../../utility/events.service';
import { CheckMessageService, TypeCheckMessage } from 'app/dynamic-field/utility/check-message.service';

@Component({
    selector: 'dynamic-field',
    standalone: false,
    // Spaces are significant => all on one line, no space or break-line outer tag
    template: `
        <div class="relative-pos" tabindex="-1" (click)="onClickDiv($event)">
            <input #input [disabled]="data.disabled" [readonly]="data.protected"
                   [attr.id]="id" [attr.name]="id" [type]=inputType [attr.size]="realSize" [attr.maxlength]="realSize"
                   [attr.underline]="underline"
                   [style.width]="computeWidth()" [class]="styleClass" [ngClass]="classes"
                   [ngModel]="getValueToDisplay()"
                   (keydown)="onKeyDown($event)" (keypress)="onKeyPress($event)"
                   (compositionstart)="onCompositionStart($event)" (compositionend)="onCompositionEnd($event)"
                   (paste)="onPaste($event)"
                   (focus)="onFocus($event)" (blur)="onBlur()"/>
            <input #inputcursor *ngIf="!data.disabled && !data.protected" [style.width]="computeWidth()"
                   [attr.size]="realSize" [attr.maxlength]="realSize" [class]="styleClass??'' + cursorClass??''" [ngClass]="classes"
                   class="absolute-pos-cursor inputCursor"
                   [type]="inputType" readonly tabindex="-1">
        </div>
    `,
    styles: [`
      input:not(:focus) + input.inputCursor {
        display: none;
      }
    `],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: DefaultDynamicFieldComponent,
            multi: true
        },
    ],
})
export class DefaultDynamicFieldComponent extends MaskFieldComponent implements OnDestroy, AfterViewInit {
    /* FIELDS ============================================================== */
    private _input: HTMLInputElement;

    private isComposing: boolean = false;

    private modalReadySubscription: Subscription;

    /**
     * Flag to allow lower case character typing.
     * Defaults to false. lower case type is converted to uppercase.
     */
    @Input() isLCAllowed: boolean = false;
    /**
     * Flag to force initial focus if no others are selected.
     */
    @Input() focused: Boolean;
    /**
     * Edit code to format a standard numeric.
     */
    @Input() edtcde: string;
    /**
     * Edit word to format a standard numeric.
     */
    @Input() edtwrd: string;
    /**
     * The precision for a numeric field
     */
    @Input() digitNb: number;
    /**
     * The scale of a numeric field
     */
    @Input() decSize: number;
    /**
     * Property used to align either left or right and pad with zeroes or blanks.
     */
    @Input() justify: string;

    public realSize: number = 0;
    public initialSize: number = 0;

    private regexDouble: RegExp;
    private regexOnlyDouble: RegExp;

    private origCharset: string;

  /**
   * Inject messsage line service to display field messages
   * @private
   */
  private messageLineService: MessageLineService = inject(MessageLineService);

    /**
     * A cache of the display value. Used to record input value changes (Hack for Selenium IDE recording)
     *
     * @private
     */
    private displayValueCache: string;
    
    // Tabulation Key Code
    private readonly tabKeyCode: number = 0x0009;

    // Initial composition value
    private initialCompositionValue = '';
    
    @ViewChild('input', {static: true}) inputRef: ElementRef;
    @ViewChild('inputcursor', {static: false}) inputCursor: ElementRef;

    /* CONSTRUCTORS ======================================================== */
    constructor(appService: AppService, private transactionService: TransactionService, elRef: ElementRef,
                private configService: ConfigService, private modalService: ModalService, private eventsService: EventsService) {
        super();
        this.setConfigService(configService);
        this.regexDouble = new RegExp('[\' \'' + this.configService.getRegexDBCS() + ']');
        this.regexOnlyDouble = new RegExp('[' + this.configService.getRegexDBCS() + ']');
        this.registerOnChange(() => {
            if (this.initialSize !== 0) {
                this.size = this.initialSize;
            }
            // Apply numeric properties such as scale and precision if applicable
            this.applyNumericProperties();
            // Do not reinitialize the view data if the component was destroyed and recreated.
            // The view data will be retained in such a case since data is not cloned.
            // If the data was cloned, then view data will be undefined.
            if (this.data.viewData === undefined) {
                this.initializeViewData();
            }
            this.computeAttributes();
            let hasError: boolean = this.processMessageLine();
            this.computeFocus(hasError);
        });
        this.initializeCursorModes(appService, elRef);
        if (!this.fieldSyncService.shouldSyncFocusRequests()) {
            this.modalReadySubscription = this.modalService.modalReadyEvent.subscribe((_) => {
                this.computeFocus();
            });
        }
    }

    /* METHODS ============================================================= */
    ngOnInit(): void {
        super.ngOnInit();
        this._input = this.inputRef.nativeElement;
        this.initialSize = this.size;
        this.realSize = this.initialSize;
    }

    ngAfterViewInit(): void {
        if (this.data && this.data.uniqueId) {
            document.addEventListener('highlight-' + this.data.uniqueId, this.processHighlightEvent.bind(this));
        }
    }

    ngOnDestroy(): void {
        this.modalReadySubscription?.unsubscribe();
        if (this.data && this.data.uniqueId) {
            document.removeEventListener(this.data.uniqueId, this.processHighlightEvent);
        }
    }

    /* Compute ------------------------------------------------------------- */
    computeWidth(): string {
        // Needed since the "size"" attribute of input is not precise enough
        return DynamicFieldUtils.computeFontWidth(this._input) * this.realSize + 'px';
    }

    protected override computeAttributes() {
        // Decode attributes
        if (!this.data.attributes) {
            // May happen due to SEND TEXT
            return;
        }
        super.computeAttributes();

        if (this.data && !this.data.attributes.charsetMode) {
            this.data.attributes.charsetMode = CHARSET.SINGLE;
        }
        //Set the line and column in data object
        this.data.attributes.line = this.line;
        this.data.attributes.column = this.column;
        this.computeCharset();
    }

    // Modify sizes and class depending on charset mode
    private computeCharset() {
        this.origCharset = this.data.attributes.charsetMode;
        switch (this.data.attributes.charsetMode) {
            case CHARSET.DOUBLE:
                this.realSize = this.initialSize;
                this.realSize *= 2;
                if (this.parentDiv && this.parentDiv.classList.contains('lgr_' + this.pad(this.size, 2))) {
                    this.parentDiv.classList.remove('lgr_' + this.pad(this.size, 2));
                    this.parentDiv.classList.add("lgr_" + this.pad(this.size * 2, 2));
                }
                this.classes.push('double')
                break;
            case CHARSET.EITHER:
                this.realSize = this.initialSize;
                if (this.regexOnlyDouble.test(this.data.viewData.value.charAt(0))) {
                    this.size = this.realSize / 2 - 1;
                    this.classes.push('double');
                }
                break;
            case CHARSET.ONLY:
                this.realSize = this.initialSize;
                this.size = this.realSize / 2 - 1;
                this.classes.push('double');
                break;
            case CHARSET.MIXED:
                this.classes.push('doubleO');
                this.checkSizeO(this.data.viewData.value, 0, 0);
                this.realSize = this.initialSize;
                break;
        }
    }

    /**
     * Compute focus for this component.
     *
     * @param hasError flag denoting that this component is initialized with an error
     * @private
     */
    private computeFocus(hasError: boolean = false) {
        this.requestFocusIfNecessary(!!this.focused, hasError);
    }

    public override focusCurrentComponent(wrapFocus: boolean = false) {
        this._updateCursor(0, 0, true);
        if (wrapFocus) {
            setTimeout(() => this.focusInput(), 0);
        } else {
            this.focusInput();
        }
    }

    private focusInput() {
        this._input.focus();
    }

    /* Events -------------------------------------------------------------- */

    /* Focus */
    public onFocus(_: FocusEvent) {
        this.triggerEvent('input');
        this.setPosition(this._input['_cursor'], this._input['_cursor']);
        this._cursorStart = this._cursorEnd = this._input['_cursor'];
        if (!this._cursorStart) {
            this.setPosition(0, 0);
        }
        this._updateCursor(0, 0);
        this.checkSizeO(this.data.viewData.value, this._cursorEnd, this._cursorEnd);
        if(this.eventsService.hasPasteData()){
            const newEvent = new ClipboardEvent('paste', {clipboardData: new DataTransfer()});
            newEvent.clipboardData.setData('text', this.eventsService.getPasteData());
            this.onPaste(newEvent);
        }
    }

    public onBlur() {
        this.disableMessage();
        // Selenium IDE hack. Check if Input value is changed not through typing, but through change of input's value.
        if (this._input.value !== undefined && this.displayValueCache !== this._input.value
            && !this.data.protected && !this.data.disabled) {
            if (this.validate(this._input.value)) {
                this.data.viewData.value = this.getRawValue(this._input.value);
            } else {
                this._input.value = this.displayValueCache;
            }
        }
        if (!!this.justify && this.data.viewData && !this.data.disabled && !this.data.protected) {
            this.data.viewData.value = this.justifyValue(this.data.viewData.value);
        }
        this.triggerEvent('change', true);
    }

    public onClickDiv(e: MouseEvent) {
        if (e.target instanceof HTMLInputElement) {
            if (this._input.selectionStart === this.size) {
                this._updateCursor(0, 0, true);
            } else {
                this.setPosition(this._input.selectionStart, this._input.selectionEnd);
                this._updateCursor(0, 0);
            }
        }
    }

    /* Keyboard */
    public onKeyDown(event: KeyboardEvent) {
        this.disableMessage();
        if (this.isComposing) {
            return; //Exit early if IME composition is in progress
        }

        let keyCode = event.which || event.keyCode || -1;

        // Tab key pressed, shift cursor to next field
        if (event.key === 'Tab' || keyCode === 9) {
            if (event.shiftKey && this._cursorStart !== 0) {
                this._updateCursor(0, 0, true);
                return false;
            }
            // Forward (or back if shift down) tab
            this._nextInput(event.shiftKey ? -1 : +1, true);
            return false;
        }

        if (this.inputCursor) {
            this.resetCursorAnimation(this.inputCursor.nativeElement);
        }

        if (event.key === 'a' && event.ctrlKey || this.isFullRange()) {
            this.setPosition(0, this.size);
        }

        let start = this._cursorStart;
        let end = this._cursorEnd;

        // Selenium IDE hack. Check if Input value is changed not through typing, but through change of input's value.
        if ((event.key === 'Enter' || keyCode === 13) && this._input.value
            && this._input.value !== this.displayValueCache && !this.data.protected && !this.data.disabled) {
            this.data.viewData.value = this.getRawValue(this._input.value);
        } else if (event.key === 'Backspace' || keyCode === 8) {
            if (start === end && start === 0) {
                return false;
            } else {
                let newPos: { start: number, end: number } = this.processBackspaceOnView(start, end);
                if (newPos) {
                    this._updateCursor(newPos.start, newPos.end, true);
                }
                return false;
            }
        } else if (event.key === 'Delete' || keyCode === 46) {
            if (start === end && start === this.size) {
                return false;
            } else {
                this.processDeleteOnView(start, end);
                return false;
            }
        } else if (event.key === 'ArrowUp' || keyCode === 38) {
            this._nextInput(-1, true);
            return false;
        } else if (event.key === 'ArrowDown' || keyCode === 40) {
            this._nextInput(+1, true);
            return false;
        } else if (event.key === 'ArrowLeft' || keyCode === 37) {
            if (event.shiftKey) {
                this._updateCursor(-1, 0);
            } else {
                this.setEqualsPosition();
                // Back tab
                if (this._cursorStart === 0) {
                    this._nextInput(-1);
                    return false;
                } else {
                    this._updateCursor(-1, -1);
                }
            }
        } else if (event.key === 'ArrowRight' || keyCode === 39) {
            if (event.shiftKey) {
                this._updateCursor(0, 1);
            } else {
                this.setEqualsPosition();
                // Forward tab
                if (this._cursorStart === this.size - 1) {
                    this._nextInput(+1, true);
                    return false;
                } else {
                    this._updateCursor(1, 1);
                }
            }
        }
    }

    public onKeyPress(event: KeyboardEvent) {

        //If key press in protected fields, show error
        if (this.data.protected) {
            this.messageLineService.displayStandardErrorMessage('Cursor_in_protected_area');
            event.preventDefault();
            event.stopImmediatePropagation();
            event.stopPropagation();
            return false;
        }

        if (this.isComposing) {
            return; //Exit early if IME composition is in progress
        }
        if (!event.key) {
            return false;
        }

        this.data.dirtyField = true;

        if (!this.validate(event.key)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false;
        }

        let value = event.key;
        if (this._cursorStart === 0 && this.origCharset === CHARSET.EITHER) {
            if (!this.regexOnlyDouble.test(value)) {
                this.classes = this.classes.filter(c => c !== 'double');
                this.size = this.realSize;
                this.data.attributes.charsetMode = CHARSET.SINGLE;
                this.data.viewData.value = ' '.repeat(this.size);
            } else {
                this.classes.push('double');
                this.size = this.realSize / 2 - 1;
                this.data.attributes.charsetMode = CHARSET.EITHER;
                this.data.viewData.value = '\u{3000}'.repeat(this.size);
            }
        }

        if (!this.onBeforeInput(value)) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false;
        }

        if (this.isDBCS() && value === ' ') {
            value = '\u{3000}';
        }

        const currentVal = this.data.viewData.value;

        let start = this._cursorStart;
        let end = this._cursorEnd;

        const endO = this._cursorEnd;

        if (start < this.size) {
            end = this._insertViewValue(start, end, value).end;
            end = this.checkSizeO(currentVal, end, endO);
            if (end === this.size) {
                this._nextInput(+1);
            } else {
                this._updateCursor(end, end, true);
            }
        }

        if (this.transactionService.is5250() && !this.isLCAllowed || this.transactionService.is6680()) {
             this.data.viewData.value = this.data.viewData.value.toUpperCase();
        }

        if (start === this.size - 1) {
            this.triggerComplete();
        }
        return false;
    }

    /**
     * Validate the value modified by the user
     *
     * @param value the modification done by the user.
     *
     * @returns true if the modification is valid, otherwise false.
     *
     * @private
     */
    private validate(value: string): boolean {
        if (this.transactionService.is5250() && NumericalService.isNumerical(this.data.numerical)) {
            // In case of Signed numeric, test for 0-9 or blank and sign at the end.
            if (NumericalService.isSignedNumeric(this.data.numerical) && !NumericalService.isValidSignedNumericEntry(value)) {
              this.messageLineService.displayStandardErrorMessage('Only_Chars_0_to_9');
                return false;
            } else if (!NumericalService.isNumericValue(value)) {
              this.messageLineService.displayStandardErrorMessage('Field_requires_numeric_characters');
                return false;
            }
        }
        return true;
    }

    // Prevent input SB on DB fields and DB on SB fields ; Prevent input on numerical fields
    public onBeforeInput(data: string) {
        if (data != null) {
            if (this.transactionService.is6680() && this.data.inputNumerical === "YES" && !/^[-.\d]+$/.test(data)) {
                this.enableMessage(TypeCheckMessage.NUM);
                return false;
            } else if (this.data.attributes.charsetMode !== CHARSET.MIXED) {
                if (this.isDBCS() && !this.regexDouble.test(data)) {
                    this.enableMessage(TypeCheckMessage.DBCS);
                    return false;
                } else if (!this.isDBCS() && this.regexOnlyDouble.test(data)) {
                    this.enableMessage(TypeCheckMessage.SBCS);
                    return false;
                }
            }      
        }
        return true;
    }

    private enableMessage(type: TypeCheckMessage){
        CheckMessageService.enableMessage(type, this);
    }

    private disableMessage() {
        CheckMessageService.disableMessage(this);
    }

    public onCompositionStart(_: any) {
        console.log('Composition Started');
        this.isComposing = true;
        this.initialCompositionValue = this._input.value;
    }

    public onCompositionEnd(event: any) {
        console.log('Composition Ended');
        this.isComposing = false;
        const value = event.data;
        if (!this.onBeforeInput(value)) {
            this._input.value = this.initialCompositionValue;
            this.initialCompositionValue = '';
            return false;
        }
        for (let i = 0; i < value.length; i++) {
            let element = value.charAt(i);
            const ev = new KeyboardEvent('keypress', {key: element});
            this.onKeyPress(ev);

            if (this._cursorEnd === this.size) {
                break;
            }
        }
        return false;
    }

    public onPaste(event: ClipboardEvent) {
        let value: string = event.clipboardData.getData('text');
        let valueRemaining = value;

        for (let i = 0; i < value.length; i++) {
            let element = value.charAt(i);
            const ev = new KeyboardEvent('keypress', {key: element});

            if((this.transactionService.is5250() || this.transactionService.is6680()) 
                && this.configService.terminalConfig.pasteOptions.enableTabFields) {
                let elementCode = value.charCodeAt(i);
                valueRemaining = valueRemaining.slice(1);

                if(value.charCodeAt(i) !== this.tabKeyCode && i + 1 === this.size 
                    && value.length >= i+1 && value.charCodeAt(i + 1) === this.tabKeyCode){
                    valueRemaining = valueRemaining.slice(1);
                }

                if(elementCode === this.tabKeyCode){
                    this._nextInput(+1, true);
                } else {
                    this.onKeyPress(ev);
                }

                if(i + 1 === this.size || elementCode === this.tabKeyCode) {
                    this.eventsService.setPasteData(valueRemaining);
                    break;
                } else {
                    this.eventsService.resetPasteData();
                }
            } else {
                this.onKeyPress(ev);
                if (this._cursorEnd === this.size) {
                    break;
                }
            }
        }
        
        return false;
    }

    private processHighlightEvent(event: any) {
        let value = event.data?.value;
        if (value === 'OFF') {
            this.classes = this.classes.filter((entry) => entry !== 'reverse');
        } else if (value === 'reverse') {
            this.classes.push(value);
        }
        if (event.data?.focus) {
            this.focusCurrentComponent(true);
        }
    }

    /* Navigation ---------------------------------------------------------- */
    private _nextInput(step: number, forceStart?: boolean): void {
        // First get all input-capable elements from the most on top document
        let inputs: NodeListOf<Element>;
        let modals: NodeListOf<Element> = document.querySelectorAll('modal-window');
        if (modals.length > 0) {
            // Most on top modal window
            inputs = modals[modals.length - 1].querySelectorAll(
                '.relative-pos > input:not([type=hidden]):not(:disabled):not(.hidden):not(:read-only):not(.absolute-pos-cursor)');
        } else {
            // Main document
            inputs = document.querySelectorAll(
                '.relative-pos > input:not([type=hidden]):not(:disabled):not(.hidden):not(:read-only):not(.absolute-pos-cursor)');
        }

        // Search for current field in available fields to select the next one
        let input = null;
        for (let i = 0; i < inputs.length; i++) {
            if (inputs.item(i) === this._input) {
                let j = i + step;
                if ((j >= 0) && (j < inputs.length)) {
                    input = <HTMLInputElement>inputs[j];
                } else if (j < 0) {
                    input = <HTMLInputElement>inputs[inputs.length - 1];
                } else if (j >= inputs.length) {
                    input = <HTMLInputElement>inputs[0];
                }
            }
        }
        // Current field not found (maybe because the field is on read-only), select the first available one
        if (input == null && inputs.length > 0) {
            input = <HTMLInputElement>inputs[0];
        }

        // Set focus on the input
        if (input !== this._input) {
            input['_cursor'] = (step > 0 || forceStart) ? 0 : this._insertMode ? input.value.length : input.value.length - 1;
            input.selectionStart = input.selectionEnd = input['_cursor'];
            setTimeout(() => input.focus(), 0);
        }
    }

    protected override _updateCursor(offsetStart: number, offsetEnd: number, reset: boolean = false): void {
        if (reset) {
            this.setPosition(0, 0);
        }
        this.updatePosition(offsetStart, offsetEnd);

        this.computeCssSizeO();
        this.checkCharacterO();
        this.changeCursorMode();
        document.querySelector<HTMLElement>(':root').style.setProperty('--cursor-pos', this._cursorStart.toString());
    }

    /* Value --------------------------------------------------------------- */
    private triggerEvent(event: string, triggerIfModified = false) {
        if (triggerIfModified && !this.data.isModified()) {
            return;
        }
        const tmpVal = this.data.viewData.value;
        const changeEvent = new Event(event, {bubbles: true});
        this._input.dispatchEvent(changeEvent);
        // Revert any change in the view data value caused by input event
        this.data.viewData.value = tmpVal;
    }

    protected override updateInputSelect(start: number, end: number): void {
        this._input.selectionStart = start;
        this._input.selectionEnd = end;
    }

    /**
     * Perform justify on the value.
     *
     * @param value the value to perform justify on
     * @returns The justified value
     * @protected
     */
    protected justifyValue(value: string): string {
        let formatedValue: string;
        let replaceToken: string;
        let replacement: string = '';
        let justifySplit = this.justify.split(' ');
        const align = justifySplit[0];
        const fillWith = justifySplit[1];
        formatedValue = value.trim();
        let replaceLength = this.size - formatedValue.length;
        let isNumerical = NumericalService.isNumerical(this.data.numerical);
        let isSigned = NumericalService.isSignedNumeric(this.data.numerical);
        let isNegative = isSigned ? formatedValue.endsWith('-') : formatedValue.startsWith('-');

        // remove minus sign : left position in number and right position in display
        if (isNumerical && isNegative) {
            if (isSigned) {
                formatedValue = formatedValue.substring(0, formatedValue.length - 1);
            } else {
                formatedValue = formatedValue.substring(1, formatedValue.length);
            }
        }
        if (isSigned) {
            // Reserve space for sign at the end
            replaceLength--;
        }
        // determine the padding token
        if (fillWith === 'BLANK') {
            replaceToken = ' ';
        } else if (fillWith === 'ZERO') {
            replaceToken = '0';
        } else {
            replaceToken = ' ';
        }

        //compute the padding
        for (let i = 0; i < replaceLength; i++) {
            replacement += replaceToken;
        }

        // handle right or left padding
        if (align === 'RIGHT') {
            formatedValue = replacement + formatedValue;
            // for negative numerical and  numerical signed -> ends with the sign
            if (isNumerical && (isNegative || isSigned)) {
                if (isNegative) {
                    replacement = '-';
                } else {
                    replacement = ' ';
                }
                formatedValue = formatedValue + replacement;
            }
        } else {
            // for negative numerical -> ends with the sign
            if (isNumerical && (isNegative)) {
                formatedValue = formatedValue + '-';
            } else if (isSigned) {
                // Signed numeric positive integer has space in the end.
                formatedValue = formatedValue + ' ';
            }
            formatedValue = formatedValue + replacement;
        }


        return formatedValue;
    }

    /**
     * Get the value to be displayed
     */
    getValueToDisplay(): string {
        if (this.data.viewData) {
            this.displayValueCache = this.maskValue(this.data.viewData.value);
        } else {
            this.displayValueCache = this.data.value;
        }
        return this.displayValueCache;
    }

    private isFullRange() {
        return this._input.selectionStart <= 0 && this._input.selectionEnd >= this.size;
    }

    private pad(num: number, size: number) {
        let strNum = num.toString();
        while (strNum.length < size) {
            strNum = '0' + strNum;
        }
        return strNum;
    }

    // Change css variables depending on the number of SB and DB characters
    private computeCssSizeO() {
        if (this.data.attributes && this.data.attributes.charsetMode === CHARSET.MIXED) {
            let single = 0;
            let double = 0;

            for (let i = 0; i < this._cursorStart; i++) {
                const element = this.data.viewData.value.charAt(i);
                if (this.regexOnlyDouble.test(element)) {
                    double++;
                } else {
                    single++;
                }
            }
            document.documentElement.style.setProperty('--num-single', single.toString());
            document.documentElement.style.setProperty('--num-double', double.toString());
        }
    }

    // Change field size depending on the number of SB and DB characters
    private checkSizeO(currentDataValue: string, end: number, endO: number) {
        if (this.data.attributes && this.data.attributes.charsetMode === CHARSET.MIXED) {
            const origSize = this.size;
            this.size = this.realSize;
            const origClasses = this.classes;
            const curVal = this.data.viewData.value.replace(/\s+$/, '');
            for (let i = 0; i < curVal.length; i++) {
                const element = curVal.charAt(i);
                if (i === 0) {
                    if (this.regexOnlyDouble.test(element)) {
                        this.size -= 3;
                    }
                } else {
                    if (this.regexOnlyDouble.test(element) && this.regexOnlyDouble.test(this.data.viewData.value.charAt(i - 1))) {
                        this.size -= 1;
                    } else if (this.regexOnlyDouble.test(element) && !this.regexOnlyDouble.test(this.data.viewData.value.charAt(i - 1))) {
                        this.size -= 3;
                    }
                }
            }
            if (this.size < curVal.length) {
                this.data.viewData.value = currentDataValue;
                this.size = origSize;
                this.classes = origClasses;
                return endO;
            }
        }
        return end;
    }

    // Change cursor display depending on current character
    private checkCharacterO() {
        if (this.data.attributes && this.data.attributes.charsetMode === CHARSET.MIXED) {
            if (this.regexOnlyDouble.test(this.data.viewData.value.charAt(this._cursorStart))) {
                this.classes.push('double');
            } else {
                this.classes = this.classes.filter(c => c !== 'double');
            }
        }
    }

    private isDBCS() {
        return this.data.attributes.charsetMode === CHARSET.EITHER || this.data.attributes.charsetMode === CHARSET.ONLY || this.data.attributes.charsetMode === CHARSET.DOUBLE;
    }

    private applyNumericProperties() {
        if (NumericalService.isNumerical(
            this.data.numerical) && (this.data.attributes !== undefined && this.data.attributes.intensity !== 'HIDDEN')) {
            this.data.hasNumericProperties = true;
            if (this.data.numericProperties === undefined) {
                this.data.initializeNumericProperties();
            }
            this.data.numericProperties.scale = this.decSize;
            this.data.numericProperties.precision = this.digitNb;
        }
    }

    private processMessageLine(): boolean {
        if (this.data.messageLine !== undefined) {
            // Message line associated with this field. Send the message line to the parent component which is responsible for showing this
            // message
            this.messageLineService.addFieldErrorToMsgLine(FieldMessageLine.build(this.data.messageLine, this.line, this.column, this.data.parentIndex));
            this.data.messageLine = undefined;
            return true;
        }
        return false;
    }

    /**
     * Create view data to sync between abs-term and this dynamic component.
     * @private
     */
    private initializeViewData() {
        if (NumericalService.isSignedNumeric(this.data.numerical)) {
            if (!this.data.viewData) {
                this.data.viewData = new SignedNumVD(new NumericProperties(this.decSize, this.digitNb), this.size);
            }
            let formattedValue: string = NumericalService.convertToSignedNumeric(this.data.value, this.decSize);
            formattedValue = this.checkJustification(formattedValue);
            formattedValue = this.formatValue(formattedValue);
            this.data.viewData.initialize(formattedValue);
        } else if (NumericalService.isStandardNumerical(this.data.numerical) || NumericalService.isDigitsOnlyNumeric(this.data.numerical)) {
            let formattedValue: string = this.data.value;
            // If unedited, perform the initial conversion.
            if (!this.edtcde && !this.edtwrd && !this.mask) {
                formattedValue = NumericalService.convertToUneditedStdNum(formattedValue, this.digitNb, this.decSize);
            }
            formattedValue = this.checkJustification(formattedValue);
            formattedValue = this.formatValue(formattedValue);
            // Edit word / Edit code will format according to mask
            formattedValue = this.initializeMask(formattedValue);
            if (!this.data.viewData) {
                this.data.viewData = new StdNumVD(this.configService.getQDECFMT(), formattedValue.length);
            }
            this.data.viewData.initialize(formattedValue);
        } else {
            if (!this.data.viewData) {
                this.data.viewData = new SimpleTextVD(this.size);
            }
            let formattedValue = this.formatValue(this.data.value);
            formattedValue = this.initializeMask(formattedValue);
            this.data.viewData.initialize(formattedValue);
        }
    }

    /**
     * Format the initial value
     *
     * @param value the value to format
     * @returns the formatted value
     * @private
     */
    private formatValue(value: string): string {
        if (!!this.edtcde) {
            return EditCodeService.buildValue(value, this.size, this.decSize, this.edtcde, this.configService.getQDECFMT());
        } else if (!!this.edtwrd) {
            return EditWordService.buildValue(value, this.size, this.edtwrd, this.decSize);
        } else {
            return value;
        }
    }

    /**
     * Check if the value needs to be justified.
     *
     * @param value The value to justify
     * @returns The justified value if the value was justified, original value otherwise.
     * @private
     */
     private checkJustification(value: string): string {
        if (!!this.justify) {
            return this.justifyValue(value);
        } else {
            return value;
        }
    }
}
