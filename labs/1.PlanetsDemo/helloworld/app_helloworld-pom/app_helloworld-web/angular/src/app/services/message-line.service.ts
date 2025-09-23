import {ComponentRef, inject, Injectable, ViewContainerRef} from '@angular/core';
import {Data} from '../term/term.model';
import {LanguageService} from '../language/language-service';
import {TermService} from '../term/term.service';
import {SimpleField, WindowComponents, WindowMap} from '../term/message';
import {TermState} from '../models/term-state.model';
import {StandardMessageLineComponent} from '../maps/utility/standard-messageline.component';
import {AppService} from '../app.service';
import {FieldMessageLine} from '../models/field-message-line.model';

/**
 * This service is used to handle all functions related to message lines and standard array message lines.
 * It is provided by: TermComponent and ModalComponent
 * It is injected in the AbsTermComponent and DefaultDynamicFieldComponent
 */
@Injectable()
export class MessageLineService {

    // will contain the error messages if a system message is displayed
    public errorMessages: string[] = [];

    // window error message
    public windowErrorMessage: string = "";

    // will set the record number
    private currentRecordIndex = 0;

    private helpKeyboardKey: string = 'F1';

    private termState: TermState = inject(TermState);

    constructor(public languageService: LanguageService, public termService: TermService, private appService: AppService) {
    }

  /**
   * Used to clear any standard messgae displayed.
   */
  public displayOrClearEmptyMessage(): void {
        // Get the reference to the "standard-arraymessageline" component
        const component: ComponentRef<any> = this.termState.componentsByName["standard-arraymessageline"];

        // If the component doesn't exist, display a single empty error message and return
        if (!component) {
            this.displaySingleErrorMessage('', false);
            return;
        }

        // If the message is already displayed, clear the error messages
        if (component.instance['messageline'] == this.languageService.translate("Roll_up_down_past_first_last_record")) {
            this.clearErrorMessages();
        }
    }

  /**
   * Add an error message to standard-messageline or standard-arraymessageline based on the component available
   * @param messageIdentifier : Message key used in the language service
   * @param column
   * @param line
   * @param parentIndex
   * @param data : Data object related to the message information
   */
    public addErrorMessage(messageIdentifier: string, column: number, line: number, parentIndex: number, data?: string[]) {
        // Get the translated message string and split it into main and secondary parts
        const [mainMessage, secondaryMessage] = this.languageService.translate(messageIdentifier).split(';,');

        // Format the main message with the provided data if available
        const formattedMainMessage = data ? this.formatMessage(mainMessage, data) : mainMessage;
        let secondMessageline: string = '';
        if (secondaryMessage) {
            const translatedMessage = this.languageService.translateHelp(secondaryMessage);
            secondMessageline = this.formatMessage(translatedMessage, data);
        }

        this.addFieldErrorToMsgLine(FieldMessageLine.build([{data: messageIdentifier}, {data: formattedMainMessage}, {data: secondMessageline}], column, line, parentIndex));

        // // Get the component reference for the "standard-arraymessageline"
        // const component = this.termState.componentsByName['standard-arraymessageline'];
        //
        // // If the component is not found, display a single error message and return
        // if (!component) {
        //     this.displaySingleErrorMessage(formattedMainMessage, false, messageIdentifier, data);
        //     return;
        // }
        //
        // // Get the array of message lines from the component instance
        // const messageLines: any[] = component.instance['arraymessageline'] || [];
        //
        // let newMessage = this.createNewMessage(formattedMainMessage);
        //
        // // If there's a second-level message, translate and format it
        // if (secondaryMessage) {
        //     const translatedMessage = this.languageService.translateHelp(secondaryMessage);
        //     newMessage.messageId = new Data(messageIdentifier, undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
        //     newMessage.secondMessageline = new Data(data ? this.formatMessage(translatedMessage, data) : translatedMessage, undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
        // } else {
        //     // Set the default message id and second-level message
        //     newMessage.messageId = new Data('CPF9897', undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
        //     newMessage.secondMessageline = new Data(this.languageService.translateHelp(newMessage.messageId.value), undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
        // }
        //
        // if (!this.errorMessages || this.errorMessages.length === 0) {
        //     messageLines.push(newMessage);
        // } else {
        //     this.errorMessages.forEach((line) => {
        //         messageLines.push(line);
        //     });
        // }
        //
        // // Update the table metadata and subfile
        // component.instance.updateTableMetadata();
        // component.instance.updateSubfile();
        // component.instance.setRecordNumber(this.currentRecordIndex);
    }

