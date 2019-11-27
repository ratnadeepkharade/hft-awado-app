import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class RestService {

  constructor(private storage: Storage) { }

  setToken(token) {
    // set a key/value
    this.storage.set('token', token);
  }

  getToken() {
    this.storage.get('token').then((val) => {
      console.log('token', val);
      return val;
    });
  }
}
