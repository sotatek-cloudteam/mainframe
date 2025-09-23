import { Component, Input, ViewEncapsulation } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { DynamicFieldComponent } from '../dynamic-field.component';

@Component({
    selector: 'dynamic-switch',
	standalone: false,
    template: `
		<p-toggleSwitch [inputId]="id" [(ngModel)]="checked" 
			(onChange)="onChange()"></p-toggleSwitch>
	`,
	styles: [ `
		.ui-inputswitch { height: 28px; /* from .form-control */ font-weight: inherit; }
		.ui-inputswitch .ui-inputswitch-on, .ui-inputswitch .ui-inputswitch-off { padding-top: 3px; font-weight: normal; }
		.ui-inputswitch-on { background-color: #B81500 !important; }
	` ],
	encapsulation: ViewEncapsulation.None,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: DynamicSwitchComponent,
			multi: true
		},
	],

})
export class DynamicSwitchComponent extends DynamicFieldComponent {
	/* FIELDS ============================================================== */
	checked: boolean;

	@Input() id: string; // inherited
	@Input() size: number; // inherited

	@Input() onLabel: string;
	@Input() onValue: any = true;
	@Input() offLabel: string;
	@Input() offValue: any = false;

    /* CONSTRUCTORS ======================================================== */
    constructor() {
    	super();
		this.registerOnChange( () => {
			this.checked = (this.value === this.onValue);
		} );
	}

    /* METHODS ============================================================= */
    /* Events -------------------------------------------------------------- */
    onChange() {
    	this.value = this.checked ? this.onValue : this.offValue;
	}
}
