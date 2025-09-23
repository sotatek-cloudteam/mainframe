import { Injectable } from '@angular/core';
import * as moment from 'moment';

@Injectable({
    providedIn: 'root',
  })
export class DateTimeService {
    public static forcedDate = new Date();
	
    public computeTimestampFromFormat(format: string): string {
        return moment(DateTimeService.forcedDate).format(format);
    }
}
