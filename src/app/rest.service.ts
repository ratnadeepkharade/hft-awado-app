import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RestService {

  token: String;
  
  constructor() { }

  setToken(token) {
    this.token = token;
  }

  getToken() {
    return this.token;
  }
}
