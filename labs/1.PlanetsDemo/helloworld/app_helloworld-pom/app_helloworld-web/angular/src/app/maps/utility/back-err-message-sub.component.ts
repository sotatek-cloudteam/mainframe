import { Component } from '@angular/core';
import { Window } from "./../commonMap/window";
import { Router } from '@angular/router';

@Component({
    selector: 'back-err-message',
    standalone: false,
    templateUrl: './back-err-message.component.html'
})
export class BackErrMessageSubComponent extends Window {
    title: any = {};
    errorMessage: any = {};
    errorSubMessage: any = {};
    buttonMessage: any = {};
    
    public FIELDS: string[] = ['title', 'errorMessage', 'errorSubMessage', 'buttonMessage'];
    
    constructor(private readonly router: Router) { 
        super(); 
    }

    public goToTransactionRunner() {
        this.router.navigate(['/']);
    }
}
