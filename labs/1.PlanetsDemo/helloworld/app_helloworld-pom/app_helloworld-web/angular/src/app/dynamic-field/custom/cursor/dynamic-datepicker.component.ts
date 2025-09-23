import { Component, ElementRef, Input, ViewChild, ViewEncapsulation } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import { AppService } from 'app/app.service';
import { ConfigService } from 'app/config-service';
import { TransactionService } from 'app/term/transaction.service';
import { DynamicFieldUtils } from '../../utility/dynamic-field.utils';
import { CursorDynamicFieldComponent } from './cursor-dynamic-field.component';
declare var $: any;

// <p-calendar #calendar [(ngModel)]="data.value" [dateFormat]="dateFormat" [ngClass]="computeClasses()" dataType="string"></p-calendar>

@Component({
    selector: 'dynamic-datepicker',
	standalone: false,
    template: `
	<div class="relative-pos" tabindex="-1" (click)="onClickDiv($event)">
		<input #input [disabled]="data.disabled" [readonly]="data.protected"
			[attr.id]="id" [attr.name]="id" type={{inputType}} [attr.size]="size" [attr.maxlength]="size"
			[attr.underline]="underline"
			[style.width]="computeWidth()" [class]="styleClass" [ngClass]="classes"
			[(ngModel)]="data.value"
			(keydown)="onKeyDown($event)" (keypress)="onKeyPress($event)"
			(paste)="onPaste($event)"
			(focus)="onFocus($event)" (blur)="onBlur()"/>
		<input #inputcursor *ngIf="!data.disabled && !data.protected && isFocused()" [style.width]="computeWidth()"
			[attr.size]="size" [attr.maxlength]="size" [class]="styleClass" [ngClass]="computeClasses()" class="absolute-pos-cursor" [class]="cursorClass"
			type={{inputType}} readonly tabindex="-1">
	</div>
	`,
	styles: [ `
		.ui-calendar { width: 100%; }
	` ],
	encapsulation: ViewEncapsulation.None,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: DynamicDatepickerComponent,
			multi: true
		},
	],
})
export class DynamicDatepickerComponent extends CursorDynamicFieldComponent {
	/* FIELDS ============================================================== */
	private _input: HTMLInputElement;

	private _focused = false;

	@Input() id: string; // inherited
	@Input() size: number = 0; // inherited
	@Input() styleClass: string;
	@Input() isLCAllowed: boolean = false;
	@Input() focused: Boolean;
	@Input() line: number;
	@Input() column: number;
	@Input() dateFormat: string = "yy-mm-dd";

	@ViewChild('input', { static: true}) inputRef: ElementRef;
	@ViewChild('inputcursor', {static: false}) inputCursor: ElementRef;

	/* CONSTRUCTORS ======================================================== */
  constructor(appService: AppService, private transactionService: TransactionService, elRef: ElementRef, configService: ConfigService) {
		super();
		this.setConfigService(configService);
    this.initializeCursorModes(appService, elRef);
		this.registerOnChange(() => {
			this.computeAttributes();
			this.computeFocus();
		});
	}

	/* METHODS ============================================================= */
	ngOnInit(): void {
		super.ngOnInit();
		this._input = this.inputRef.nativeElement;
	}

	getInputDatepicker(){
		return $('#' + this.id);
	}

	/* Compute ------------------------------------------------------------- */
	computeWidth(): string {
		// Needed since the "size"" attribute of input is not precise enough
		return DynamicFieldUtils.computeFontWidth(this._input) * this.size + 'px';
	}

	private computeFocus() {
		if (this.focused !== null && this.focused) {
			this._input.focus();
		} else if (this.data.initialCursor !== undefined && this.data.initialCursor) {
			this._input.focus();
			console.log('Focus set on field ' + this.id);
			this._updateCursor(0, 0, true);
		} else if (this.data.cursorLine !== undefined && this.data.cursorColumn !== undefined) {
			if (this.line == this.data.cursorLine && (this.column + 1) == this.data.cursorColumn) {
				this._input.focus();
			}
		}
	}