    /**
     * Returns the message component available for that screen
     */
    public getErrorMessageComponent() : any {
        let component: ComponentRef<any> = this.termState.componentsByName["standard-messageline"];
        if (component !== undefined) {
            return component.instance;
        }

        component = this.termState.componentsByName["standard-arraymessageline"];
        if (component === undefined) {
            console.log("No standard messageline on the screen");
            return;
        }

        let arrayMsgLine: any = component.instance["arraymessageline"];
        let current = component.instance.getCurrentRecordNumber();
        let currentMsgs = arrayMsgLine[current];

        return currentMsgs;
    }

  /**
   * Get the error message component for a subfile
   * @param comp : Screen component
   * @param componentName : record name for the subfile
   */
    public getSubfileMessageComponent(comp: string, componentName: string) : any {
        let component: ComponentRef<any> = this.termState.componentsByName[componentName];

        if(component !== undefined){
            return component.instance;
        }
        
        if (componentName in this.termState.subComponentsByName) {
            let index = comp.split("subfileMessageLine_")[1] ?? 0;
            component = this.termState.subComponentsByName[componentName][index];
        }

        return component;
    }


    public displayCheckErrorMessage(data) {
        let chkMsg: SimpleField[] = data.attributes.chkMsg;
        if(chkMsg.length != 3){
            console.log("Expected 3 fields for check message Id");
            return;
        }

        this.addFieldErrorToMsgLine(FieldMessageLine.build(chkMsg, data.attributes.line, data.attributes.column, data.parentIndex));
    }

    /* Check if we need to display the Additional Message Screen (Press F1 on standard-messageline) */
    public isAdditionalMessageAction(e: KeyboardEvent, activeElement: string): boolean {
        return this.helpKeyboardKey === e.key && (activeElement == "messageline" || activeElement.startsWith("subfileMessageLine"));
    }

    /* Build a WindowComponents message to display the Additional Message screen */
    public getAdditionalMessage(activeElement: string, activeComponent: string): WindowComponents {
        let messageIdValue : string = '';
        let messagelineValue : string = '';
        let secondMessagelineValue : string = '';
        let component!: ComponentRef<any>;
        let isSubFileMessage: boolean = activeElement.startsWith("subfileMessageLine");

        if(isSubFileMessage){
            component = this.getSubfileMessageComponent(activeElement, activeComponent);
        } else {
            component = this.getErrorMessageComponent()
        }


        if (component === undefined) {
            return;
        }

        let messageId: any = component[isSubFileMessage ? "subfileMessageId" : "messageId"];
        if (messageId != null) {
            messageIdValue = messageId.value;
        }

        let messageline: any = component[isSubFileMessage ? "subfileMessageLine" : "messageline"];
        if (messageline != null) {
            messagelineValue = messageline.value;
        }

        let secondMessageline: any = component[isSubFileMessage ? "subfileSecondMessageLine" : "secondMessageline"];
        if (secondMessageline != null) {
            secondMessagelineValue = secondMessageline.value;
        }

        this.termState.mainDspMode = this.termState.isExtended ? "*DS4" : "*DS3";
        this.termState.handleDisplayMode("*DS4");
        // Safety check to make sure messageIdValue was set. If it's not set we should have '\u0000's as the value.
        if(!messageIdValue || messageIdValue.includes('\u0000')){
            messageIdValue = 'CPF9897'
            secondMessagelineValue = this.languageService.translateHelp(messageIdValue);
        }

        // Safety check to make sure secondMessagelineValue was set. If it's not set we should have '\u0000's as the value.
        if(!secondMessagelineValue || secondMessagelineValue.includes('\u0000')){
            secondMessagelineValue = "";
        }

        messagelineValue = this.applyFormatControl(this.languageService.translate("Message") + messagelineValue, 78)
        secondMessagelineValue = this.applyFormatControl(secondMessagelineValue, 78)

        let windowMaps : WindowMap[] = [];
        let fields : any[] = [
            {
                id: "messageId",
                data: messageIdValue.trimEnd(),
                attributes: this.termService.createDummyAttributes()
            },
            {
                id: "messageline",
                data: messagelineValue.trimEnd(),
                attributes: this.termService.createDummyAttributes()
            },
            {
                id: "secondMessageline",
                data: secondMessagelineValue.trimEnd(),
                attributes: this.termService.createDummyAttributes()
            }
        ]

        windowMaps.push({
            component: 'additional-message',
            dspMode: "*DS4",
            fields: fields,
            height: 27,
            positionLeft: 0,
            positionTop: 0,
            width: 135,
            mapWidth: 0,
            messageLine: true,
            actionKeys: [ "03", "12"]
        });



        return { command: 'windowComponents', maps: windowMaps};
    }

