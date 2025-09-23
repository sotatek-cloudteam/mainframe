import {Component, ContentChild, ElementRef, inject, Input, OnInit, TemplateRef, ViewChild} from '@angular/core';
import {LanguageService} from '../language/language-service';
import {TableService} from './table.service';
import {TermState} from '../models/term-state.model';
import {FieldSynchronizationService} from '../services/field-synchronization.service';
import {TableLineOffset} from "../models/line-offset/table-line-offset.model";
import {LineOffset} from "../models/line-offset/line-offset.model";

export enum Paging {
    File = 0,
	Done,
	Component,
	Invalid
}

@Component({
    selector: 'app-table',
    standalone: false,
    templateUrl: './table.component.html',
    providers: [TableService, {provide: LineOffset, useClass: TableLineOffset}]
})
export class TableComponent implements OnInit {
    @ContentChild(TemplateRef) templateRef: TemplateRef<any>;
    @ViewChild('tableContainer', { static: true}) tableContainerRef: ElementRef;
    
    //DIs
    /**
     * Inject the table service provided by this component.
     */
    private tableService: TableService = inject(TableService);

    /**
     * Inject the term state provided by the parent term component
     */
    private termState: TermState = inject(TermState);
    
    /**
     * Inject the table service provided by this component.
     */
    private fieldSyncService: FieldSynchronizationService = inject(FieldSynchronizationService);

    /**
     * Constructor inject the table line offset
     *
     */
    private tableLineOffset: TableLineOffset;

    /**
     * Flag used to denote if focus should be performed when setting the record number
     */
    private shouldPerformFocus: boolean = false;
    
    /**
     * The ID of the element to focus
     * @private
     */
    private idToFocus: string = undefined
    
    @Input()
    public set rows(rows: any[]) { this.tableService.initRows(rows); }
    public get rows(): any[] { return this.tableService.getRows() }
    @Input() nbLinesByRow: number;
    @Input() nbDisplayedEntries: number;
    @Input() nbOfColumns: number = 1;
    @Input() startLineNumber: number;
    @Input() windowOffset: number;
    @Input() isArrayMessageLine: boolean;

    /* CONSTRUCTORS ======================================================== */
    constructor( private languageService: LanguageService, lineOffset: LineOffset) {
        if(lineOffset instanceof TableLineOffset){
            this.tableLineOffset = lineOffset
        }       
    }

    // End of array
    private end: boolean;
    private bottom: boolean;

    // If valued to "MORE" used pair More/Bottom
    // else used pair +/[empty]
    private pageDown: String;

    // Index from which display array items
    private recordNumber: number = 0;
    private top: true;

    // Nb record by page
    private numberOfRecordsPerPage: number = 0;

    private labelMore:string  = "More";
    private labelBottom:string = "Bottom";

    private dspMode: string = "*DS3";

    // Display table or not
    public display: true;

    // Drop status : TRUE = folded (expanded); FALSE = dropped (collapsed or truncated)
    public dropped: boolean = false;
    public dropCommand: String;
	public foldCommand: String;
    public dropFoldClassName: string = undefined;

    ngOnInit(): void {
        this.tableLineOffset.linesByRow = this.nbLinesByRow
        if (this.rows['attributes'] !== undefined) {
       		let attributes = this.rows['attributes'];
	        this.dropCommand = attributes.dropCommand;
	        this.foldCommand = attributes.foldCommand;

            // Initialize dropped flag and relative className
            if(this.dropCommand && this.foldCommand) {
                this.dropFoldClassName = 'fold_line';
                this.dropped = true;
            } else if (this.foldCommand) {
                this.dropFoldClassName = 'fold_line';
                this.dropped = true;
            } else if (this.dropCommand) {
                this.dropFoldClassName = 'drop_line';
                this.dropped = false;
            }
            this.dspMode = attributes.dspMode;
            this.end= attributes.end;
            if (this.rows.length > 0) {
                this.pageDown = attributes.pageDown;
                this.top = attributes.top;
                this.numberOfRecordsPerPage = attributes.numberOfRecordsPerPage;
                this.display = attributes.display;
                if (attributes.recordNumber && this.top) {
                  this.setRecordNumber(attributes.recordNumber - 1);
                } else if (attributes.recordNumber) {
                  let numEntries = this.getNbDisplayedEntries();
                  this.setRecordNumber(Math.floor((attributes.recordNumber - 1) / numEntries) * numEntries);
                } else {
                  this.setRecordNumber(0);
                }
                this.changeLabels();
            }
        }
    }
    
