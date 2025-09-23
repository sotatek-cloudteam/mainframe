
import { AfterViewInit, OnDestroy, HostListener, AfterViewChecked, Directive, inject, Injector, createNgModule } from '@angular/core';
import { ActivatedRoute, Params } from '@angular/router';
import * as $ from 'jquery';
import { StandardMessageLineComponent } from './maps/utility/standard-messageline.component';
import { LockScreenKeyboard } from './term/message';
// Component injection imports
import { ViewContainerRef, ViewChild, ComponentRef } from '@angular/core';
import { Type } from '@angular/core';
import { BackendMessage, LogicalMessage, Map, WindowMap, Field, SimpleField } from './term/message';
import { AddComponents, RebindComponents, RemoveAllComponents, WindowComponents, SetCursorPosition } from './term/message';
import { TransactionService } from './term/transaction.service';
import { Data } from './term/term.model';
import { TermService } from './term/term.service';
import { TestingService } from './term/testing.service';
import { AppService } from './app.service';
import { ConfigService } from './config-service';
import { LanguageService } from './language/language-service';
import { NumericalService } from './dynamic-field/utility/numerical.service';
import { AppConfigurationMessage } from './configuration-message.module';
import { ModalService } from './modal.service';
import { switchMap, takeUntil } from 'rxjs/operators';
import { LAZY_IMPORTS } from './lazy-imports';
import { FieldSynchronizationService } from './services/field-synchronization.service';
import { MapModuleLoaderService } from './services/map-module-loader.service';
import { HelpService } from './help.service';
import { TermState } from './models/term-state.model';
import { FieldInitializationService } from './services/field-initialization.service';
import { Subscription, Subject, timer } from 'rxjs';
import { FieldMessageLine } from "./models/field-message-line.model";
import {MessageLineService} from './services/message-line.service';
import { AidpService } from './aidp-service';
import { DateTimeService } from './dynamic-field/utility/datetime.service';

/** Abstract business component receiving, displaying and sending data */
@Directive()
export abstract class AbstTermComponent implements AfterViewInit, OnDestroy, AfterViewChecked {

    // Component injection location
    @ViewChild('dynamicTarget', { read: ViewContainerRef, static:false })
    private dynamicTarget : ViewContainerRef;

    // Keep track of message treated
    private messages: LogicalMessage[] = []

    // The next transaction to run from this terminal (CICS "TRANSID" parameter)
    protected nextTransactionId: string;

    // A message to display in the page footer
    private footerMessage: string;

    /** The global configuration */
    public configuration: AppConfigurationMessage;

    /** Current year */
    public currentYear:number;

