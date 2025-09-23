import { Component } from '@angular/core';

@Component({
    selector: 'end-message',
    standalone: false,
    template: '<modal-window name="end-message"></modal-window>'
})
export class EndMessageComponent {
    messageline: any = {};
    
    public FIELDS: string[] = ['messageline']
}
