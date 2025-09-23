import { Component } from '@angular/core';

@Component({
    selector: 'additional-message',
    standalone: false,
    template: '<modal-window class="modal-window" name="additional-message"></modal-window>'
})
export class AdditionalMessageComponent {
    messageId: any = {};
    messageline: any = {};
    secondMessageline: any = {};

    public FIELDS: string[] = ['messageId', 'messageline', 'secondMessageline'];
}
