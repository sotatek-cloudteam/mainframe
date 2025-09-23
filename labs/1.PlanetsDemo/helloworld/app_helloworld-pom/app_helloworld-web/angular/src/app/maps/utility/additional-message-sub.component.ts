import { Component } from '@angular/core';
import { Window } from "../commonMap/window";
import { LanguageService } from './../../language/language-service';

@Component({
    selector: 'additional-message',
    standalone: false,
    templateUrl: './additional-message.component.html'
})
export class AdditionalMessageSubComponent extends Window {
    messageId: any = {};
    messageline: any = {};
    secondMessageline: any = {};

    constructor(public languageService: LanguageService) {
        super();
    }

    public FIELDS: string[] = ['messageId', 'messageline', 'secondMessageline'];
    // public LINES: number[] = [1, 25]
}
