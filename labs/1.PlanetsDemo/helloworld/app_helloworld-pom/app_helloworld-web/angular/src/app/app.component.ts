import { Component } from '@angular/core';
import { AppService } from './app.service';
import { Router } from '@angular/router';
import { v4 as uuidv4 } from 'uuid';

@Component({
    selector: 'app',
    standalone: false,
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})
export class AppComponent {
    /* CONSTRUCTORS ======================================================== */
    constructor(
        private appService: AppService, /* necessary for provide appService */
         public router: Router /* For creating links that bypass the transaction runner */
    ) {}

    ngOnInit() {
        if (!sessionStorage.getItem('TabSessionId')) {
            sessionStorage.setItem('TabSessionId', this.generateUUID());
        }
    }

    generateUUID(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }
    
    callTransaction(transId: String, params: []) {
	    this.router.navigate(['/term', transId, '', JSON.stringify(params)], { skipLocationChange: true })
    }
}