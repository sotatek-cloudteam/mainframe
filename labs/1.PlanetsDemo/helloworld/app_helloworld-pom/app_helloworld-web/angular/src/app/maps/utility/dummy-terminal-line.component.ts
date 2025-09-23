import { ChangeDetectionStrategy, ChangeDetectorRef, Component } from '@angular/core';
import { Overlay } from '../commonMap/overlay';
import { Data } from 'app/term/term.model';

@Component({
    selector: 'dummy-terminal-line',
    standalone: false,
    templateUrl: './dummy-terminal-line.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class DummyTerminalLineComponent extends Overlay {
    dummyLine: Data = new Data('', 
        'dummyLine', 
        {  
            intensity: 'LOW',
            protection: 'UNPROT',
            num: 'NO',
            numerical: false,
            color: 'GREEN',
            highlight: 'OFF',
            charsetMode: 'single',
            underline: false,
            columnSeparator: false,
            line: 25,
            column: 8,
            allowLC: false,
            detectability: 'UND'
        }, false);
        
    public FIELDS: string[] = ['dummyLine'];

    public enableInput = false;
    public enableLine = false;
    public isVisibleInput = false;
    private checkMessage = '';
    private pageNumber = '';

    constructor(private readonly cd: ChangeDetectorRef){
        super();
    }

    ngAfterContentChecked(): void {
        this.startLineNumber = 25;
        this.overlay = true;
    }

    computeInputVisibility(): string {
        return !this.isVisibleInput ? 'drk' : '';
    }

    setCheckMessage(value: string){
        this.checkMessage = value;
        this.cd.detectChanges();
    }
    
    setPageNumber(value: string){
        this.pageNumber = value;
        this.cd.detectChanges();
    }
}
