import {ComponentRef, Injectable, ViewContainerRef} from '@angular/core';
import {Data} from '@angular/router';
import {ModalProperties} from '../modal.properties';

/**
 * Class used to maintain the state of the term component (whether modal or regular term)
 */
@Injectable()
export class TermState {
  // Keep track of injected fields(s), by position
  public fieldsByPosition: { [key: number]: Data } = {}

  // Keep track of progress of tableDataFetch
  public isFetchingTableData: boolean = false;

  public isModal: boolean = false;

  
  public injectedComponents: ComponentRef<any>[] = [];
  public componentsByName: { [key: string]: ComponentRef<any> } = {};
  public subComponentsByName: { [key: string]: any } = {};
  public modalComponentsByName: { [key: string]: ComponentRef<any> } = {}
  public injectedModalComponents: ComponentRef<any>[] = [];
  /** Parent component */
  public parentComponent: any;

  public isExtended: boolean = false;
  public mainDspMode: string;
  public name: String;

  public widthMode: number = 2;
  public widthClasses = ['', 'rd_fixed_width', 'rd_full_width'];
  public widthClassesA7 = ['', 'rd_fixed_width_A7', 'rd_full_width'];

  // Used by Setup menu. Enforce "Fixed Width" as the defaut setup
  public containerClasses = ['container'];
  public heightClasses = ['rdmq_height'];

  public dynamicTarget: ViewContainerRef;
  public STANDARD_POSITION: number = 24;
  public EXTENDED_POSITION: number = 27;

  public modalProperties: ModalProperties;


  /* Set the screen size depending on the DspMode value received. */
  public handleDisplayMode(dspMode : any): void {
    if(dspMode === "*DS4"){
      this.isExtended = true;
      this.changeSetup(this.widthMode);
      this.heightClasses = ['rdmq_height_A7'];
    } else if(dspMode === "*DS3"){
      this.isExtended = false;
      this.changeSetup(this.widthMode);
      this.heightClasses = ['rdmq_height'];
    }
  }

  public changeSetup(widthMode: number): void {
    this.widthMode = widthMode;
    this.containerClasses = ['container'];
    if(widthMode >= 1 && widthMode <= 3){
      this.containerClasses.push(!this.isExtended ? this.widthClasses[widthMode - 1] : this.widthClassesA7[widthMode - 1]);
    }
  }

  public initializeModalProperties(): void {
    this.modalProperties = new ModalProperties();
  }

}