	/* Events -------------------------------------------------------------- */
	/* Focus */
	public onFocus(event: FocusEvent) {
		this.triggerEvent('input');

		if(!this._focused){
			const that = this;
			this.getInputDatepicker().datepicker({
				changeMonth: true,
				changeYear: true,
				dateFormat: this.dateFormat,
				onSelect : (dateText: string) =>  {
					that.data.value = dateText;
					this._nextInput(+1);
				}
			});
			this.getInputDatepicker().datepicker();
			this.getInputDatepicker().datepicker('show');
		}

		this._focused = true;

		this.setPosition(this._input['_cursor'], this._input['_cursor']);
		this._cursorStart = this._cursorEnd = this._input['_cursor'];
		if (!this._cursorStart) {
			this.setPosition(0, 0);
		}

		this._updateCursor(0, 0);
	}

	public onBlur() {
		this.triggerEvent('change', true);
		this._focused = false;
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
		if(this.inputCursor){
			this.resetCursorAnimation(this.inputCursor.nativeElement);
		}

		if(event.key === 'a' && event.ctrlKey || this.isFullRange()){
			this.setPosition(0, this.size);
		}

		let start = this._cursorStart;
		let end = this._cursorEnd;

		if (event.key === 'Backspace') {
			if (start === end && start === 0) {
				return false;
			} else {
				this.processBackspace(start, end)
				return false;
			}
		} else if (event.key === 'Delete') {
			if (start === end && start === this.size) {
				return false;
			} else {
				this.processDelete(start, end);
				return false;
			}		
		} else if (event.key === 'ArrowUp') {
			this._nextInput(-1, true);
			return false;
		} else if (event.key === 'ArrowDown') {
			this._nextInput(+1, true);
			return false;
		} else if (event.key === 'ArrowLeft') {
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
		} else if (event.key === 'ArrowRight') {
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
		} else if (event.key === 'Tab') {
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
		let start = this._cursorStart;
		let end = this._cursorEnd;

		if (start < this.size) {
			if (end === this.size) {
				this._nextInput(+1);
			} else {
				this.setPosition(0, 0);
				this._updateCursor(end,end);
			}
		}

		if(this.transactionService.is5250() && !this.isLCAllowed) {
			this.data.value = this.data.value.toUpperCase();
		}

		return false;
	}

	public onPaste(event: ClipboardEvent) {
		let start = this._cursorStart;
		let end = this._cursorEnd;
		let value: string = event.clipboardData.getData('text');

		if ((end - start) < value.length) {
			// Update selection
			const updateEnd = start + value.length;
			if(!this._insertMode){
				end = start + value.length;
			}
			if (updateEnd > this.size) {
				// Too long value (cut outside)
				value = value.substring(0, value.length - (updateEnd - this.size));
				end = this.size;
			}
		}

		end = this._insertValue(start, end, value).end;
		if (end === this.size) {
			this._nextInput(+1);
		} else {
			this.setPosition(0, 0);
			this._updateCursor(end,end);
		}

		return false;
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
					this.getInputDatepicker().datepicker('hide');
					input['_cursor'] = (step > 0 || forceStart) ? 0 : this._insertMode ? input.value.length : input.value.length - 1;
					input.selectionStart = input.selectionEnd = input['_cursor'];
					input.focus();
					break;
				}
			}
		}
	}

	protected override _updateCursor(offsetStart: number, offsetEnd: number, reset:boolean = false): void {
		this.updatePosition(offsetStart, offsetEnd);
		if(reset){
			this.setPosition(0, 0);
		}

		this.changeCursorMode();
		document.querySelector<HTMLElement>(':root').style.setProperty('--cursor-pos', this._cursorStart.toString());
	}

	/* Value --------------------------------------------------------------- */
	private isAllowed(): boolean {
		return !this._input.getAttribute("mask")
	}

	public isFocused(){
		return this._focused;
	}

	private triggerEvent(event: string, triggerIfModified = false){
		if(triggerIfModified && !this.data.isModified()){
			return;
		}
		const tmpVal = this.data.value;
		const changeEvent = new Event(event, { bubbles: true });
		this._input.dispatchEvent(changeEvent);
		this.data.value = tmpVal;
	}

	protected override setEqualsPosition(){
		this._cursorEnd = this._cursorStart;
	}

	private isFullRange(){
		return this._input.selectionStart <= 0 && this._input.selectionEnd >= this.size;
	}

	protected override updateInputSelect(start: number, end: number): void {
		this._input.selectionStart = start;
		this._input.selectionEnd = end;
	}
}