    /**
     * Try to perform paging.
     * Returns true if paging is unsuccessful, otherwise false.
     *
     * @param event The keyboard event
     */
    public keyEvent(event: KeyboardEvent): boolean {
        if (event.key === 'PageDown') {
            if (!this.isEndOfBuffer()) {
                this.shouldPerformFocus = true;
                this.computeDefaultElementToFocus(true);
                this.setRecordNumber(this.recordNumber + this.getNbDisplayedEntries(), event.key);
                return false;
            }
        } else if (event.key === 'PageUp') {
            if (this.recordNumber !== 0) {
                let newStart: number = this.recordNumber - this.getNbDisplayedEntries();
                if (newStart < 0) {
                    newStart = 0;
                }
                this.shouldPerformFocus = true;
                this.computeDefaultElementToFocus(false);
                this.setRecordNumber(newStart, event.key);
                return false;
            }
        }
        return true;
    }
    
    /**
     * Compute the element which needs to be focused by default
     *
     * @param isPageDown Flag denoting if this is a page down operation or page up
     * @private
     */
    private computeDefaultElementToFocus(isPageDown: boolean) {
        this.idToFocus = undefined;
        // Fetch the currently focused field
        let focusedField: Element = this.tableContainerRef?.nativeElement.querySelector('dynamic-field input:focus');
        if (focusedField?.id && focusedField.id.trim() !== '') {
            // Extract the currently focused field id
            let focusedID: string = focusedField.id;
            let indexes: string[] = focusedID.match(/[0-9]+$/);
            if (indexes.length > 0) {
                let nextNumber:number = isPageDown ?
                    Number(indexes[0]) + this.getNbDisplayedEntries(): Number(indexes[0]) - this.getNbDisplayedEntries();
                // For example if focused id is opt_0, then to focus id will be opt_8 assuming page size is 8
                this.idToFocus = focusedID.substring(0, focusedID.length - indexes[0].length) + String(nextNumber);
            }
        }
    }

    isEndOfBuffer() : boolean {
      return this.tableService.isLastPage(this.recordNumber, this.getNbDisplayedEntries());
    }

    isAtBottom() : boolean {
        // End of buffer

        let endAll = this.isEndOfBuffer();

        // AND end backend flag
        endAll = endAll && this.end;
        return endAll;
    }

    setRecordNumber(pageStart: number, action: string = undefined) {
        if (this.tableService.isValidRow(pageStart)) {
            let focus = this.shouldPerformFocus;
            let idToFocus = this.idToFocus;
            this.idToFocus = undefined;
            this.shouldPerformFocus = false;
            if (focus) {
                this.fieldSyncService.clearPreviousFocusRequests();
            }
            this.fetchActiveRows(pageStart, action).then(() => {
                this.recordNumber = pageStart;
                this.tableLineOffset.startRrn = pageStart;
                this.bottom = this.isAtBottom();
                if (focus) {
                    this.fieldSyncService.performInitialCursorPlacement(this.tableContainerRef?.nativeElement, idToFocus);
                }
            })
        }
    }

    getRecordNumber() : number {
        return this.recordNumber;
    }

