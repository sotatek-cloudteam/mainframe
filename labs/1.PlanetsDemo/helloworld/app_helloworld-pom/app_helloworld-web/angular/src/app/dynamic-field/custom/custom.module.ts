import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

// Additional
import { DatePickerModule } from 'primeng/datepicker';
import { ToggleSwitchModule } from 'primeng/toggleswitch';

// Components
import { BooleanCheckboxComponent } from './boolean-checkbox.component';
import { DynamicRadioComponent } from './dynamic-radio.component';
import { DynamicSelectComponent } from './dynamic-select.component';
import { DynamicSwitchComponent } from './dynamic-switch.component';


import {
    MatInputModule
  } from '@angular/material/input';
import {
    MatToolbarModule
  } from '@angular/material/toolbar';
import { CursorModule } from './cursor/cursor.module';


@NgModule({
    imports: [
        CommonModule,
        FormsModule,
        ReactiveFormsModule,
        MatInputModule,
        MatToolbarModule,
        // Additional
        DatePickerModule,
        ToggleSwitchModule
    ],
    declarations: [
        // Components
        BooleanCheckboxComponent,
        DynamicRadioComponent,
        DynamicSelectComponent,
        DynamicSwitchComponent
    ],
    exports: [
        CommonModule,
        FormsModule,
        // Additional
        DatePickerModule,
        ToggleSwitchModule,
        // Components
        BooleanCheckboxComponent,
        DynamicRadioComponent,
        DynamicSelectComponent,
        DynamicSwitchComponent,
        //  Cursor tracking components
        CursorModule
    ]
})
export class DynamicFieldCustomModule {}
