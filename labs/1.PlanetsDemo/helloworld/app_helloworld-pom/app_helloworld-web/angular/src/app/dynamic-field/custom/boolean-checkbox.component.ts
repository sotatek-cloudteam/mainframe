import { Component, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';

import { DynamicFieldComponent } from '../dynamic-field.component';

@Component({
    selector: 'boolean-checkbox',
	standalone: false,
    template: `
		<div class="checkbox">
			<label>
				<input [id]="id" type="checkbox" [(ngModel)]="checked" (change)="onChange()" />
				{{ checked ? onLabel : offLabel }}
			</label>
		</div>
	`,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: BooleanCheckboxComponent,
			multi: true
		},
	],
})
export class BooleanCheckboxComponent extends DynamicFieldComponent {
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