    public updateAttribute(attr: any) {
        if (attr.display) {
          // Update the rows in the metadata
          this.tableService.initRows(this.rows);
        }
        if(attr.dspMode){
            this.dspMode = attr.dspMode;
        }
        if(attr.dropCommand){
            this.dropCommand = attr.dropCommand;
        }
        if(attr.foldCommand){
            this.foldCommand = attr.foldCommand;
        }
        if(attr.pageDown){
            this.pageDown = attr.pageDown;
        }
        if(attr.end != null){
            this.end = attr.end;
        }
        if(attr.top != null){
          this.top = attr.top;
        }
        // Set the record number based on the attributes
        if (!attr.recordNumber || attr.recordNumber < 0) {
            this.setRecordNumber(0);
        } else if(this.rows.length != 0) {
            let newRecNbr = attr.recordNumber - 1;
            let tableLength = this.tableService.getTableLength();
            if (!this.tableService.isValidRow(newRecNbr)) {
              this.setRecordNumber(tableLength - 1);
            } else if (newRecNbr >= tableLength) {
              this.setRecordNumber(tableLength - 1);
            } else if (!this.top) {
              let numEntries = this.getNbDisplayedEntries();
              this.setRecordNumber(Math.floor(newRecNbr / numEntries) * numEntries);
            } else {
              this.setRecordNumber(newRecNbr);
            }
        }
        if(attr.display){
            this.display = attr.display;
        }
        this.changeLabels();
	}

    changeLabels(): void {
        if (this.pageDown == "MORE" ) {
            this.labelMore  = "More";
        } else if (this.pageDown == "PLUS" ) {
            this.labelMore  = "Plus";
            this.labelBottom = "Empty";
        } else {
            this.labelMore  = "Empty";
        }
    }

    getEndLabel(): String {
        if (this.end && this.isAtBottom()) {
            if (!this.isArrayMessageLine) {
                return this.languageService.translate(this.labelBottom);
            }
        } else {
            return this.languageService.translate(this.labelMore);
        }
    }

    // Compute class to apply for indicator label
    positionLabel(): String {

        let classes = "tab_end_ind ";
        let isA7: boolean = this.dspMode === "*DS4";
        let defaultWidth = isA7 ? 132 : 80;
        
        if (this.isArrayMessageLine) {
 
            classes += "lgo_" + (defaultWidth /** *DS3 or *DS4 width */ - 2 /** the length of "+ " label */) + " ";
            classes += "lgr_03 ";
            classes += "white";
            return classes;
        }

        if (this.isAtBottom()) {
            let lengthLabel = this.languageService.translate(this.labelBottom).length;
            // -1
            //lengthLabel -= lengthLabel;
            if ( this.labelBottom == "Bottom") {
                if (this.windowOffset == undefined) {
                    classes += "lgo_" + (defaultWidth - lengthLabel)  + " ";
                } else {
                    classes += "lgo_" + (this.windowOffset - 1 - lengthLabel) + " ";
                }
                classes += "lgr_0" + lengthLabel + " ";
            } else {
                // Nothing, disable by ngIf
                return "";
            }
        } else {
            let lengthLabel = this.languageService.translate(this.labelMore).length;
            if ( this.labelMore == "More") {
                if (this.windowOffset == undefined) {
                    classes += "lgo_" + (defaultWidth - lengthLabel)  + " ";
                } else {
                    classes += "lgo_" + (this.windowOffset - 1 - lengthLabel) +  " ";
                }
                classes += "lgr_0" + lengthLabel + " ";
            } else {
                classes += "lgo_" + (defaultWidth - 2) + " ";
                classes += "lgr_03 ";
            }
        }

        classes += "white";

        return classes;
    }

    getNbDisplayedEntries(): number {
        if (this.dropped || (!this.dropCommand && !this.foldCommand)) {
            return this.nbDisplayedEntries;
        }

        let nbDisplayedEntriesLoc = this.nbDisplayedEntries;
        if (this.nbLinesByRow) {
            nbDisplayedEntriesLoc = this.nbDisplayedEntries * this.nbLinesByRow;
        }

        return nbDisplayedEntriesLoc;
    }

  // Return true if the element must be displayed
  displayed(index: number): boolean {
    if (this.rows[index] === undefined) {
      return false;
    }
    let display = false;

    let nbFirst :number = this.recordNumber;
    let nbLast :number = nbFirst + this.getNbDisplayedEntries() - 1;

    if (index >= nbFirst && index <= nbLast) {
      display = true;
    }
    return display;
  }

