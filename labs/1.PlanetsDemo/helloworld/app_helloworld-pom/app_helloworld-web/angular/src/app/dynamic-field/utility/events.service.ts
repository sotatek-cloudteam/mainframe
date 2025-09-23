import { Injectable } from '@angular/core';
import { ConfigService } from 'app/config-service';
import { TransactionService } from 'app/term/transaction.service';

@Injectable({
    providedIn: 'root',
  })
export class EventsService {
    private static pasteEventData = "";
    
    constructor(private readonly configService: ConfigService, private readonly transactionService: TransactionService) {

    }

    public hasPasteData(): boolean {
        if((!this.transactionService.is5250() && !this.transactionService.is6680()) 
            || !this.configService.terminalConfig.pasteOptions.enableTabFields) {
            return false;
        }
        if(EventsService.pasteEventData !== null && EventsService.pasteEventData && EventsService.pasteEventData.length > 0){
            return true;
        }
    }

    public getPasteData(): string {
        return EventsService.pasteEventData;
    }

    public setPasteData(value: string) {
        EventsService.pasteEventData = value;
    }

    public resetPasteData(){
        EventsService.pasteEventData = "";
    }
}
