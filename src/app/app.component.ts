import { Component } from '@angular/core';
import {NgServiceWorker} from './ngsw/index';
import {Observable} from 'rxjs/Rx';

@Component({
  moduleId: module.id,
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.css'],
  providers: [NgServiceWorker]
})
export class AppComponent {
  key = '';
  url = '';
  auth = '';
  pushes = [];

  constructor(private sw: NgServiceWorker) {
    console.log('ping');
    sw.ping()
      .subscribe(undefined, undefined, () => {
        console.log('pong');
      });
    sw.registerForPush(/*{
      showNotification: true
    }*/)
    .subscribe(reg => {
      this.url = reg['url'];
      this.auth = reg.auth();
      this.key = reg.key();
    });

    this.sw.push
      .subscribe(push => this.pushes.push(push));
  }
}