    // Compute the number of empty lines in the last page
    getNbEmptyLines(): number {
        // There will be empty lines only when end of buffer
        if (this.isEndOfBuffer()) {
            let nbRows: number = Math.ceil(this.getNbDisplayedEntries() / this.nbOfColumns);
            let emptyRecs: number = nbRows - (this.tableService.getTableLength() - this.recordNumber);
            if (emptyRecs < 0) {
                return 0;
            }
            if (this.dropped || (!this.dropCommand && !this.foldCommand)) {
              // Folded
              return emptyRecs * this.nbLinesByRow;
            } else {
              // Truncated
              return emptyRecs;
            }
        }
        return 0;
    }

    // Compute style to apply in order to put "+" indicator label on last displayed line
    overlayLastLine() {

        let style = "{";
        if (this.isArrayMessageLine || (this.labelMore == "Plus" && !this.isAtBottom())) {
            style += '"margin-top": "-1.4em"';
        } 
        style += "}";
        return JSON.parse(style);
    }

    public isDropped() : boolean {
    	return this.dropped;
    }

    public handleDropFold(event: KeyboardEvent) {

        let className: string = undefined
        if('C' + event.key === this.dropCommand) {
            className = 'drop_line';
        } else if('C' + event.key === this.foldCommand) {
            className = 'fold_line';
        }
        if(!className) {
            return false;
        }

        // Switch drop flag
        this.dropped = !this.dropped;

        this.setRecordNumber(Math.trunc(this.recordNumber / this.getNbDisplayedEntries()) * this.getNbDisplayedEntries())

        this.bottom = this.isAtBottom();

        return this.updateFolding();


	}

    public ngAfterViewChecked(): void {
        this.updateFolding();
    }

    updateFolding() : boolean {

       if(this.dropFoldClassName) {
            let displayStyle = this.dropped ? 'block' : 'none';
            [].forEach.call(document.getElementsByClassName(this.dropFoldClassName), function(el) {
                el.style.display = displayStyle;
            });

            return true;
        }
        return false;
    }
    
    /**
     * Listen for keydown events for pageup and page down
     * @param event the keyboard event
     * @protected
     */
    protected onKeyDown(event: KeyboardEvent) {
        if (this.display && event.key === 'PageDown' || event.key === 'PageUp') {
            let pagingResult: boolean = !this.keyEvent(event);
            // Stop bubbling
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            // Dispatch the after paging event for additional processing inside abs
            document.dispatchEvent(new CustomEvent('afterPaging', {
                detail: {
                    pagingResult: pagingResult,
                    event: event
                }
            }));
        }
    }

    /**
     * Listen for Wheel down event and perform paging.
     *
     * @param event the wheel event
     * @protected
     */
    protected onWheel(event: WheelEvent) {
        if (!this.display) {
            return;
        }
        let keyValue = "";
        // Determine the keyboard even to simulate
        if (event.deltaY < 0) {
            // Detected scroll up action, simulate 'PAGEUP'
            keyValue = "PageUp";
        } else if (event.deltaY > 0) {
            // Detected scroll down action, simulate 'PAGEDOWN'
            keyValue = "PageDown";
        } else {
            return;
        }
        const keyEvent = new KeyboardEvent("keydown", {
            key: keyValue,
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            bubbles: true
        });
        this.onKeyDown(keyEvent);
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
    }

  showFooter(): boolean {
    return this.rows.length > 0 && this.getEndLabel() !== "";
  }

  /**
   * Fetch the active rows if not present in the cache
   *
   * @param start The starting row
   * @param action The key event
   */
  private fetchActiveRows(start: number, action: string = undefined) {
    return this.tableService.fetchPage(start, this.getNbDisplayedEntries(), this.termState, action);
  }

  /**
   * Clear the table
   */
  public clear() {
    this.rows.length = 0;
    this.tableService.updateRows();
  }

  /**
   * Update the table metadata after an operation on rows
   */
  public updateTableMetadata() {
    this.tableService.updateRows();
    this.bottom = this.isAtBottom();
  }
}

