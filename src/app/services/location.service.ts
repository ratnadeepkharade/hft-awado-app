import { Injectable } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { Subject } from 'rxjs';
@Injectable({
  providedIn: 'root'
})
export class LocationService {
  public preiousUserPosition = { lat: 48.783480, lng: 9.180319, altitude: 250};
  public currentUserPosition = { lat: 48.783480, lng: 9.180319, altitude: 250};

  liveLocationSubject = new Subject<any>(); //Decalring new RxJs Subject

  constructor(private geolocation: Geolocation) {
    let watch = this.geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 10000 });
    watch.subscribe((position) => {
      console.log(position);
      let altitude = position.coords.altitude;
      if (!altitude) {
        altitude = 250;
      }
      this.currentUserPosition.lat = position.coords.latitude;
      this.currentUserPosition.lng = position.coords.longitude;
      this.currentUserPosition.altitude = altitude;

      this.preiousUserPosition.lat = position.coords.latitude;
      this.preiousUserPosition.lng = position.coords.longitude;
      this.preiousUserPosition.altitude = altitude;

      this.getUserLiveLocation(this.currentUserPosition);
    }, (errorObj) => {
      console.log('Error getting live location, setting to previous location');
      this.getUserLiveLocation(this.preiousUserPosition);
    });
  }

  getUserLocation(): Promise<any> {
    return new Promise((resolve, reject) => {

      this.geolocation.getCurrentPosition().then((resp) => {
        console.log(resp);
        let lat = resp.coords.latitude;
        let lng = resp.coords.longitude;
        let altitude = resp.coords.altitude;
        if (!altitude) {
          altitude = 250;
        }

        this.currentUserPosition.lat = resp.coords.latitude;
        this.currentUserPosition.lng = resp.coords.longitude;
        this.currentUserPosition.altitude = altitude;

        this.preiousUserPosition.lat = resp.coords.latitude;
        this.preiousUserPosition.lng = resp.coords.longitude;
        this.preiousUserPosition.altitude = altitude;
        resolve(this.currentUserPosition);
      }, er => {
        console.log('error getting location setting to previous location');
        resolve(this.preiousUserPosition);
      }).catch((error) => {
        console.log('error getting location setting to previous location');
        resolve(this.preiousUserPosition);
      });
    });
  }

  getUserLiveLocation(location) {
    this.liveLocationSubject.next(location);
  }
}