    /* Process the error and add to message line in case field data was invalid */
    public processError(data: Data, error: string): void {
        if(data.attributes.chkMsg !== undefined){
            this.displayCheckErrorMessage(data);
        } else {
            if(error === 'CPF523A'){
                this.addErrorMessage(error, data.attributes.column, data.attributes.line, data.parentIndex, data.range);
            } else if (error.startsWith("COMP_")) {
                this.addErrorMessage(error.substring(5, error.length), data.attributes.column, data.attributes.line, data.parentIndex, Array.of(data.comp[1]));
            } else {
                this.addErrorMessage(error, data.attributes.column, data.attributes.line, data.parentIndex, data.authorizedValues);
            }
        }
    }

  /**
   * Display any standard IBMi message using standard messageline
   * @param messageIdentifier : Message key used in the language service
   */
  public displayStandardErrorMessage(messageIdentifier: string): void {
        // Translate the messages
        const formattedMessage = this.languageService.translate(messageIdentifier);
        // this.appService.setErrorState(true);
        // Get the component reference for "standard-messageline"
        let component: ComponentRef<any> = this.termState.componentsByName["standard-messageline"];

        //Add messageline only if its a term component OR its a modal window with MSGLIN = true
        if (component === undefined && (!this.termState.isModal || (this.termState.isModal && this.termState.modalProperties.messageLine))) {
          this.addStandardMessageLine();
        }
        //Remove any previously displayed message from the standard-messageline
        this.displayOrClearEmptyMessage();
        this.displaySingleErrorMessage(formattedMessage, true, messageIdentifier);
    }

