import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class FeedbackService {
  feedbackBikeDetails = {name : "",bikeid:""}
  constructor() { }
public getBikeid(){
  return this.feedbackBikeDetails.bikeid
}
public setBikeid (bikeid){
  this.feedbackBikeDetails.bikeid = bikeid
}
}
