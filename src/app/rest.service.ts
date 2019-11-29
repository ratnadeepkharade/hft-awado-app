import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage';

@Injectable({
  providedIn: 'root'
})
export class RestService {

  public isUserLoggedIn = false;
  public isLoginPage = false;

  constructor(private storage: Storage) { }

  setToken(token) {
    this.storage.set('token', token);
    this.isUserLoggedIn = true;
  }

  getToken() {
    this.storage.get('token').then((val) => {
      console.log('token', val);
      return val;
    });
  }
}
