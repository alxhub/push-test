"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var core_1 = require('@angular/core');
var Observable_1 = require('rxjs/Observable');
var base64_js_1 = require('base64-js');
function doAsync(fn) {
    return function (obs) { return obs
        .concatMap(function (value) { return fn(value)
        .reduce(function () { return value; }, value); }); };
}
exports.doAsync = doAsync;
require('rxjs/add/observable/defer');
require('rxjs/add/observable/from');
require('rxjs/add/operator/do');
require('rxjs/add/operator/expand');
require('rxjs/add/operator/let');
require('rxjs/add/operator/share');
function fromPromise(promiseFn) {
    return Observable_1.Observable.create(function (observer) {
        promiseFn()
            .then(function (v) { return observer.next(v); })
            .then(function () { return observer.complete(); })
            .catch(function (err) { return observer.error(err); });
    });
}
// A push notification registration, including the endpoint URL and encryption keys.
var NgPushRegistration = (function () {
    function NgPushRegistration(ps) {
        this.ps = ps;
    }
    // Get the authentication key
    NgPushRegistration.prototype.auth = function () {
        return this.key('auth');
    };
    NgPushRegistration.prototype.key = function (method) {
        if (method === void 0) { method = 'p256dh'; }
        return base64_js_1.fromByteArray(new Uint8Array(this.ps.getKey(method)));
    };
    Object.defineProperty(NgPushRegistration.prototype, "url", {
        get: function () {
            return this.ps.endpoint;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(NgPushRegistration.prototype, "id", {
        get: function () {
            return this.ps.id;
        },
        enumerable: true,
        configurable: true
    });
    NgPushRegistration.prototype.unsubscribe = function () {
        var _this = this;
        // TODO: switch to Observable.fromPromise when it's not broken.
        return fromPromise(function () { return _this.ps.unsubscribe(); });
    };
    return NgPushRegistration;
}());
exports.NgPushRegistration = NgPushRegistration;
var NgServiceWorker = (function () {
    function NgServiceWorker(zone) {
        var _this = this;
        this.zone = zone;
        this._pushOptions = null;
        // Extract a typed version of navigator.serviceWorker.
        this.container = navigator['serviceWorker'];
        // Final Observable that will always give back the current controlling worker,
        // and follow changes over time.
        this.controllingWorker = Observable_1.Observable
            .concat(
        // Current controlling worker (if any).
        Observable_1.Observable.of(this.container.controller), 
        // Future changes of the controlling worker.
        Observable_1.Observable
            .fromEvent(this.container, 'controllerchange')
            .map(function (_) { return _this.container.controller; }))
            .cache(1);
        // To make one-off calls to the worker, awaitSingleControllingWorker waits for
        // a controlling worker to exist.
        this.awaitSingleControllingWorker = this
            .controllingWorker
            .filter(function (worker) { return !!worker; })
            .take(1);
        // Setup the push Observable as a broadcast mechanism for push notifications.
        this.push = Observable_1.Observable
            .defer(function () { return _this.send({ cmd: 'push' }); })
            .share();
    }
    NgServiceWorker.prototype.registrationForWorker = function () {
        var _this = this;
        return function (obs) {
            return obs
                .switchMap(function (worker, index) {
                return fromPromise(function () { return _this.container.getRegistrations(); })
                    .expand(function (v) { return Observable_1.Observable.from(v); })
                    .filter(function (reg) { return reg.active === worker; })
                    .take(1);
            });
        };
    };
    // Sends a single message to the worker, and awaits one (or more) responses.
    NgServiceWorker.prototype.sendToWorker = function (worker, message) {
        // A MessageChannel is sent with the message so responses can be correlated.
        var channel = new MessageChannel();
        // Observe replies.
        var result = Observable_1.Observable
            .fromEvent(channel.port1, 'message')
            .do(ev => console.log('received response', ev))
            .map(function (event) { return event.data; })
            .takeWhile(function (v) { return !!v; })
            .publishReplay();
        // Connecting actually creates the event subscription and starts recording
        // for replay.
        result.connect();
        // Start receiving message(s).
        channel.port1.start();
        // Set a magic value in the message.
        message['$ngsw'] = true;
        console.log('postMessage', message);
        worker.postMessage(message, [channel.port2]);
        return result;
    };
    // Send a message to the current controlling worker, waiting for one if needed.
    NgServiceWorker.prototype.send = function (message) {
        var _this = this;
        var channel = new MessageChannel();
        console.log('called send', message);
        return this
            .awaitSingleControllingWorker
            .switchMap(function (worker) { return _this.sendToWorker(worker, message); });
    };
    // Send a 'ping' to the worker. The returned Observable will complete when the worker
    // acknowledges the message. This provides a test that the worker is alive and listening.
    NgServiceWorker.prototype.ping = function () {
        return this.send({
            cmd: 'ping'
        });
    };
    NgServiceWorker.prototype.log = function () {
        return this.send({
            cmd: 'log'
        });
    };
    NgServiceWorker.prototype.setPushOptions = function (options) {
        this._pushOptions = options;
        return this.send({
            cmd: 'setPushOptions',
            options: options
        });
    };
    NgServiceWorker.prototype.registerForPush = function (options) {
        var _this = this;
        if (!!options) {
            this._pushOptions = options;
        }
        return this
            .awaitSingleControllingWorker
            .let(doAsync(function (_) {
            if (!_this._pushOptions) {
                return Observable_1.Observable.empty();
            }
            return _this.setPushOptions(_this._pushOptions);
        }))
            .let(this.registrationForWorker())
            .map(function (worker) { return worker.pushManager; })
            .switchMap(function (pushManager) {
            // Create an Observable to wrap the Promises of the PushManager API.
            // TODO: switch to Observable.fromPromise when it's not broken.
            // This is extracted as a variable so Typescript infers types correctly.
            var reg = Observable_1.Observable.create(function (observer) {
                // Function that maps subscriptions to an Angular-specific representation.
                var regFromSub = function (sub) { return new NgPushRegistration(sub); };
                pushManager
                    .getSubscription()
                    .then(function (sub) {
                    // If there is one, we don't need to register, just return it.
                    if (!!sub) {
                        return regFromSub(sub);
                    }
                    // No existing subscription, register (with userVisibleOnly: true).
                    return pushManager
                        .subscribe({ userVisibleOnly: true })
                        .then(regFromSub);
                })
                    .then(function (sub) { return _this.zone.run(function () { return observer.next(sub); }); })
                    .then(function () { return _this.zone.run(function () { return observer.complete(); }); })
                    .catch(function (err) { return _this.zone.run(function () { return observer.error(err); }); });
            });
            return reg;
        });
    };
    NgServiceWorker = __decorate([
        core_1.Injectable(), 
        __metadata('design:paramtypes', [core_1.NgZone])
    ], NgServiceWorker);
    return NgServiceWorker;
}());
exports.NgServiceWorker = NgServiceWorker;