  /**
   * Displays a single error message using the standard message line
   * @param msg : Translated message to be displayed
   * @param isStdMsg : Boolean to check if the current msg is a standard IBMi message
   * @param secondMsgId : Optional, ID for the secondary message
   * @param data : Optional, Data to be displayed for the msg
   * @param secondMsgLine : Optional, Message to be displayed on the second message line
   */
    displaySingleErrorMessage(msg: string, isStdMsg: boolean, secondMsgId?: string, data?: string[], secondMsgLine?: string) {
        //Set error state to true if its not a modal OR its a modal and its a std msg
        if ((!this.termState.isModal || isStdMsg) && (msg !== '')){
          //lock it
          this.appService.setErrorState(true);
        }

        // Find the existing component for this map
        let component: ComponentRef<any> = this.termState.componentsByName["standard-messageline"]
        if (component === undefined) {
            let parent = this.termState.parentComponent;
            if (parent !== undefined) {
                // Use msg if the MSGLIN == false
                this.windowErrorMessage = msg;
            }
            // // If MSGLIN = true.
            // // let name = this.getName() + '';
            // let name = this.termState.name + '';
            // component = this.termState.componentsByName[name];
            // if (component === undefined) {
            //     return;
            // }
            this.addStandardMessageLine();
            component = this.termState.componentsByName["standard-messageline"];
        }

        let messageline: any = component.instance["messageline"];
        let messageId = component.instance["messageId"];
        if (messageline == null) {
            return;
        }
        // If message line has not previously been set or if we are trying to clear the message, proceed.
        if(!messageline.value || !msg){
            component.instance["messageline"] = new Data((msg && data ? this.formatMessage(msg, data) : msg), undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
            // If we are setting a new message, set the message id and the second-level message too.
            if(msg){
                // If second-level message id has been provided use it, else set the default id CPF9897, then translate the message.
                secondMsgId = secondMsgId ? secondMsgId : 'CPF9897'
                // If we have data to replace the place-holders, then format the message.
                let secondMessage : string;
                if(secondMsgLine){
                  secondMessage = secondMsgLine;
                }
                else{
                  let translatedHelp = this.languageService.translateHelp(secondMsgId);
                  secondMessage = data ? this.formatMessage(translatedHelp, data) : translatedHelp;
                }

                component.instance["messageId"] = new Data(secondMsgId, undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
                component.instance["secondMessageline"] = new Data(secondMessage, undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
            }
        }
    }

    /* Format the message to replace placeholders with provided data */
    public formatMessage(message: string, data: string[]): string {
        const matches = message.match(/&\d/g)
        if(matches && matches.length == 1 && data.length > 1){
            return message.replace(/&\d/g, match => {
                let replacement: string = "";
                for (let i = 0; i < data.length; i++) {
                    replacement += data[i];
                    replacement += i <= data.length-2 ? ", " : "";
                }
                return replacement || match;
            })
        } else {
            return message.replace(/&\d+/g, match => {
                const index = parseInt(match.slice(1)) -1;
                return data[index] || match;
            })
        }
    }

    applyFormatControl(input: string, size: number): string {
        let formattedMessage = '';
        let count = 0;
        let columnOffset = "";
        for (let i = 0; i < input.length; i++) {
            if (input[i] === '&' && (input.substring(i, i + 2) === '&N' || input.substring(i, i + 2) === '&P' || input.substring(i, i + 2) === '&B')) {
                const formatControlChar = input.substring(i, i + 2);
                formattedMessage += '\n';
                if (formatControlChar === '&N') {
                    columnOffset = "  ";
                }
                if (formatControlChar === '&P') {
                    formattedMessage += '    ';
                    columnOffset = "  ";
                } else if (formatControlChar === '&B') {
                    formattedMessage += '  ';
                    columnOffset = "    ";
                }
                count = 0;
                i += 2;
            } else {
                formattedMessage += input[i];
                count++;
                if (count === size) {
                    if (input[i] !== ' ') {
                        let backTrackCount = 0;
                        while (input[i - backTrackCount] !== ' ') {
                            backTrackCount++;
                        }
                        formattedMessage = formattedMessage.slice(0, formattedMessage.length - (backTrackCount)) + '\n' + columnOffset + formattedMessage.slice(formattedMessage.length - (backTrackCount));
                        count = backTrackCount + columnOffset.length;
                    } else {
                        formattedMessage += '\n'+columnOffset;
                    }
                }
            }
        }
        return formattedMessage;
    }

  /**
   * Delete all messages already added
   */
  public clearErrorMessages(): void {
        let component: ComponentRef<any> = this.termState.componentsByName["standard-arraymessageline"];
        if (component === undefined) {
            this.displaySingleErrorMessage('', false);
            return;
        }

        let messageLines: any = component.instance["arraymessageline"];
        if (messageLines === null) {
            return;
        }

        if ((component.instance.isSubfileControl == true) && (component.instance.arraymessageline !== undefined)) {
            component.instance.clearSubfile();
        }
    }

  /**
   * Add a standard message line component dynamically.
   */
  public addStandardMessageLine() {
      let component = this.termState.dynamicTarget.createComponent(StandardMessageLineComponent);

      //Position the message line for modal window
      if(this.termState.isModal && this.termState.modalProperties.messageLine){
          component.instance.startLineNumber = this.termState.modalProperties.height;
      }else{
          component.instance.startLineNumber = this.termState.isExtended ? this.termState.EXTENDED_POSITION : this.termState.STANDARD_POSITION;
      }
        component.instance.overlay = true;
        // this.termState.linesByComponents["standard-messageline"] = [component.instance.startLineNumber];
        this.termState.componentsByName["standard-messageline"] = component;
        this.termState.injectedComponents.push(component);
    }

  /**
   * Remove the standard message line component if required to dismiss a standard error message.
   */
  public removeStandardMessageLine(){
      //Destory the messageline component. At any instance only 1 standard-messageline should be in the injectedComponents
        let index = this.termState.injectedComponents.indexOf(this.termState.componentsByName["standard-messageline"]);
        this.termState.injectedComponents.splice(index, 1);
        this.termState.componentsByName["standard-messageline"].destroy();
        delete this.termState.componentsByName["standard-messageline"];
    }

  //To add the error bind with the field to the standard-arrayMessageLine
  public addFieldErrorToMsgLine(fieldMessageLine: FieldMessageLine) {
    let messageLine = fieldMessageLine.messageLine;
    let messageId = messageLine[0].data;
    let msgLine = messageLine[1].data;
    let secondMsgLine = messageLine[2].data;
    let component: ComponentRef<any> = this.termState.componentsByName["standard-arraymessageline"];

    if (component === undefined) {
      if(secondMsgLine !== undefined){
        this.displaySingleErrorMessage(msgLine, false, messageId, undefined, secondMsgLine);
      } else{
        this.displaySingleErrorMessage(msgLine, false, undefined);
      }
      return;
    }

    let messageLines: any[] = component.instance["arraymessageline"];
    if (messageLines === undefined) {
      return;
    }
    let newMessage = this.createNewMessage(msgLine, messageId, secondMsgLine);

    // If we have a second-level message, assign it with value of secondaryMessageLine.
    newMessage.messageId = new Data(messageId, undefined, this.termService.createDummyAttributes(), true, undefined, undefined);
    newMessage.secondMessageline = new Data(secondMsgLine, undefined, this.termService.createDummyAttributes(), false, undefined, undefined);

    messageLines.forEach((element, index) => {
      if (element.messageline.initialValue == "" || element.messageline.value === newMessage.messageline.value) {
        messageLines.splice(index, 1);
      }
    });
    component.instance.addMessageLine(newMessage, fieldMessageLine.parentIndex, fieldMessageLine.line, fieldMessageLine.column);
  }

  /**
   * Helper method to create a new message object
   * @param msgLine The actual message data
   * @param messageId Message ID of the associated message
   * @param secondMsgLine Secondary message data
   * @private
   */
  private createNewMessage(msgLine: string, messageId?: string, secondMsgLine?: string) {
    let message = new Data(msgLine, undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
    let messageIdData = new Data(messageId??'', undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
    let secondMsgLineData = new Data(secondMsgLine??'', undefined, this.termService.createDummyAttributes(), false, undefined, undefined);
    let FIELDS: any[] = [];
    FIELDS.push([
      {
        type: 'simple',
        id: 'messageId',
        data: messageIdData,
        attributes: this.termService.createDummyAttributes(),
      },
      {
        type: 'simple',
        id: 'messageline',
        data: msgLine,
        attributes: this.termService.createDummyAttributes(),
      },
      {
        type: 'simple',
        id: 'secondMessageline',
        //data: empty,
        data: secondMsgLineData,
        attributes: this.termService.createDummyAttributes(),
      }
    ]);

    let newMessage: {
      [key: string]: any;
    } = {
      messageline: message,
      FIELDS: FIELDS,
      forceModified: false
    };
    return newMessage;
  }
}
