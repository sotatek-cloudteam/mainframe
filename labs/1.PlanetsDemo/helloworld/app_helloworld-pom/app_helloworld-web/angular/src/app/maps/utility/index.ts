import { EndMessageComponent } from './end-message.component';
import { EndMessageSubComponent } from './end-message-sub.component';
import { StandardMessageLineComponent } from './standard-messageline.component';
import { StandardDisplayMessageComponent } from './standard-displaymessage.component';
import { StandardArrayMessageLineComponent } from './standard-arraymessageline.component';
import { RawtextComponent } from './rawtext.component';
import { AdditionalMessageSubComponent } from './additional-message-sub.component';
import { AdditionalMessageComponent } from './additional-message.component';
import { HelpModalComponent } from './help-modal.component';
import { HelpModalSubComponent } from './help-modal-sub.component';
import { DummyTerminalLineComponent } from './dummy-terminal-line.component';
import { BackErrMessageComponent } from './back-err-message.component';
import { BackErrMessageSubComponent } from './back-err-message-sub.component';

export { UtilityModule } from './utility.module';

export const UtilitySubComponentsMap = {
    "end-message": EndMessageSubComponent,
    "additional-message": AdditionalMessageSubComponent,
    "help-modal": HelpModalSubComponent,
    "standard-arraymessageline": StandardArrayMessageLineComponent,
    "back-err-message": BackErrMessageSubComponent
};

export const UtilityComponentsMap = {
    "standard-messageline": StandardMessageLineComponent,
    "standard-arraymessageline": StandardArrayMessageLineComponent,
    "standard-displaymessage": StandardDisplayMessageComponent,
    "end-message": EndMessageComponent,
    "additional-message": AdditionalMessageComponent,
    "help-modal": HelpModalComponent,
    "rawtext": RawtextComponent,
    "dummy-terminal-line": DummyTerminalLineComponent,
    "back-err-message": BackErrMessageComponent
};

export const UtilityComponents = [
    EndMessageComponent,
    EndMessageSubComponent,
    RawtextComponent,
    StandardMessageLineComponent,
    StandardArrayMessageLineComponent,
    StandardDisplayMessageComponent,
    DummyTerminalLineComponent,
    BackErrMessageComponent,
    BackErrMessageSubComponent
];