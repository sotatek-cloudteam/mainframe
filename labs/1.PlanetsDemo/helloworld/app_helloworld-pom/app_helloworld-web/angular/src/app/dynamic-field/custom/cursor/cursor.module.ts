import { NgModule } from '@angular/core';
import { DefaultDynamicFieldComponent } from './default-dynamic-field.component';
import { DynamicDatepickerComponent } from './dynamic-datepicker.component';
import { DynamicAutoCompleteComponent } from './dynamic-autocomplete.component';
import { SplitDynamicFieldComponent } from './split-dynamic-field.component';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';

@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        // Used by DynamicAutoCompleteComponent
        MatAutocompleteModule
    ],
    declarations: [
        // Components
        DefaultDynamicFieldComponent,
        DynamicAutoCompleteComponent,
        DynamicDatepickerComponent,
        SplitDynamicFieldComponent
    ],
    exports: [
        DefaultDynamicFieldComponent,
        DynamicAutoCompleteComponent,
        DynamicDatepickerComponent,
        SplitDynamicFieldComponent
    ]
})
/**
 * Exports all the Dynamic field components which have text input and track cursor movement.
 * `DefaultDynamicFieldComponent` is used for Standard input.
 * `SplitDynamicFieldComponent` is used for multiple input tracking the same value.
 * `DynamicAutoCompleteComponent` is used for auto complete input.
 * `DynamicDatepickerComponent` is used for date input.
 */
export class CursorModule {}
