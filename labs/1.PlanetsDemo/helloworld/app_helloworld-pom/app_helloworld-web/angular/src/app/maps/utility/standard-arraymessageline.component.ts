import { Component, ViewChild } from '@angular/core';
import { Overlay } from "../commonMap/overlay";
import { TableComponent } from "../../table/table.component";
import { AfterViewInit } from '@angular/core';
import {TermState} from '../../models/term-state.model';
import { inject} from '@angular/core';
@Component({
    selector: 'standard-arraymessageline',
    standalone: false,
    templateUrl: './standard-arraymessageline.component.html'
})

export class StandardArrayMessageLineComponent extends Overlay implements AfterViewInit {
    arraymessageline: any = [];
    
    private messageFieldMetadata: Map<any, any> = new Map();
    private termState: TermState = inject(TermState);
    public FIELDS: string[] = ['arraymessageline'];

    public isSubfileControl: boolean = true;

	public updateMetadataFlag: boolean = false;
	
    @ViewChild('table') subfileTable: TableComponent;

    public doPaging(key: KeyboardEvent): boolean {
        return this.subfileTable.keyEvent(key);
    }

    public doDropFold(key: KeyboardEvent): boolean {
        let result = this.subfileTable.handleDropFold(key);
        return result;
    }

    public updateSubfile(): boolean {
        let result = this.arraymessageline.attributes.recordNumber < 0 || (this.arraymessageline.length > 0 && this.arraymessageline.attributes.recordNumber > this.arraymessageline.length);
        if (this.subfileTable !== undefined) {
            this.subfileTable.updateAttribute(this.arraymessageline.attributes);
        }
        return result;
    }

    public clearSubfile(): void {
        if (this.subfileTable !== undefined) {
            this.subfileTable.clear();
        }
        // Clear the stored metadata of the fields associated to message line.
        this.clearMessageFieldMetadata();
    }


    public getCurrentRecordNumber() : number {
        return this.subfileTable.getRecordNumber();
    }
    
    public updateTableMetadata() {
        if(this.subfileTable === undefined){
            this.updateMetadataFlag = true;
        } else{
            this.subfileTable.updateTableMetadata();
        }
    }

    ngAfterViewInit(): void {
        if (this.updateMetadataFlag) {
            this.subfileTable.updateTableMetadata();
            this.updateMetadataFlag = false;
        }
    }
    
    /**
     * Add a new message line to the array component
     *
     * @param newMessage the new message to add
     * @param parentIndex the parent index of the field associated with the message line
     * @param line the line number of the field associated with the message line
     * @param column the column number of the field associated with the message line
     */
    public addMessageLine(newMessage: any, parentIndex: number, line: number, column: number) {
        // Find the index to add the new message
        let index = -1;
        for (let i = 0; i < this.arraymessageline.length; i++) {
            let messageLine = this.arraymessageline[i];
            let fieldMetadata: any = this.messageFieldMetadata.get(messageLine);
            let isMorePriority: boolean = fieldMetadata &&
                (fieldMetadata['parentIndex'] < parentIndex ||
                    (fieldMetadata['parentIndex'] === parentIndex && (fieldMetadata['line'] > line ||
                        (fieldMetadata['line'] === line && fieldMetadata['column'] > column)
                    ))
                );
            if (isMorePriority) {
                index = i;
                break;
            }
        }
        if (index !== -1) {
            this.arraymessageline.splice(index, 0, newMessage)
        } else {
            this.arraymessageline.push(newMessage);
        }
        this.messageFieldMetadata.set(newMessage, {'parentIndex': parentIndex, 'line': line, 'column': column});
        this.updateTableMetadata();
    }

    /**
     * Clear the message field metadata.
     * Usually called when removing all the messages
     */
    public clearMessageFieldMetadata(): void {
        this.messageFieldMetadata.clear();
    }

    public setRecordNumber(recordNumber: number): void {
        this.subfileTable.setRecordNumber(recordNumber);
    }

    public isAtBottom(): boolean {
        return this.subfileTable.isAtBottom();
    }

    public isScreenExtended():string{
        return this.termState.isExtended?"A7":"lgr_col";
    }
}

