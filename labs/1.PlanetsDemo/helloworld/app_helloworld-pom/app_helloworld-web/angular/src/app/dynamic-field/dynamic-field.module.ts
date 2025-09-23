import { NgModule } from '@angular/core';
import { DynamicFieldCustomModule } from './custom/custom.module';
import { KeyEventDirective, MenuDirective } from './dynamic-field.directive';
import { CommonsModule } from '../commons.module'

@NgModule({
    imports: [
        CommonsModule,
        DynamicFieldCustomModule
    ],
    declarations: [
        KeyEventDirective,
        MenuDirective,
    ],
    exports: [
        CommonsModule,
        DynamicFieldCustomModule,
        KeyEventDirective,
        MenuDirective,
    ]
})
export class DynamicFieldModule {}
