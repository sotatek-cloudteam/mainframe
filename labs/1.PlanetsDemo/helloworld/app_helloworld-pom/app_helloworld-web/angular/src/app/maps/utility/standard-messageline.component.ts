
import { Component, Input, ViewChild } from '@angular/core';
import { Overlay } from "./../commonMap/overlay";

@Component({
    selector: 'standard-messageline',
    standalone: false,
    templateUrl: './standard-messageline.component.html'
})
export class StandardMessageLineComponent extends Overlay {
    @Input() arraymessageline: any;

    messageId: any = {};
    messageline: any = {};
    secondMessageline: any = {};
    messageType: any = {};
    messageSeverity: any = {};

    ngAfterContentChecked(): void {
        if (this.arraymessageline != undefined) {
            this.messageId = this.arraymessageline.messageId;
            this.messageline = this.arraymessageline.messageline;
            this.secondMessageline = this.arraymessageline.secondMessageline;
            this.messageType = this.arraymessageline.messageType;
            this.messageSeverity = this.arraymessageline.messageSeverity;
        }
    }

    public FIELDS: string[] = ['messageId', 'messageline', 'secondMessageline', 'messageType', 'messageSeverity']
}