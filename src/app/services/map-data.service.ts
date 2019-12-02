import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class MapDataService {

  mapDataSubject = new Subject<any>(); //Decalring new RxJs Subject

  constructor() { }

  sendDataToOtherComponent(somedata) {
    this.mapDataSubject.next(somedata);
  }

}
