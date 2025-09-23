import { Injectable } from '@angular/core';
import { ConfigService } from 'app/config-service';
import { DummyTerminalLineComponent } from 'app/maps/utility/dummy-terminal-line.component';
import { DefaultDynamicFieldComponent } from '../custom/cursor/default-dynamic-field.component';

@Injectable({
    providedIn: 'root',
  })
export class CheckMessageService {

    private static configService: ConfigService;
    private static dummy: DummyTerminalLineComponent;
    private static storedMessage: TypeCheckMessage;

    public static setConfigService(configService: ConfigService){
        this.configService = configService;
    }

    public static setDummyTerminalLine(dummy: DummyTerminalLineComponent){
        this.dummy = dummy;
    }   

    public static enableMessage(messageType: TypeCheckMessage, caller: DefaultDynamicFieldComponent) {
        if(this.configService?.terminalConfig.editOptions.enableTypeCheckMessage && this.dummy) {
            let messageToDisplay = "";
            switch(messageType) {
                case TypeCheckMessage.NUM:
                    messageToDisplay = this.configService.terminalConfig.editOptions.numericMessage;
                    break;
                case TypeCheckMessage.DBCS:
                    messageToDisplay = this.configService.terminalConfig.editOptions.dbcsMessage;
                    break;
                case TypeCheckMessage.SBCS:
                    messageToDisplay = this.configService.terminalConfig.editOptions.sbcsMessage;
                    break;
                case TypeCheckMessage.OPTION:
                    messageToDisplay = this.configService.terminalConfig.editOptions.optionMessage;
                    break;
                case TypeCheckMessage.PASSWORD:
                    messageToDisplay = this.configService.terminalConfig.editOptions.passwordMessage;
                    break;
            }
            this.dummy.setCheckMessage(messageToDisplay);
        }
    }

    public static disableMessage(caller: DefaultDynamicFieldComponent) {
        if(this.configService?.terminalConfig.editOptions.enableTypeCheckMessage && this.dummy) {
            this.dummy.setCheckMessage('');
        }
    }

    public static storeMessage(message: TypeCheckMessage) {
        this.storedMessage = message;
    }

    public static enableStoredMessage() {
        if(this.storedMessage) {
            this.enableMessage(this.storedMessage, null);
        }
    }
    
    public static enablePageNumber(pageNumber: string) {
        if (this.dummy) {
            this.dummy.setPageNumber(pageNumber);
        }
    }

    public static disablePageNumber() {
        if (this.dummy) {
            this.dummy.setPageNumber('');
        }
    }
}

export const enum TypeCheckMessage {
    /** The Numerical Message. */
    NUM = "NUM",
    /** The Double Bytes Message. */
    DBCS = "DBCS",
    /** The Single Bytes Message. */
    SBCS = "SBCS",
    /** The Option Message. */
    OPTION = "OPTION",
    /** The Password Message. */
    PASSWORD = "PASSWORD"
}
