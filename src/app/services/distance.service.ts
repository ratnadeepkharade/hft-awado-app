import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DistanceService {
distanceDetails = {distance : "",distancevalue:""}
  constructor() { }
public getDistance(){
  return this.distanceDetails.distancevalue
}
public setDistance (distancevalue){
  this.distanceDetails.distancevalue = distancevalue
}
}
