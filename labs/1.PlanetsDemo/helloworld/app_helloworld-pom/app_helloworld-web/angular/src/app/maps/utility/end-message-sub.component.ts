import { Component } from '@angular/core';
import { Window } from "./../commonMap/window";

@Component({
    selector: 'end-message',
    standalone: false,
    templateUrl: './end-message.component.html'
})
export class EndMessageSubComponent extends Window {
    messageline: any = {};
    
    public FIELDS: string[] = ['messageline']
}
