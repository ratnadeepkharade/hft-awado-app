import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UserService {
userDetails = {name : "",username:""}
  constructor() { }
public getUsername(){
  return this.userDetails.username
}
public setUsername (username){
  this.userDetails.username = username
}
}
