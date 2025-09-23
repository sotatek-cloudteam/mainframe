import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';

import Ajv, {ValidateFunction} from "ajv"

import { BackendMessage } from './message';
import { AppConfigurationMessage, TerminalKind } from '../configuration-message.module';
import * as schema from './message.schema.json'
import { ConfigService } from 'app/config-service';

@Injectable()
export class TransactionService {

    /** URL to web api */
    private transactionsUrl: string;

    /** The global configuration */
    public configuration: AppConfigurationMessage;


    private validator: Ajv;
    private validateBackendMessage: ValidateFunction;

    private configService: ConfigService;

    constructor(private http: HttpClient) {
    }

    /** Called during application initialization (V7-179) */
    public configure(configuration: AppConfigurationMessage, configService: ConfigService) {

        this.configuration = configuration;
        this.configService = configService;

        if (this.configuration.backendURL === undefined) {
            throw new Error('Server did not provide us with backend URL, cannot initialize: ' + configuration);
        }

        let url: string = this.configuration.backendURL;
        if (!url.endsWith('/')) {
            url += '/';
        }

        this.transactionsUrl = url + 'transaction';
        console.log('TransactionService initialized with URL ' + this.transactionsUrl);

        this.configuration.useModernLegacyStyle = configuration.useModernLegacyStyle !== undefined && configuration.useModernLegacyStyle;

        // Load and compile JSON schema for messages.
        //let schema = require('./message.schema.json');
        this.validator = new Ajv();
        this.validateBackendMessage = this.validator.compile(schema);
        console.log('Messages validation set up');
    }

    private handleError(error: any): Promise<any> {
        console.error('An error occurred', error); // for demo purposes only
        if(this.configService.terminalConfig.backErrMessages?.enableMessage) {
            let title = ""
            let errorMessage = "";
            let errorSubMessage = "";
            switch (error.status) {
                case 500:
                    title = this.configService.terminalConfig.backErrMessages.error500Message?.title;
                    errorMessage = this.configService.terminalConfig.backErrMessages.error500Message?.message;
                    errorSubMessage = this.configService.terminalConfig.backErrMessages.error500Message?.subMessage;
                    break;
                case 504:
                case 502:
                case 503:
                case 408:
                    title = this.configService.terminalConfig.backErrMessages.error504Message?.title;
                    errorMessage = this.configService.terminalConfig.backErrMessages.error504Message?.message;
                    errorSubMessage = this.configService.terminalConfig.backErrMessages.error504Message?.subMessage;
                    break;
                default:
                    title = this.configService.terminalConfig.backErrMessages.defaultErrorMessage?.title;
                    errorMessage = this.configService.terminalConfig.backErrMessages.defaultErrorMessage?.message;
                    errorSubMessage = this.configService.terminalConfig.backErrMessages.defaultErrorMessage?.subMessage;
                    break;
            }
            return Promise.resolve(this.handleBackendMessage(this.spoofBackendMessage(title, errorMessage, errorSubMessage, error.status)))
        }
        return Promise.reject(error.message || error);
    }

    private hidePassword(message: any) {
        let msg = Object.assign({}, message)
        if (msg.fields !== undefined) {
            msg.fields = msg.fields
                .map(field => {
                    if (field.ispassword !== undefined) {
                        delete field.ispassword
                        return { ...field, value: field.value.replace(/./g, '*') };
                    }
                    return field;
                });
        }
        return msg;
    }

    fetchData(messageToSend: any): Promise<BackendMessage> {
      return this.runTransaction(undefined, messageToSend, undefined);
    }

    runTransaction(transid: String, message: any, parameters?: []): Promise<BackendMessage> {
        // Do not encore transid in the URL anymore
        message['transactionId'] = transid;
        message['parameters'] = parameters;
        const url = `${this.transactionsUrl}`;
        console.log('Starting transaction on backend (' + url + ')');
        console.log(this.hidePassword(message));

        // Use a POST to be able to send JSON message to the server
        const httpOptions = {
            headers: new HttpHeaders({
              'Content-Type':  'application/json',
              'X-Auth-Token' : sessionStorage.getItem("TabSessionId")
            })
          };

        return this.http.post(url, message, httpOptions)
            .toPromise()
            .then((response) => {
                // https://stackoverflow.com/a/33851796
                return this.handleBackendMessage(response);
            })
            .catch((error) => this.handleError(error));
    }

    private handleBackendMessage(response): BackendMessage {
        console.log('Response from backend received', response)


        // Since TypeScript cannot type-validate JSON at runtime,
        // use a JSON schema generated fron TypeScript classes
        if (!this.validateBackendMessage(response)) {
             // Chrome-debug friendly
            console.error('Backend JSON message validation error: "' + this.validator.errorsText(this.validateBackendMessage.errors) + '"', this.validateBackendMessage.errors);
            console.error('invalid json: "' + response + '"', response);
            throw new Error('Backend JSON message validation error');
        }

        // Seems legit
        return response as BackendMessage;
    }

    public is5250() {
        return this.configuration.emulatedTerminal == TerminalKind.Term5250;
    }

    public is6680() {
    	return this.configuration.emulatedTerminal == TerminalKind.Term6680;
    }

    private spoofBackendMessage (title : string, errorMessage: string, errorSubMessage: string, status: number) : Object {
        const buttonMessage = this.configService.terminalConfig.backErrMessages.buttonMessage;
        if (this.configService.terminalConfig.backErrMessages.displayStatus) {
            title += " / Status: " + status;
        }
        if (this.configService.terminalConfig.backErrMessages.displayTimestamp) {
        	title += " / " + new Date(Date.now()).toUTCString();
        }
        return {
            "messages": [
                {
                    "command": "windowComponents",
                    "maps": [
                        {
                            "component": "back-err-message",
                            "overlay": false,
                            "startLineNumber": 0,
                            "fields": [
                                {
                                    "type": "simple",
                                    "id": "title",
                                    "data": title,
                                    "attributes": {
                                        "intensity": "HIGH",
                                        "protection": "PROT",
                                        "color": "white"
                                    }
                                },
                                {
                                    "type": "simple",
                                    "id": "errorMessage",
                                    "data": errorMessage,
                                    "attributes": {
                                        "intensity": "NORM",
                                        "protection": "PROT",
                                    }
                                },
                                {
                                    "type": "simple",
                                    "id": "errorSubMessage",
                                    "data": errorSubMessage,
                                    "attributes": {
                                        "intensity": "NORM",
                                        "protection": "PROT",
                                    }
                                },
                                {
                                    "type": "simple",
                                    "id": "buttonMessage",
                                    "data": buttonMessage,
                                    "attributes": {
                                        "intensity": "NORM",
                                        "protection": "PROT",
                                    }
                                },
                                {
                                    "type": "simple",
                                    "id": "status",
                                    "data": status,
                                    "attributes": {
                                        "intensity": "HIGH",
                                        "protection": "PROT",
                                        "color": "white"
                                    }
                                }
                            ],
                            "actionKeys": [],
                            "functionKeys": [],
                            "helpMetaData": [],
                            "screenHelp": {},
                            "errSfl": false,
                            "positionLeft": 8,
                            "positionTop": 5,
                            "cursorPosition": false,
                            "height": 6.8,
                            "width": 65,
                            "messageLine": false,
                            "userRestoreDisplay": false,
                            "border": false,
                            "remove": false,
                            "borderColor": "black"
                        }
                    ]
                }
            ],
            "serverDescription": ""
        }
    }
}
