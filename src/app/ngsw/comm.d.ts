import { NgZone } from '@angular/core';
import { Observable } from 'rxjs/Observable';
export declare function doAsync<T>(fn: (T) => Observable<any>): any;
import 'rxjs/add/observable/defer';
import 'rxjs/add/observable/from';
import 'rxjs/add/operator/do';
import 'rxjs/add/operator/expand';
import 'rxjs/add/operator/let';
import 'rxjs/add/operator/share';
export declare class NgPushRegistration {
    private ps;
    constructor(ps: any);
    auth(): string;
    key(method?: string): string;
    readonly url: string;
    readonly id: string;
    unsubscribe(): Observable<boolean>;
}
export interface NgPushOptions {
    showNotification?: boolean;
    backgroundOnly?: boolean;
}
export declare class NgServiceWorker {
    private zone;
    private container;
    private controllingWorker;
    private awaitSingleControllingWorker;
    push: Observable<any>;
    private _pushOptions;
    constructor(zone: NgZone);
    private registrationForWorker();
    private sendToWorker(worker, message);
    private send(message);
    ping(): Observable<any>;
    log(): Observable<string>;
    setPushOptions(options: NgPushOptions): Observable<any>;
    registerForPush(options?: NgPushOptions): Observable<NgPushRegistration>;
}
