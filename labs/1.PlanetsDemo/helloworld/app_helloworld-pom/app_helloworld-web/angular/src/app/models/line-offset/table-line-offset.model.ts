import {LineOffset} from './line-offset.model';
import {Injectable} from '@angular/core';

/**
 * This class is provided by Table.component.ts. 
 * It is used to calculate the correct line number of currently selected field
 */
@Injectable()
export class TableLineOffset extends LineOffset{
  /**
   * Property to hold the page start number
   */
  startRrn:number = 1;

  /**
   * Property to hold the number of lines per record
   */
  linesByRow:number = 1;

  /**
   * Calculate the line number of currently selected field in the table
   * @param startLineNumber Start line number for the table
   * @param fieldRrn Rrn value of the current field
   * @returns Line number of the selected field in the table
   */
  calculateLinePos(startLineNumber: number, fieldRrn: number ){
    return startLineNumber + ((fieldRrn - this.startRrn - 1) * this.linesByRow);
  }
}
