import { Input, OnInit, Directive, Output, EventEmitter, inject, ElementRef } from '@angular/core';
import { ControlValueAccessor } from '@angular/forms';

import { Data } from '../term/term.model';
import { ConfigService } from 'app/config-service';
import { FieldSynchronizationService } from '../services/field-synchronization.service';
import { AppService } from '../app.service';
import {TableLineOffset} from "../models/line-offset/table-line-offset.model";
import {LineOffset} from "../models/line-offset/line-offset.model";

/**
 * Class to extends for dynamic-field implementations.
 */
@Directive()
export abstract class DynamicFieldComponent implements OnInit, ControlValueAccessor {
	/* FIELDS ============================================================== */
	private _data: Data;
	private _defaultValue: string;
	protected parentDiv: any;

	public cursorClass: string;
	protected _insertMode = false;

	private configServiceInternal: ConfigService;
	
	underline: boolean;
	
	@Input() id: string;
	@Input() size: number = 0;
	@Input() styleClass: string;
	@Input() line: number;
	@Input() column: number;
	@Output() completeEvent = new EventEmitter();
	
	private _changed = new Array<( data: any ) => void>();
	private _touched = new Array<() => void>();

    // DIs
    protected fieldSyncService: FieldSynchronizationService = inject(FieldSynchronizationService);
	private tableLineOffset: LineOffset = inject(LineOffset, {optional: true});

	/* METHODS ============================================================= */
	/**
	 * Initialize the cursor modes for this component. Also populates the parent div
	 * To be called in the constructor of applicable dynamic fields
	 * @param appService The app service of the app
	 * @param elRef the current component element reference
	 * @protected
	 */
	protected initializeCursorModes(appService: AppService, elRef: ElementRef) {
		// Parent div element (typically contains lgr_ / lgo_ classes)
		if(elRef.nativeElement.parentElement != null && elRef.nativeElement.parentElement.tagName == 'DIV'){
			this.parentDiv = elRef.nativeElement.parentElement;
		}
		this._insertMode = appService.insertMode;
		appService.registerOnInsertModeChange((insertMode) => {
			this._insertMode = insertMode;
			this.changeCursorMode();
		});
		this.changeCursorMode();
	}
	ngOnInit(): void {
		document.querySelector<HTMLElement>(':root').style.setProperty('caret-color', 'transparent');
		this.computeCursorClass();
		this._data = this._initData();
		this._defaultValue = '';
		while (this._defaultValue.length < this.size) {
			this._defaultValue += ' ';
		}
	}

	/* Value --------------------------------------------------------------- */
	protected get defaultValue(): string {
		return this._defaultValue;
	}

	protected _formatValue( value: string = null ): string {
		// Format value
		value = value || this.data.value;
		if (value.length < this.size) {
			value += this._defaultValue.substring(value.length);
			this.data.value = value;
		}
		return value;
	}

	/* Data ---------------------------------------------------------------- */
	get data(): Data {
		return this._data;
	}

	set data( data: Data ) {
		data = this._initData(data);
		if( this._data !== data ) {
			//Retain the unique ID upon data object update.
			data.uniqueId = this._data.uniqueId;
			this._data = data;
			this.changed();
			this.touch();
		}
	}

	private _initData( data: Data = null ): Data {
		// Build default
		let defaultData = new Data( this._defaultValue );
		if (!data) {
			return defaultData;
		}

		// Update data
		let consultMode = data.attributes && (data.attributes.protection === 'PROT' || data.attributes.protection === 'ASKIP')
		if( !consultMode ) {
			data.value = data.value ? this._formatValue(data.value) : defaultData.value;
		}
		return data;
	}
	
	/* CURSOR */
	protected changeCursorMode(){
		this.computeCursorClass();
	}

	private computeCursorClass() {
		if(this.configServiceInternal && this.configServiceInternal.terminalConfig && this.configServiceInternal.terminalConfig.style.insertCursor){
			this.cursorClass = this._insertMode ? 'cursor-' + this.configServiceInternal.terminalConfig.style.insertCursor.toLowerCase() 
			: 'cursor-' + this.configServiceInternal.terminalConfig.style.overwriteCursor.toLowerCase(); 
		}
	}

	protected setConfigService(configService: ConfigService){
		this.configServiceInternal = configService;
	}

	protected triggerComplete(){
		this.completeEvent.emit();
	}

	protected resetCursorAnimation(element: HTMLElement){
		element.style.animation = 'none';
		element.offsetHeight;
		element.style.animation = '';
	}

	/* ControlValueAccessor ------------------------------------------------ */
	changed(): void {
		this._changed.forEach( f => f( this._data ) );
	}

	touch(): void {
		this._touched.forEach( f => f() );
	}

	writeValue( data: any ) {
		this.data = data;
	}

	registerOnChange( fn: ( data: any ) => void ) {
		this._changed.push(fn);
	}

	registerOnTouched( fn: () => void ) {
		this._touched.push(fn);
	}
	
	protected requestFocusIfNecessary(forceFocus: boolean, hasError: boolean = false) {
		if (forceFocus || hasError) {
			this.focusCurrentComponent(true);
		} else if (this.data.initialCursor !== undefined && this.data.initialCursor) {
			this.focusCurrentComponent(true);
		} else if (this.data.cursorLine !== undefined && this.data.cursorColumn !== undefined) {
			if (this.line == this.data.cursorLine && (this.column + 1) == this.data.cursorColumn) {
				this.focusCurrentComponent(true);
			}
		}
	}
    /**
     * Focus the current component
     *
     * @param _wrapFocus Flag determining where to wrap the focus call with a timeout of 0
	 */
	public focusCurrentComponent(_wrapFocus: boolean = false): void {
        // This method is meant to be overridden
    }
    
    // Methods for custom implementations
    public get value(): string {
        return this.data.value;
    }

    public set value( value: string ) {
        this.data.value = this._formatValue( value );
    }
}