    private allowedKeys = new Set(['Control', 'Tab', 'Enter', 'PageUp', 'PageDown', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

    // Spinning indicator
    public static isWaitingForBackendResponse : boolean = false;

    
    // For managing subscriptions and preventing memory leaks
    private destroy$ = new Subject<void>();
    
    // Manages the lifetime of the timer used during keyboard locks by the system
    private timerCancel$ = new Subject<void>();
    
	// DIs
    private mapModuleLoaderService: MapModuleLoaderService = inject(MapModuleLoaderService);
    private injector: Injector = inject(Injector);
    private fieldInitService: FieldInitializationService = inject(FieldInitializationService);
    protected termState: TermState = inject(TermState);

    constructor(
        public modalService: ModalService,
        protected transactionService: TransactionService,
        private languageService: LanguageService,
        public service: TermService,
        protected appService: AppService,
        private testingService: TestingService,
        protected configService: ConfigService,
        protected helpService: HelpService,
        public messageLineService: MessageLineService,
        private aidpService: AidpService
    ) {
        service.onReceiveMessageToTerm = this.onReceivedMessage.bind(this);
        this.configuration = transactionService.configuration;
        this.currentYear = Date.now();
    }

    
    abstract getMapComponent(mapName : string): Promise<any>;
    abstract getIdAnchor(): any;
    abstract isModal(): boolean;
    abstract getName(): String;
    
    protected loadModule(name: string): Promise<boolean> {
        if (this.mapModuleLoaderService.isModuleLoadInitiated(name)) {
            return this.mapModuleLoaderService.fetchModuleLoad(name);
        }
        return this.mapModuleLoaderService.registerModuleLoad(name, this.performModuleLoad(name));
    }

    private async performModuleLoad(name: string): Promise<boolean> {
        try {
            let moduleType: any;
            if (name in LAZY_IMPORTS) {
                 moduleType = await LAZY_IMPORTS[name]();
            } else {
                let moduleJS = await import('./maps/' + name + '/' + name + '.module');
                // Compute the class name of the module
                let moduleClassName: string = name[0].toUpperCase() + name.slice(1) + 'Module';
                if (moduleClassName in moduleJS) {
                    moduleType = moduleJS[moduleClassName];
                }
            }
            if (moduleType !== undefined) {
                createNgModule(moduleType, this.injector);
                return true;
            }
        } catch (e) {}
        return false;
    }
    
    protected postAction() {
        // Do Nothing
    }

    getComponent(name : string) {
        return this.termState.componentsByName[name]
    }
    
    getModal(name : string) {
        return this.termState.modalComponentsByName[name]
    }

    getFieldByPosition(position : number) {
        return this.termState.fieldsByPosition[position];
    }

    setParent(parent: AbstTermComponent) {
        if (parent !== this) {
            this.termState.parentComponent = parent;
        }
    }

    getParent(): AbstTermComponent {
        return this.termState.parentComponent
    }


    ngAfterViewInit(): void {
        this.termState.dynamicTarget = this.dynamicTarget;
    }

    ngOnDestroy(): void {
        this.removeAnyExistingComponent();
        // Unsubscribe
		this.destroy$.next();
		this.destroy$.complete();
		this.timerCancel$.next();
		this.timerCancel$.complete();
    }


    public ngAfterViewChecked(): void {

        // Change DOM pointer-events attribute value to enable targetting.
        if (this.haveToChangeTargetAccessibility()) {

            // Disable pointer-event on all 
            this.getIdAnchor().attr("style", "pointer-events: none");

            // Keep accessible as target usefull fields
            let msgs : any[] = [];
            let numberLine : number = 0;
            this.getIdAnchor().children().each(
                function(index, values) {
                    msgs.push(values);
                    numberLine = Math.max(numberLine, $(values).children().children().length);
                }
            )

            // For each line
            for (let i = 0; i<numberLine; i++) {

                let retainDivLine;
                for (let j = 0; j<msgs.length; j++) {
                    let divLine = $(msgs[j]).children().children()[i];
                    if ($(divLine).children().filter(
                        function(index,value) {
                            return !value.classList.contains("lgr_00")
                        }
                    ).length > 0) {
                        retainDivLine = divLine;
                    }
                }


                // Set the last no empty div line attribute pointer-events value to visible
                if (retainDivLine != null) {
                    $(retainDivLine).attr("style", "pointer-events: visible");
                }
            }
        } else {
            // Re-establish default behaviour
            this.getIdAnchor().removeAttr("style");
        }
 
    }

    // Check if condition have to be changed to access target 
    protected haveToChangeTargetAccessibility(): boolean {

        // If there are several message and are in absolute position
        if (this.getIdAnchor().children().length > 1 && this.getIdAnchor().children().children().filter(
            function(index, value) {
                return $(value).css("position") === "absolute"
            }
        ).length > 0 ) {
            return true;
        }

        return false;
    }

    private toggleOverwriteMode(): void {
        this.appService.updateInsertMode();
    }

    protected isScreenExtended(){
        if(this.termState.parentComponent !== undefined){
            return this.termState.parentComponent.isScreenExtended();
        }
        return this.termState.isExtended;
    }

    private changeTheme(event: any): void {
        // Set the class of "body" to the one defined by the data-csw attribute
        let target = (<Element>event.target);
        let theme = target.getAttribute('data-csw');
        document.body.className = theme;
    }

    protected onInvoke(params: Params): Promise<BackendMessage> {
        const startMessage: any = { 'resetTransactionData': true };

        let transid = params['transid'];
        let parameters = params['parameters'] != null ? JSON.parse(params['parameters']) : [];
        if (transid.toLowerCase().startsWith('/testmap ')) {
            const args = transid.substring(transid.indexOf(' ') + 1);
            return Promise.resolve(this.testingService.buildTestMessage(args));
        }

        return this.transactionService.runTransaction(transid, startMessage, parameters);
    }

    public async onReceivedMessage(backendMessage: BackendMessage) {
        console.log('JSON message received from backend', backendMessage)

        AbstTermComponent.isWaitingForBackendResponse  = false;

        if (backendMessage.error !== undefined) {
            console.log('An error occured on backend: ' + backendMessage.error);
            this.setFooterMessage(backendMessage.error);
            return;
        }

        this.nextTransactionId = backendMessage.nextTransID;
        
		
        if (this.configuration.verbose) {
            this.setFooterMessage(backendMessage.serverDescription);
        } else {
        	// Remove potential obsolete error message
            this.setFooterMessage('');
        }

        if (backendMessage.messages == undefined || backendMessage.messages.length == 0) {
            console.log('No backend messages to process');
        } else {
            this.helpService.clear();
            
            
            // Ensure each message is totally processed before the next one is (V7-3021)
            await this.processSequentially(backendMessage.messages, 0);
            
        }
    }

    /** Set the footer message, or clear it is string is empty/undefined */
    private setFooterMessage(message: string):void {
        if (message == undefined) {
            message = '';
        }

        // Flashing footer if message has changed
        if (message !== '' && message != this.footerMessage) {
            this.animate();
        }

        this.footerMessage = message;
    }

    /** Active footer animation */
    private animate():void {
        $("#idFooter").removeClass("run-animation");
        setTimeout(() => {
            $("#idFooter").addClass("run-animation");
        }, 10);
    }

    /** Process logical messages sequentially (only one usually, but see V7-145) */
    private async processSequentially(toProcess: LogicalMessage[], idx: number): Promise<void> {
        if (idx >= toProcess.length) {
            return;
        }

        // Could use Array.shift, but it messes with debugging console (array is emptied)
        await this.processLogicalMessage(toProcess[idx]);
        return this.processSequentially(toProcess, idx + 1);
    }

    /** Process one logical message, and return a Promise to synchronize on */
    protected processLogicalMessage(message: LogicalMessage): Promise<void> {

        if (this.messages.filter(msg => msg === message).length == 0) {
            
            this.messages.push(message);
            switch (message.command) {
                case 'addComponents':
                    return this.loadAndInsertComponents((message as AddComponents).maps);
                case 'rebindComponents':
                    this.rebindExistingComponents((message as RebindComponents).maps);
                    return Promise.resolve();
                case 'removeAllUnprotected':
                    this.clearAllUnprotectedFields();
                    return Promise.resolve();
                case 'removeAllComponents':
                    this.removeAnyExistingComponent();
                    return Promise.resolve();
                case 'setCursorPosition':
                    this.setCursorPosition((message as SetCursorPosition).cursor);
                    return Promise.resolve();
                case 'windowComponents':
                    return this.loadAndActiveWindowComponents(message as WindowComponents);
                case 'lockScreenKeyboard':
                    const lockScreenMessage = message as LockScreenKeyboard;
                    this.lockScreenKeyboard(lockScreenMessage.duration);
                    return Promise.resolve();
                default:
                    let errorMessage = 'Unhandled backend command "' + message.command + '"';
                    console.log(errorMessage); // Ensure this makes its way to the logs
                    throw new Error(errorMessage);
            }
        }
    }

	/** ------------------------------------ Main methods -----------------------------------  **/

    /** Load components, then insert and bind them */
    private async loadAndInsertComponents(maps: Map[]): Promise<void> {
        this.checkModalComponents(maps);
        let componentTypeProms: Promise<any>[] = maps.map(map => this.getMapComponent(map.component));

        const componentTypes: any[] = await Promise.all(componentTypeProms);
        // Now sequentially insert components (order matters)
        for (let i = 0; i < maps.length; i++) {
            if (componentTypes[i] == null || componentTypes[i] == undefined) {
                throw new Error('Unknown component: "' + maps[i].component + '"');
            }
            this.insertComponents(maps[i], componentTypes[i]);
        }
    }

    /** Bind fields values and attributes to existing components */
    private rebindExistingComponents(maps: Map[]): void {

        for (let i = 0; i < maps.length; i++) {
            let map = maps[i];

            // Find the existing component for this map
            let component: ComponentRef<any> = this.termState.componentsByName[map.component];
            if (component === undefined) {
                throw new Error('Component not found in existing ones, cannot rebind: ' + map.component);
            }

            this.decodeFields(component.instance, map);

            /** Clone fields object to trigger method "set data( data: Data )" from dynamic field component */
	        let fields : Field[] = map.fields; 
	        for (let i = 0; i < fields.length; i++) {
	            let field: Field = fields[i];
                let data: any = component.instance[field.id];
                if (!Array.isArray(data)){ // TODO: Treat array ?
                    this.cloneToUpdate(data, component.instance, field.id);
                }
			}
        }
    }
    
    /** Clear the contents of all currently displayed, unprotected fields, and reset their MDT flag */
    private clearAllUnprotectedFields(): void {
        for (let componentRef of this.termState.injectedComponents) {
            let component = componentRef.instance;

            for (let fieldId of component.FIELDS) {
                let field = component[fieldId];
                if (Array.isArray(field)) {
                    // TODO What should we do here? Is there a 5250 equivalent behavior?
                    continue;
                }

                let data: Data = field;
                let unprotected: boolean = data.attributes && data.attributes.protection === 'UNPROT';
                if (!unprotected) {
                    continue;
                }

                data.value = data.initialValue = undefined; // An empty string will confuse Data#isModified()
                if (data.viewData) {
                    data.viewData.initialValue = undefined;
                    data.viewData.value = undefined;
                }
                data.clearModified();
                this.cloneToUpdate(data, component, fieldId);
            }
        }
    }
    
    private removeAnyExistingComponent(): void {
        for (let i = 0; i < this.termState.injectedComponents.length; i++) {
            this.termState.injectedComponents[i].destroy();
        }
        this.termState.injectedComponents = [];
        this.termState.injectedModalComponents = [];
        this.termState.componentsByName = {};
        this.termState.modalComponentsByName = {};
        this.termState.fieldsByPosition = {};
    }
    
    private setCursorPosition(cursor: number): void {
    	let injectedField: any = this.getFieldByPosition(cursor);
    	injectedField.initialCursor = true;
    }

    /** Load Window components, then insert and bind them */
    protected loadAndActiveWindowComponents(message: WindowComponents) {
        let maps = this.loadWindowComponents(message.maps);
        let proms = this.loadComponents(maps);
        
        // Now sequentially insert components (order matters)
        return Promise.all(proms).then((componentTypes: Array<Type<{}>>) => {
            for (let i = 0; i < maps.length; i++) {
                let componentName = maps[i].component;
                if (componentTypes[i] == null || componentTypes[i] == undefined) {
                    throw new Error('Unknown component: "' + componentName + '"');
                }  
                if (this.isModal()) {
                    if((maps[i].windowRef !== undefined && maps[i].windowRef == this.getName()) || componentName == this.getName()){
                        this.insertComponents(maps[i], componentTypes[i]);
                    }
                } else {
                    let modalName = maps[i].windowRef !== undefined ? maps[i].windowRef.toString() : componentName;
                    if(maps[i].windowRef === undefined && this.getModal(modalName) === undefined) {
                        // Build component, then bind message to UI
                        let component = this.dynamicTarget.createComponent(componentTypes[i]);
                        this.termState.injectedComponents.push(component);
                        this.termState.componentsByName[componentName] = component;

                        this.termState.modalComponentsByName[componentName] = component;
                        this.termState.injectedModalComponents.push(component);

                        // Send messages to the modal component
                        this.modalService.activeModal(modalName).next({message : message, parentComponent : this});
                    }
                }
            }
        });
    }
    
    /** Lock the screen keyboard for the specified duration. */
    private lockScreenKeyboard(duration: number) {
        this.appService.setLockScreenKeyboardState(true);

        // Schedule the flag to be set to false after the specified duration(in seconds) and return
        // control back to backend.
        timer(duration * 1000)
            .pipe(
            	takeUntil(this.destroy$),
        		takeUntil(this.timerCancel$)
        	).subscribe(() => {
                this.appService.setLockScreenKeyboardState(false);
                let termMessage: any = { 'attentionKey': 'ENTER', 'returnWithoutResponse' : true};
                this.sendToBackendAndWaitForResponse(termMessage);
            });
    }

    /** ----------------------------------------------------------------------------------------  **/

    /** ------------------------------------ Common methods -----------------------------------  **/

    /** Clone and set Data describing a field (make sure modification is displayed; V7-3558) */
    private cloneToUpdate(data:Data, componentInstance, fieldId:string) {
        if (!Array.isArray(data)){ // TODO: Treat array ?
	        let cloneData = data.clone();
	        if(data?.attributes){
                let pos: number = data.attributes.line * 80 + data.attributes.column;
                this.termState.fieldsByPosition[pos] = cloneData;
            }
	        componentInstance[fieldId] = cloneData;
        }
    }

    /** Set up and return components loading/building factories */
    private loadComponents(maps: Map[]): Array<Promise<Type<{}>>> {
        // First load and setup asynchronously modules defining map components
        let proms: Array<Promise<Type<{}>>> = [];
        for (let i = 0; i < maps.length; i++) {
            let map = maps[i];

            // Search for the angular type corresponding to this component name
            let componentType = this.getMapComponent(map.component);
            if (componentType == null) {
                throw new Error('Unknown component: "' + map.component + '"');
            }

            // Load component-owning module dynamically
            proms.push(Promise.resolve(componentType));
        }

        return proms;
    }
    


    // Build component or reuse the existing one
    private insertComponents(map: Map, componentType: any) {
        // Get existing component or build a new one, then bind message to UI
        let existingComponent = this.getComponent(map.component);
        if(existingComponent !== undefined){
            this.decodeFields(existingComponent.instance, map);
        } else {
        	// Build component, then bind message to UI
            let component = this.dynamicTarget.createComponent(componentType);
            this.termState.injectedComponents.push(component);
            this.termState.componentsByName[map.component] = component;
            this.decodeFields(component.instance, map);
        }
    }

    /**
     * Initialize a map component with JSON informations provided by the backend
     * @param map The state object corresponding to the component
     * @param inputMap The object containing the initialization values
     * @param update flag to update the state object to
     */
    private decodeFields(map: any, inputMap: any): void {

        /** Map technicals fields */
        if (inputMap.overlay !== undefined) {
        	this.mapFieldToData( map, 'overlay', inputMap.overlay);
        }
        this.mapFieldToData( map, 'startLineNumber',  inputMap.startLineNumber);

        /** Map to business fields */
        let fields : Field[] = inputMap.fields; 
        for (let i = 0; i < fields.length; i++) {
            let field: any = fields[i];
            let data: any = map[field.id];
            if (data == null) {
                throw new Error('No entry in map for field ' + field.id)
            }

            if (inputMap.cursorLine !== undefined && inputMap.cursorColumn !== undefined) {
                data.cursorLine = inputMap.cursorLine;
                data.cursorColumn = inputMap.cursorColumn;
            }
            
            // Reflexively set field value
            if (field.data !== undefined) {
            	data.value = field.data;
            	// Set the message line
                data.messageLine = field.messageLine;
            } else if (field.fields !== undefined && Array.isArray(data)) {
                if(field.component !== undefined){
                    this.termState.subComponentsByName[field.component] = data;
                }
                // Reset the length of the data field
                if (field.attributes && field.attributes.display) {
                    data.length = 0;
                    // Clear the message field metadata if this is array message line component
                    if (field.component === 'arraymessageline' && typeof map.clearMessageFieldMetadata === 'function') {
                        map.clearMessageFieldMetadata();
                    }
                }
                this.fieldInitService.processArrayField(field, data, this.termState);
            }

            // Make sure that subsequent calls to Data instance methods will be possible
            // Required since objects generated in components are "properties only" objects and not instances of Data
            if (!Array.isArray(data)) {
                Object.setPrototypeOf(data, Data.prototype);
            }
            
            // Ensure attributes are set on component
            this.fieldInitService.fillData(data, field, this.termState);
            
        }

        // If the component contains a subfile, update its record number so the correct page will be displayed
        if(map.isSubfileControl == true){
        	if(map.updateSubfile()){
                this.messageLineService.displayStandardErrorMessage("Roll_up_down_past_first_last_record");
            }
        }
    }

    /* Map field to data value. */
    private mapFieldToData(map : any, data: string, field: any): void {
        if (map[data] !== undefined && field !== undefined) {
            map[data] = field;
        }
    }    
    
    /** --------------------------------------------------------------------------------------  **/
    
    /** ------------------------------------ Modal methods -----------------------------------  **/

    /** Separate window component to be created from existing ones */
    private loadWindowComponents(maps: WindowMap[]): WindowMap[] {
    	let removeAll = false;
        let newMaps: WindowMap[] = [];
        let existingComponent: { [key: string]: AddComponents } = {}
        for (let i = 0; i < maps.length; i++) {
            let modalName = maps[i].windowRef !== undefined ? maps[i].windowRef.toString() : maps[i].component.toString();

            // Destroy all windows that overlay the current one
            this.destroyOverlayingModalComponents(modalName, maps[i].remove);

            // If the modal already exists, just update the component
            // else, create the modal component
            let modal = this.getModal(modalName);
            if(modal === undefined){
                // The modal doesn't exist so need to be created
                newMaps.push(maps[i]);
            } else {
                // The modal exists, just recreate components
                if(existingComponent[modalName] == undefined){
                    let addMessage: AddComponents = { command: 'addComponents', maps: []};
                    addMessage.maps.push(maps[i]);
                    existingComponent[modalName] = addMessage;
                } else {
                    existingComponent[modalName].maps.push(maps[i]);
                }

                // TODO: Needed ? Make it local to the modal
                if(maps[i].overlay !== true){  
                    removeAll = true; 
                }
            }
        }

        // For all components from existing modal, send a message
        for (let modalName of Object.keys(existingComponent)) {
            if(removeAll){
                let removeMessage: RemoveAllComponents = { command: 'removeAllComponents' };
                this.modalService.activeModal(modalName).next({message : removeMessage, parentComponent : this});
            }
            this.modalService.activeModal(modalName).next({message : existingComponent[modalName], parentComponent : this});
        }

        // Return the new modal
        return newMaps;
    }

    /** Destroy All Modal components if there is a message to main window (except standard-messaline) */
    private checkModalComponents(maps: Map[]): void {
        if(this.termState.injectedModalComponents.length == 0){
            return;
        }

        let destroy: boolean = false;
        for (let i = 0; i < maps.length; i++) {
            if(maps[i].component !== 'standard-messageline' && maps[i].component !== 'standard-arraymessageline'){
                destroy = true;
            }
        }
        if(destroy){
            this.destroyAllModalComponents();
        }
    }
    
    /** Destroy All Modal components */
    public destroyAllModalComponents(): void {
        for (let i = 0; i < this.termState.injectedModalComponents.length; i++) {
            const index = this.termState.injectedComponents.indexOf(this.termState.injectedModalComponents[i], 0);
            if (index > -1) {
                this.termState.injectedComponents.splice(index, 1);
            }
            this.termState.injectedModalComponents[i].destroy();

        }
        this.termState.injectedModalComponents = [];
		this.termState.modalComponentsByName = {};
    }
    
    /** Destroy top Modal component */
     public destroyTopModalComponent(): void {
        let lastIndex = this.termState.injectedModalComponents.length - 1;
        const index = this.termState.injectedComponents.indexOf(this.termState.injectedModalComponents[lastIndex], 0);
        if (index > -1) {
            this.termState.injectedComponents.splice(index, 1);
        }
        
        this.termState.injectedModalComponents[lastIndex].destroy();
        this.termState.injectedModalComponents = this.termState.injectedModalComponents.slice(0 , lastIndex);
        delete this.termState.modalComponentsByName["additional-message"];
    }
    
    /** Destroy All Modal components above the message's one */
    private destroyOverlayingModalComponents(modalName: String, remove: boolean): void {
    	// If the window message has a remove property, remove all windows
        if(remove){
            this.destroyAllModalComponents();
        }

        // Get current window index to remove overlaying windows
        let startIndex = -1;
        let keys: any = Object.keys(this.termState.modalComponentsByName);
        for (let key of keys) {
            if(key == modalName){
                startIndex = this.termState.injectedModalComponents.indexOf(this.termState.modalComponentsByName[key], 0) + 1;
            } else if(startIndex > -1) {
                delete this.termState.modalComponentsByName[key];
            }
        }
        if(startIndex > 0 ){
            for (let i = startIndex; i < this.termState.injectedModalComponents.length; i++) {
                console.log('Destroy Modal Component' + i);
                const index = this.termState.injectedComponents.indexOf(this.termState.injectedModalComponents[i], 0);
                if (index > -1) {
                    this.termState.injectedComponents.splice(index, 1);
                }
                this.termState.injectedModalComponents[i].destroy();

            }
            this.termState.injectedModalComponents = this.termState.injectedModalComponents.slice( 0 , startIndex );
        }
    }
    
    public getModalComponent() : { [key: string]: ComponentRef<any> } {
        return this.termState.modalComponentsByName;
    }
    
    onWheel(event: WheelEvent): void {
        if (event.deltaY < 0) {
            // Detected scroll up action, simulate 'PAGEUP'
            this.simulateKeyPress("PageUp");
        } else if (event.deltaY > 0) {
            // Detected scroll down action, simulate 'PAGEDOWN'
            this.simulateKeyPress("PageDown");
        }
    }
    
    simulateKeyPress(keyValue: string) {
        const event = new KeyboardEvent("keydown", {
            key: keyValue,
            altKey: false,
            ctrlKey: false,
            shiftKey: false,
            metaKey: false,
            bubbles: true
        });
        document.dispatchEvent(event);
    }
    
    /** ----------------------------------------------------------------------------------------  **/
    
    /** ----------------------------------------------------------------------------------------  **/
    /**
     * Custom even emitted after a paging on table component
     * The Keydown bubbling is stopped before dispatching this event.
     */
    @HostListener('document:afterPaging', ['$event.detail.event', '$event.detail.pagingResult'])
    afterPaging(keyEvent: KeyboardEvent, pagingResult: boolean) {
        this.performKeydown(keyEvent, pagingResult);
    }
    /** React to attention keys */
    @HostListener('document:keydown', ['$event'])
    onKeyDownListener(e: KeyboardEvent) {
        this.performKeydown(e, undefined);
    }
    /**
     * Process the keydown event.
     *
     * @param e Keyboard event
     * @param pagingResult The paging result if paging was performed prior to calling this. 
     */
    private performKeydown(e: KeyboardEvent, pagingResult: boolean) {
        // Check if the frontend is waiting for a response from the backend
        if ( AbstTermComponent.isWaitingForBackendResponse ) {
        // If waiting, do not perform any action
            e.preventDefault(); 
            e.stopImmediatePropagation(); 
            return; 
        }
        
    	// If the current component is not the one on the top, stop listening
        if(!this.isTopComponent()){
            return;
        }

    	let activeElementDoc : Element = document.activeElement;
        let activeElement: string = activeElementDoc.id;
        let activeComponent: string = this.getActiveComponent(activeElementDoc);
        let activeRecord: string = activeComponent?.split("-")[1] ?? '';
        let attentionKey: string = null;
        
      	// If the keyboard was locked by the backend, ignore all keys. Else, check
        // if there is a standard message already displayed and allow only some key input
      	if (this.appService.getLockScreenKeyboardState() || this.appService.getErrorState()){
            if (this.appService.getLockScreenKeyboardState() || (this.configService.getLockOnError() && !this.checkValidErrorKey(e))){
                e.stopImmediatePropagation();
                e.preventDefault();
                return;
            }
            //Clear the standard error message
            this.appService.setErrorState(false);

            //Remove the message line if standard array message line is present.
            if(this.termState.componentsByName["standard-arraymessageline"] !== undefined){
                this.messageLineService.removeStandardMessageLine();
            } else {
                //Keep the current standard message line as it will be used to display any program message
                this.messageLineService.displayOrClearEmptyMessage();
            }

        }

        let cursorPosition: number = 0;
        if ( e.target instanceof HTMLInputElement ) {
            cursorPosition = e.target.selectionStart; 
        }

        // Robustness switch from key / which / keyCode
        // See https://keycode.info/ for key codes
        let key = e.key || '';
        let keyCode = e.which || e.keyCode || -1;
        let groups = [];
        if (keyCode == 13 || key === 'Enter') {
            attentionKey = 'ENTER';
        }  else if (this.transactionService.is5250() && (keyCode == 33 || key === 'PageUp')) {
            if (pagingResult === undefined) {
                pagingResult = this.pagingSFL(e);
            }
            if(!pagingResult){
                attentionKey = 'PAGEUP';
            } else {
                this.messageLineService.displayOrClearEmptyMessage();
            }
        }  else if (this.transactionService.is5250() && (keyCode == 34 || key === 'PageDown')) {
            if (pagingResult === undefined) {
                pagingResult = this.pagingSFL(e);
            }
            if(!pagingResult){
                attentionKey = 'PAGEDOWN';
            } else {
                this.messageLineService.displayOrClearEmptyMessage();
            }
        } else if ((keyCode == 112 && e.ctrlKey) || (keyCode == 45 && e.altKey)) {
            // Ctrl + F1 or Alt + Insert for PA1 (V7-4104)
            attentionKey = 'PA1';
        } else if ((keyCode == 113 && e.ctrlKey) || (keyCode == 36 && e.altKey)) {
            // Ctrl + F2 or Alt + Home for PA2 (V7-4104)
            attentionKey = 'PA2';
        } else if ((keyCode == 114 && e.ctrlKey) || (keyCode == 33 && e.shiftKey)) {
            // Ctrl + F3 or Shift + PageUp for PA3 (V7-4104)
            attentionKey = 'PA3';
        } else if (keyCode >= 112 && keyCode <= 123) {
        	if (this.processDropFold(e)) {
        		// avoid computing attentionKey
        		attentionKey = null;
        	} else {
				let pfk = this.formatFunctionKey(keyCode, e.shiftKey);
            	attentionKey = 'PF' + Number(pfk);
            }
        } else if (groups = key.match(/^F(\d+)$/)) {
            attentionKey = 'PF' + groups[1];
        } else if (keyCode == 19) {
            // "Pause" key on a PC keyboard
            attentionKey = 'CLEAR';
        }

        if (attentionKey !== null) {
            console.log('Attention key pressed (' + attentionKey + ')');
            e.stopImmediatePropagation();
            e.preventDefault();
            
            
			

            // Build a message to the backend
            let hasError = false;
            let firstError: boolean = true;
            this.messageLineService.clearErrorMessages();
            this.messageLineService.errorMessages = [];
            let termMessage: any = { 'attentionKey': attentionKey, 'activeRecord': activeRecord, 'activeField': activeElement, 'cursorPosition': cursorPosition, 'fields': [] };
            for (let m = 0; m < this.termState.injectedComponents.length; m++) {
                let injectedComponent: any = this.termState.injectedComponents[m];
                let componentName: string = this.getComponentName(injectedComponent);
                let map: any = injectedComponent.instance;
                

                // Protection (CTL into destroyed window case)
                if (map.FIELDS !== undefined) {
	                // Collect fields value and their "modified" status
	                let FIELDS: string[] = map.FIELDS;
	                for (let i = 0; i < FIELDS.length; i++) {
	                    let fieldName: string = FIELDS[i];
	                    let data: Data = map[fieldName];
	                    if (Array.isArray(data)) {
                            let subComponentName: string = this.getSubComponentName(data);
                            for (let index = 0; index < data.length; index++) {
                            	let arrayData = data[index];
                            	if (arrayData === undefined) {
                                	continue;
                            	}
	                            // An field on row at least is modified
	                            let rowModified: boolean = false;
	                    		for (let subFieldName of arrayData.FIELDS) {
	                    			let subField: Data = arrayData[subFieldName.id];
	                                rowModified = rowModified || subField.isModified();
	                            }
	                    		for (let subFieldName of arrayData.FIELDS) {
	                    			let subField: Data = arrayData[subFieldName.id];
	                                let modified: boolean = subField.isModified();
				                    /** Field value is only sent if modified (V7-130). It could be modified because :
                                     *    - the current field has been modified (or is set modified explicitely)
                                     *    - the whole row is set modified explicitely (SLFNXTCHG on SFL)
                                     *
                                     *  If the field is protected, we don't need to submit the field. Protected fields can't be modified.
                                     */
                                    if (!subField.protected && (rowModified || modified || arrayData.forceModified)) {
    		                        	this.reformatValue(subField);
				                        let fieldState: any = {"component": subComponentName, 'id': subFieldName.id + "_" + index, 'value': subField.value };
				                        termMessage.fields.push(fieldState);
				                    }
				                }
	                    	}
	                    } else {
	                    	if(Object.keys(data).length !== 0) {
		                    	// Field value is only sent if modified (V7-130)
		                    	if (data.isModified()) {
		                        	this.reformatValue(data);
                                	
		                    	    let valueChanged = true;
		                    	    let hasInitialValue = false;
                                    let value = data.value;
                                    let hasLowValues = false;
                                    let isIso = false;
                                    

		                        	let fieldState: any = {"component": componentName, 'id': fieldName, 'value': value, valueChanged, hasInitialValue, isIso, hasLowValues, ...(data.attributes !== undefined && data.attributes.isPassword && {'ispassword': data.attributes.isPassword})};
		                        	termMessage.fields.push(fieldState);
		                    	}
		                    }
		                }
	                }
	            }
            }

            if(hasError){
                return;
            }
            // If we are fetching table data, it is the job of the fetch to change this flag.
            if (!this.termState.isFetchingTableData) {
                AbstTermComponent.isWaitingForBackendResponse  = true;
            }
            // Send message to frontend; wait for an answer to react on
            this.sendToBackendAndWaitForResponse(termMessage);
        }
    }

    /** ----------------------------------------------------------------------------------------  **/
    
    /** ------------------------------------ Utility methods -----------------------------------  **/
    /** Format the value before send it back to the program */
    private reformatValue(data: Data) {
        if (data.viewData) {
            data.value = data.viewData.computeProgramValue();
        }
        if(this.configuration.uppercaseInput){
            if (data && data.value){
                data.value = data.value.toUpperCase();
            }
        }
    }
    
    /** Try to pag on Subfile, if paging is done by the table (doPaging returns false), return true
     * If the paging is not done, check following subfile component and return false if no paging has been done.
    */
    protected pagingSFL(key: KeyboardEvent): boolean {
        let result = false;
        for (let m = 0; m < this.termState.injectedComponents.length; m++) {
            let injectedComponent: any = this.termState.injectedComponents[m];
            let map: any = injectedComponent.instance;
            if(map.isSubfileControl == true) {
                if(!map.doPaging(key)) {
                    key.stopImmediatePropagation();
                    key.preventDefault();
                    return true;
                }
            }
        }
        return result;
    }

    private isTopComponent(): boolean {
        if(this.termState.parentComponent === undefined){
            return this.termState.injectedModalComponents.length == 0;
        } else {
            // All modal are built from the root component
            let keys: any = Object.keys(this.termState.parentComponent.getModalComponent());
            return keys[keys.length - 1] == this.getName();
        }
    }

    /** Get component name */
    private getComponentName(injectedComponent: ComponentRef<any>): string {
		let keys: any = Object.keys(this.termState.componentsByName);
        for (let key of keys) {
        	let component: ComponentRef<any> = this.termState.componentsByName[key];
            if (component === injectedComponent) {
            	return key;
            }
        }
        return "";
    }

    /** Get sub-component (array) name */
    private getSubComponentName(data: any): string {
        let keys: any = Object.keys(this.termState.subComponentsByName);
        for (let key of keys) {
            let component: ComponentRef<any> = this.termState.subComponentsByName[key];
            if (component === data) {
                return key;
            }
        }
        return "";
    }
    
    private processDropFold(key: KeyboardEvent): boolean {
        for (var m = 0; m < this.termState.injectedComponents.length; m++) {
            let injectedComponent: any = this.termState.injectedComponents[m];
            let map: any = injectedComponent.instance;
            if(map.isSubfileControl == true) {
                if(map.doDropFold(key)) {
                    key.stopImmediatePropagation();
                    key.preventDefault();
                    return true;
                }
            }
        }
        return false;
    }
    
	
	// Search for the active record from the active element (field)
    private getActiveComponent(activeElement: Element): string {
        let allComponents: any = Object.keys(this.termState.componentsByName);
        let allSubComponents: any = Object.keys(this.termState.subComponentsByName);

        let parent = activeElement.parentNode;
        while(parent.nodeName !== '#document'){
            let nodeName = parent.nodeName.toLowerCase();
            if(allComponents.includes(nodeName) || allSubComponents.includes(nodeName)){
                return nodeName;
            }
            parent = parent.parentNode;
        }
        return "";
    }

    private displayAdditionalMessage(activeElement: string, activeComponent: string){
      let windowComponent = this.messageLineService.getAdditionalMessage(activeElement, activeComponent);
      if(this.isModal()){
        this.getParent().loadAndActiveWindowComponents(windowComponent);
      } else{
        this.loadAndActiveWindowComponents(windowComponent);
      }
    }

  /**
   * Formats the function key code to String between 01 - 24
   * @param keyCode : KeyCode of the function key
   * @param shiftKey : Boolean to check if shift key is pressed
   * @private
   */
    private formatFunctionKey(keyCode: number, shiftKey: boolean){
        let processedFKey = keyCode - 111;
        processedFKey += (shiftKey ? 12 : 0);
        return processedFKey < 10 ? "0"+processedFKey : String(processedFKey);
    }

    /** ----------------------------------------------------------------------------------------  **/
    /** ------------------------------------ Error Message methods -----------------------------------  **/

    /**
     * Returns the message component available for that screen
     */
    public getErrorMessageComponent() : any {
      this.messageLineService.getErrorMessageComponent();
    }

   /**
    * Check if the key pressed during error state is valid
    * @param event : KeyboardEvent
    * @private
    */
    private checkValidErrorKey(event: KeyboardEvent){
        //Check if the key is allowed during error state
        return this.allowedKeys.has(event.key) || (event.keyCode >= 112 && event.keyCode <= 123);
    }
    
   /**
   	* Sends a request to the backend and awaits a response.
   	* @param termMessage   The termMessage that contains the payload for the backend.
   	* @private
   	*/
    private sendToBackendAndWaitForResponse(termMessage: any) {
    	// If there is an active timer in the case that the keyboard was locked by the system
    	// for a certain duration, cancel it if we are sending a payload to the backend from anywhere else.
    	// This avoids sending a subsequent payload to the backend once the timer ends.
    	this.timerCancel$.next();
        this.transactionService.runTransaction(this.nextTransactionId, termMessage)
            .then((message: BackendMessage) => this.onReceivedMessage(message))
            .catch((ex) => {console.error('Error invoking next transaction', ex);});
    }
    
}
