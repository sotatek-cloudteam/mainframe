import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
  })
export class AidpService {
    private attentionKeyMap = new Map<string, string>([
        ["ENTER", "E000"],
        ["PF1", "F001"],
        ["PF2", "F002"],
        ["PF3", "F003"],
        ["PF4", "F004"],
        ["PF5", "F005"],
        ["PF6", "F006"],
        ["PF7", "F007"],
        ["PF8", "F008"],
        ["PF9", "F009"],
        ["PF10", "F010"],
        ["PF11", "F011"],
        ["PF12", "F012"],
        ["PF13", "F013"],
        ["PF14", "F014"],
        ["PF15", "F015"],
        ["PF16", "F016"],
        ["PF17", "F017"],
        ["PF18", "F018"],
        ["PF19", "F019"],
        ["PF20", "F020"],
        ["PF21", "F021"],
        ["PF22", "F022"],
        ["PF23", "F023"],
        ["PF24", "F024"],
        ["PA1", "A001"],
        ["PA2", "A002"],
        ["PA3", "A003"]
        // S000:'S000' I000:'I000' C000:'C000'             
    ]);


    public getAidpAttentionKey(attentionKey: string){
        return this.attentionKeyMap.get(attentionKey);
    }
}
