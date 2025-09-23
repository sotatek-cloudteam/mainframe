import { Component, Input, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { AppService } from '../../../app.service';
import { TransactionService } from '../../../term/transaction.service';
import { ConfigService } from 'app/config-service';
import { NumericalService } from '../../utility/numerical.service';
import { DynamicFieldUtils } from '../../utility/dynamic-field.utils';
import { CursorDynamicFieldComponent } from './cursor-dynamic-field.component';
import { SplitProperties, SplitTextVD } from '../../../term/view-data.model';

/**
 * This dynamic-field can be used when you have to split an input field so it will be displayed on two lines
 * The two fields have to point on the same data and their size and offset must be set carefully to handle the display the cursor move
 */
@Component({
	selector: 'split-dynamic-field',
	standalone: false,
	// Spaces are significant => all on one line, no space or break-line outer tag
	template: `
	<div class="relative-pos" tabindex="-1" (click)="onClickDiv($event)">
		<input #input [disabled]="data.disabled" [readonly]="data.protected"
			[attr.id]="id" [attr.name]="id" [type]="inputType" [attr.size]="size" [attr.maxlength]="size"
			[attr.underline]="underline"
			[style.width]="computeWidth()" [class]="styleClass" [ngClass]="classes"
			[ngModel]="getValueToDisplay()"
			(keydown)="onKeyDown($event)" (keypress)="onKeyPress($event)"
			(paste)="onPaste($event)"
			(focus)="onFocus($event)" (blur)="onBlur()" />
		<input #inputcursor *ngIf="!data.disabled && !data.protected" [style.width]="computeWidth()" 
			[attr.size]="size" [attr.maxlength]="size" [class]="styleClass??'' + cursorClass??''" [ngClass]="computeClasses()" class="absolute-pos-cursor inputCursor" 
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
			useExisting: SplitDynamicFieldComponent,
			multi: true
		},
	],
})
export class SplitDynamicFieldComponent extends CursorDynamicFieldComponent implements OnDestroy {
	/* FIELDS ============================================================== */
	private _input: HTMLInputElement;
	@Input() isLCAllowed: boolean = false;
	@Input() focused: Boolean;

  /**
   * The offset of the data which the split dynamic field displays and performs operations on.
   */
	@Input() offset: number = 0;

  /**
   * Group ID. To be shared between all the split dynamic fields with the same ngModel. Informational
   */
  @Input() groupId : string;

  /**
   * Wraps the last word which is typed into the SDF if possible.
   * Sometimes wrapping the word is not possible (case where the number of empty spaces at the end is less than the word length).
   */
  @Input() wordWrap: boolean = false;

	@ViewChild('input', { static: true}) inputRef: ElementRef;
	@ViewChild('inputcursor', {static: false}) inputCursor: ElementRef;

	private splitProperties: SplitProperties;

	/* CONSTRUCTORS ======================================================== */
	constructor(appService: AppService, private transactionService: TransactionService, elRef: ElementRef, configService: ConfigService) {
		super();
		this.setConfigService(configService);
		this.initializeCursorModes(appService, elRef);
		this.registerOnChange(() => {
			this.computeAttributes();
			this.initializeViewData();
			this.computeFocus();
		});
	}

	/* METHODS ============================================================= */
	ngOnInit(): void {
		super.ngOnInit();
		this._input = this.inputRef.nativeElement;
		this.splitProperties = new SplitProperties(this.offset, this.size, this.setFocus.bind(this));
	}
	
	ngOnDestroy(): void {
		if (this.data.viewData instanceof SplitTextVD) {
			(this.data.viewData as SplitTextVD).removeSplitField(this.splitProperties);
		}
	}

	/* Compute ------------------------------------------------------------- */
	computeWidth(): string {
		// Needed since the "size"" attribute of input is not precise enough
		return DynamicFieldUtils.computeFontWidth(this._input) * this.size + 'px';
	}

	private computeFocus() {
		this.requestFocusIfNecessary(!!this.focused);
	}

	public override focusCurrentComponent(wrapFocus: boolean = false) {
		this._updateCursor(0, 0, true);
		if (wrapFocus) {
			setTimeout(() => this._input.focus(), 0);
		} else {
			this._input.focus();
		}
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
	}

	public onBlur() {
		this.triggerEvent('change', true);
	}

	public onClickDiv(e: MouseEvent){
		if ( e.target instanceof HTMLInputElement ) {
			if(this._input.selectionStart === this.size){
				this._updateCursor(0, 0, true);
			} else {
				this.setPosition(this._input.selectionStart, this._input.selectionEnd);
				this._updateCursor(0, 0);
			}
		}
	}

	/* Keyboard */
	public onKeyDown(event: KeyboardEvent) {
		if(this.data.protected){
			return false;
		}

		if(this.inputCursor){
			this.resetCursorAnimation(this.inputCursor.nativeElement);
		}

		if(event.key === 'a' && event.ctrlKey || this.isFullRange()){
			this.setPosition(0, this.size);
		}

		let start = this. offset + this._cursorStart;
		let end = this.offset + this._cursorEnd;

		let keyCode = event.which || event.keyCode || -1;

		if (event.key === 'Backspace' || keyCode === 8) {
			let newPos: {start: number, end: number} = this.processBackspaceOnView(start, end);
			if (this._cursorStart === this._cursorEnd && this._cursorStart === 0) {
				this._nextInput(-1, false);
			} else if (newPos) {
				this._updateCursor(newPos.start - this.offset, newPos.end - this.offset, true);
			}
			return false;
		} else if (event.key === 'Delete' || keyCode === 46) {
			if (start !== end || start !== this.data.viewData.maxLength) {
				this.processDeleteOnView(start, end);
			}
			return false;
		} else if (event.key === 'ArrowUp' || keyCode === 38) {
			this._nextInput(-1, true);
			return false;
		} else if (event.key === 'ArrowDown' || keyCode === 40) {
			this._nextInput(+1, true);
			return false;
		} else if (event.key === 'ArrowLeft' || keyCode === 37) {
			if(event.shiftKey){
				this._updateCursor(-1, 0);
			} else {
				this.setEqualsPosition();
				// Back tab
				if (this._cursorStart === 0) {
					this._nextInput(-1);
					return false;
				} else {
					this._updateCursor(-1,-1);
				}
			}
		} else if (event.key === 'ArrowRight' || keyCode === 39) {
			if(event.shiftKey){
				this._updateCursor(0, 1);
			} else {
				this.setEqualsPosition();
				// Forward tab
				if (this._cursorStart === this.size - 1) {
					this._nextInput(+1, true);
					return false;
				} else {
					this._updateCursor(1,1);
				}
			}
		} else if (event.key === 'Tab' || keyCode === 9) {
			if(event.shiftKey && this._cursorStart !== 0){
				this._updateCursor(0, 0, true);
				return false;
			}
			// Forward (or back if shift down) tab
			this._nextInput(event.shiftKey ? -1 : +1, true);
			return false;
		}
	}

	public onKeyPress(event: KeyboardEvent) {
		if(!event.key){
			return false;
		}

		if(this.transactionService.is5250() && NumericalService.isNumerical(this.data.numerical)) {
			if(!NumericalService.isNumericValue(event.key)){
				document.dispatchEvent( new MessageEvent( 'message', { data: 'Field_requires_numeric_characters' } ) );
				return;
			}
		}

		let start = this._cursorStart;
		let end = this._cursorEnd;
        let value = event.key;
		this.performInsertion(start, end, value);
		return false;
	}

	/**
	 * Set focus to the current input starting from and ending at.
	 * The value of start and end is relative to the current component.
	 * The current offset is not be included in the start and end parameters
	 *
	 * @param start the expected selection start for the input related to the current component
	 * @param end the expected selection end for the input related to the current component
	 */
	public setFocus(start: number, end: number): void {
		this.setPosition(start, end);
		if (start === end) {
			this._input['_cursor'] = start;
		}
		this._input.focus();
	}

	public onPaste(event: ClipboardEvent) {
		let value: string = event.clipboardData.getData('text');
		let start = this._cursorStart;
		let end = this._cursorEnd;
		this.performInsertion(start, end, value);
		return false;
	}

	private performInsertion(start: number, end: number, value: string) {
		if (start < this.size) {
			end = this._insertViewValue(start, end, value).end;
			if (end === this.size) {
				this._nextInput(+1);
			} else if (end > this.size && this.offset + end < this.data.viewData?.maxLength && this.data.viewData instanceof SplitTextVD) {
				if (!(this.data.viewData as SplitTextVD).performCursorPlacement(this.offset + end)) {
					this._nextInput(+1);
				}
			} else {
				this._updateCursor(end, end, true);
			}
		}
		if (this.transactionService.is5250() && !this.isLCAllowed) {
			this.data.viewData.value = this.data.viewData.value.toUpperCase();
		}
		if(start === this.size - 1){
			this.triggerComplete();
		}
	}

	/* Navigation ---------------------------------------------------------- */
	private _nextInput(step: number, forceStart?: boolean): void {
		let inputs: NodeListOf<Element> = document.querySelectorAll('.relative-pos > input:not([type=hidden]):not(:disabled):not(.hidden):not(:read-only):not(.absolute-pos-cursor)');
		for (let i = 0; i < inputs.length; i++) {
			if (inputs.item(i) === this._input) {
				let j = i + step;
				let input = null;
				if ((j >= 0) && (j < inputs.length)) {
					input = <HTMLInputElement>inputs[j];
				} else if(j < 0) {
					input = <HTMLInputElement>inputs[inputs.length - 1];
				} else if(j >= inputs.length){
					input = <HTMLInputElement>inputs[0];
				}

				if(input !== this._input){
					input['_cursor'] = (step > 0 || forceStart) ? 0 : this._insertMode ? input.value.length : input.value.length - 1;
					input.selectionStart = input.selectionEnd = input['_cursor'];
					setTimeout(() => input.focus(), 0);
					break;
				}
			}
		}
	}

	/**
	 * Update the cursor to a particular offset
	 *
	 * @param offsetStart the
	 * @param offsetEnd
	 * @param reset
	 * @protected
	 */
	protected _updateCursor(offsetStart: number, offsetEnd: number, reset:boolean = false) {
		if (reset) {
			this.setPosition(0, 0);
		}
        this.updatePosition(offsetStart, offsetEnd);

		this.changeCursorMode();
		document.querySelector<HTMLElement>(':root').style.setProperty('--cursor-pos', this._cursorStart.toString());
	}

	protected override _insertViewValue(start: number, end: number, value: string): { start: number, end: number } {
		let insertedPos: { start: number, end: number } = super._insertViewValue(this.offset + start, this.offset + end, value);
		insertedPos.start = insertedPos.start - this.offset;
		insertedPos.end = insertedPos.end - this.offset;
		if (this.wordWrap && this.data.viewData instanceof SplitTextVD && insertedPos.end >= this.size) {
			insertedPos.end += (this.data.viewData as SplitTextVD).wrapFromSplit(this.splitProperties);
			insertedPos.start = insertedPos.end;
		}
		return insertedPos;
	}


	/* Value --------------------------------------------------------------- */

	private triggerEvent(event: string, triggerIfModified = false){
		if(triggerIfModified && !this.data.isModified()){
			return;
		}
		const tmpVal = this.data.viewData.value;
		const changeEvent = new Event(event, { bubbles: true });
		this._input.dispatchEvent(changeEvent);
		this.data.viewData.value = tmpVal;
	}

	protected override updateInputSelect(start: number, end: number): void {
		this._input.selectionStart = start;
		this._input.selectionEnd = end;
	}

	getValueToDisplay(): string {
		if (this.data.viewData) {
			return this.data.viewData.value.substring(this.offset, this.offset + this.size);
		} else {
			return this.data.value.substring(this.offset, this.offset + this.size);
		}
	}

	private isFullRange(){
		return this._input.selectionStart <= 0 && this._input.selectionEnd >= this.size;
	}

	/**
	 * Create view data to sync between abs-term and this component and other SDFs.
	 * @private
	 */
	private initializeViewData() {
		let shouldInitialize = false;
		if (!this.data.viewData || !(this.data.viewData instanceof SplitTextVD)) {
			this.data.viewData = new SplitTextVD(this.offset + this.size, this.wordWrap);
			shouldInitialize = true;
		}
		let viewData: SplitTextVD = this.data.viewData as SplitTextVD;
		viewData.addSplitField(this.splitProperties)
		// If the view data was modified, do not initialize as
		//     this was triggered as a result of destroying the component and recreating (possible when using *ngIf).
		// In the case where the view data was not modified but the component was destroyed and created, initializing would not hurt.
		//     Only wrapping will be run again.
		if (shouldInitialize || !viewData.isModifiedByUser()) {
			viewData.initialize(this.data.value);
		}
	}

  protected override _formatValue(value:string = null): string {
    return value;
  }
}
