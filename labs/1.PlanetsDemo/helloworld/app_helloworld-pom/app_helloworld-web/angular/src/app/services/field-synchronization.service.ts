import {Injectable} from '@angular/core';
import { DynamicFieldComponent } from '../dynamic-field/dynamic-field.component';

/**
 * This class is shared by all the components. It is used to sync between
 * multiple dynamic fields and term components during the initialization phase.
 * For example resolving multiple initial cursor requests.
 */
@Injectable({
  providedIn: 'root'
})
export class FieldSynchronizationService {

  /**
   * Flag denoting that initial focus requests should be synced
   */
  private shouldSyncInitFocusReq: boolean = false;

  /**
   * Store the cursor request which is max priority
   */
  private maxPriorityRequest: CursorRequest;

  /**
   * Store the most priority defaultFocusRequest
   */
  private defaultFocusRequest: CursorRequest;

  /**
   * Store the current component index
   */
  private componentIndex: number = 0;

  /**
   * The input field that most recently held focus. Used to return focus to a field
   * after a pop-up menu is closed.
   */
  private fieldToReturnFocusTo: HTMLInputElement;

  /**
   * Retrieve the field to return focus to
   */
  public getFieldToReturnFocusTo(): HTMLInputElement {
    return this.fieldToReturnFocusTo;
  }

  /**
   * Set the field to return focus to at a later point
   */
  public setFieldToReturnFocusTo(field: HTMLInputElement) {
    this.fieldToReturnFocusTo = field;
  }

  /**
   * Increment the component index
   */
  public incrementComponentIndex() {
    this.componentIndex++;
  }

  /**
   * Reset the current component index
   */
  public resetComponentIndex() {
    this.componentIndex = 0;
  }

  /**
   * Retrieve the current component index
   */
  public getCurrentComponentIndex(): number {
    return this.componentIndex;
  }

  /**
   * Synchronize the initial focus
   * @param shouldSync
   */
  public synchronizeInitialFocusRequests(shouldSync: boolean): void {
    this.shouldSyncInitFocusReq = shouldSync;
  }

  /**
   * Check if the field initialization phase is active
   *
   * @returns true if cursor requests are accepted
   */
  public shouldSyncFocusRequests(): boolean {
    return this.shouldSyncInitFocusReq;
  }

  /**
   * Ignore the previous focus requests
   */
  public clearPreviousFocusRequests() {
    this.maxPriorityRequest = undefined;
    this.defaultFocusRequest = undefined;
  }

  /**
   * Request an initial cursor for line and column.
   * The callback is responsible to focus on the correct input.
   *
   * @param priority The priority of the request.
   * @param subPriority The subPriority of the request.
   * @param line The line number of the field
   * @param column The column number of the field
   * @param fieldToFocus The field to focus
   */
  public requestInitialCursor(
    priority: number,
    subPriority: number,
    line: number,
    column: number,
    fieldToFocus: DynamicFieldComponent
  ): void {
    if (this.maxPriorityRequest) {
      // Set values if the priority of the cursor request is higher.
      if (this.maxPriorityRequest.compare(priority, subPriority, line, column) < 0) {
        this.maxPriorityRequest.setValues(priority, subPriority, line, column, fieldToFocus);
      }
    } else {
      // This request has the most priority
      this.maxPriorityRequest = new CursorRequest(priority, subPriority, line, column, fieldToFocus);
    }
  }

  /**
   * Request a default focus
   *
   * @param line The line number of the field
   * @param column The column number of the field
   * @param fieldToFocus The field to focus
   */
  public requestDefaultFocus(line: number, column: number, fieldToFocus: DynamicFieldComponent) {
    if (this.defaultFocusRequest) {
      // Set values if the priority of the cursor request is higher.
      // Default focus has no sub priority
      if (this.defaultFocusRequest.compare(0, 0, line, column) < 0) {
        this.defaultFocusRequest.setValues(0, 0, line, column, fieldToFocus);
      }
    } else {
      // This request has the most priority
      this.defaultFocusRequest = new CursorRequest(0, 0, line, column, fieldToFocus);
    }
  }

  /**
   * Resolve the field which will have the cursor.
   *
   * @param defaultContainerToFocus The container whose first input will be focused if there are no requests
   * @param idToFocus The ID to focus in the defaultContainer to focus
   *
   * @returns true if a field was successfully selected
   */
  public performInitialCursorPlacement(
    defaultContainerToFocus: any = undefined,
    idToFocus: string = undefined
  ): boolean {
    let selected: CursorRequest = this.maxPriorityRequest?? this.defaultFocusRequest;
    if (selected !== undefined) {
      selected.fieldToFocus.focusCurrentComponent();
      return true;
    } else if(defaultContainerToFocus !== undefined && typeof defaultContainerToFocus.querySelector === 'function') {
      // Fetch the first input and focus it
      setTimeout(() => {
        let inputToFocus = undefined;
        if (idToFocus) {
          inputToFocus = defaultContainerToFocus.querySelector('input:not(:disabled, :read-only)#'+ idToFocus);
        }
        inputToFocus = inputToFocus ?? defaultContainerToFocus.querySelector('input:not(:disabled, :read-only)')
        if (typeof inputToFocus?.focus === 'function') {
          inputToFocus.focus();
        }
      }, 0)
    }
    return false;
  }
}

/**
 * Class to store the requests
 */
class CursorRequest {

  line: number;
  column: number;
  fieldToFocus: DynamicFieldComponent;
  priority: number;
  subPriority: number;

  constructor(priority: number, subPriority: number, line: number, column: number, fieldToFocus: DynamicFieldComponent) {
    this.setValues(priority, subPriority, line, column, fieldToFocus);
  }

  setValues(priority: number, subPriority: number, line: number, column: number, fieldToFocus: DynamicFieldComponent)
  {
    this.priority = priority;
    this.subPriority = subPriority;
    this.line = line;
    this.column = column;
    this.fieldToFocus = fieldToFocus;
  }

  /**
   * Compare current request with another request.
   *
   * @param priority The priority of the other request
   * @param subPriority the sub priority of the other request
   * @param line the line number of the other request
   * @param column the column number of the other request
   *
   * @returns 1 if current request is to be chosen over the other request
   *          0 if current request has same the other request
   *          -1 if current request is not chosen over the other request
   */
  public compare(priority: number, subPriority: number, line: number, column: number): number {
    if (priority > this.priority) {
      return -1;
    } else if (priority == this.priority) {
      if (subPriority > this.subPriority) {
        return -1;
      } else if (subPriority == this.subPriority) {
        if (line < this.line) {
          return -1;
        } else if (line == this.line) {
          if (column < this.column) {
            return -1;
          } else if (column == this.column) {
            return 0;
          }
        }
      }
    }
    return 1;
  }
}
