import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import { Location } from '@angular/common';
import { Router } from '@angular/router';

@Component({
    selector: 'transaction-runner',
    standalone: false,
    templateUrl: './transaction-runner.component.html',
    styleUrls: ['./transaction-runner.component.css']
})
export class TransactionRunnerComponent implements OnInit {
    transid: String;

    constructor(
        private router: Router,
        private route: ActivatedRoute,
        private location: Location
    ) { }

    ngOnInit(): void {
    }

    goBack(): void {
        this.location.back();
    }
    
    onKeyDown(event : KeyboardEvent) : void {
        if (event.key === "Enter") {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.runTransaction();
        } else {
            this.resizeInput(event);
        }
    }

    resizeInput(event: KeyboardEvent): void {
        const element = event.target as HTMLTextAreaElement;
        element.style.height = 'auto'; // Reset height
        element.style.height = `${element.scrollHeight}px`; // Set new height based on content
    }

    runTransaction(): void {
        // console.log('Running transaction ' + this.transid + '...')
        var ca = '';
        this.router.navigate(['/term', this.transid, ca], { skipLocationChange: true });
    }
}