import { Component, Input } from '@angular/core';
import { NG_VALUE_ACCESSOR } from '@angular/forms';

import { DynamicFieldComponent } from '../dynamic-field.component';

@Component({
    selector: 'dynamic-radio',
    standalone: false,
    template: `
        <ng-container *ngIf="mode == 'default'">
            <div class="radio" *ngFor="let option of options">
                <label>
                    <input type="radio" [attr.name]="id + '_radio'" [value]="option.value" />
                    {{ option.label }}
                </label>
            </div>
        </ng-container>
		<ng-container *ngIf="mode == 'inline'">
            <label class="radio-inline" *ngFor="let option of options">
                <input type="radio" [attr.name]="id + '_radio'" [value]="option.value" />
                    {{ option.label }}
            </label>
        </ng-container>
	`,
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: DynamicRadioComponent,
			multi: true
		},
	],

})
export class DynamicRadioComponent extends DynamicFieldComponent {
	/* FIELDS ============================================================== */
	@Input() id: string; // inherited
	@Input() size: number; // inherited

	@Input() mode: string = 'default';
	@Input() options: { label: string, value: string }[] = [];

    /* CONSTRUCTORS ======================================================== */
    constructor() {
    	super();
	}
}
