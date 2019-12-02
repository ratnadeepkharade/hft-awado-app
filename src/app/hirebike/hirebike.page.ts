import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
declare var H: any;
@Component({
  selector: 'app-hirebike',
  templateUrl: './hirebike.page.html',
  styleUrls: ['./hirebike.page.scss'],
})
export class HirebikePage implements OnInit {

  private platform: any;

  reservedBike: any = {};
  bikeDetails: any = {};
  address = "sample";
  isBikeHired = false;
  noReservation = true;

  startRideSubject: Subject<any> = new Subject();
  gotReservedBikeSubject: Subject<any> = new Subject();

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService,
    private router: Router) {
      this.platform = new H.service.Platform({
        'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
      });
  }

  ngOnInit() {
    this.getReservedBike();
  }

  ngAfterViewInit() {

  }

  getReservedBike() {
    this.storage.get('token').then((token) => {
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      //call reserved bike api
      let reserveUrl = 'http://193.196.52.237:8081/active-rent';
      let bikeReservationStatusApi = this.httpClient.get(reserveUrl, { headers });
      bikeReservationStatusApi.subscribe((resp: any) => {
        console.log('Reserved Bike', resp);
        if (resp.data) {
          this.reservedBike = resp.data;
          this.isBikeHired = this.reservedBike.rented;
          //Call Bike Details api
          let bikeDetailsUrl = 'http://193.196.52.237:8081/bikes/' + this.reservedBike.bikeId;
          let bikeDetailsApi = this.httpClient.get(bikeDetailsUrl, { headers });
          bikeDetailsApi.subscribe((resp: any) => {
            console.log('Bike Details', resp);
            this.bikeDetails = resp.data;
            this.noReservation = false;
            this.reverseGeocode(this.platform, this.bikeDetails.lat, this.bikeDetails.lon);
            
            //pass reserved bike subject here map
            this.gotReservedBikeSubject.next(resp.data);
          }, (reservedBikeError) => console.log(reservedBikeError));
        }
      }, (bikeDetailsError) => console.log(bikeDetailsError));
    });
  }

  startTrip1() {
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/rent' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.get(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.toastService.showToast("Trip Started");
        this.isBikeHired = true;
      }, (error) => {
        console.log(error)
        this.toastService.showToast("This is ongoing Trip")
      });
    });

  }

  startTrip() {
    this.isBikeHired = true;
    this.startRideSubject.next('some value');
  }

  CancelTrip() {
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/rent' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.delete(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.toastService.showToast("Trip Ended!");
      }, (error) => {
        console.log(error)
        this.toastService.showToast("No Ongong Trip to End")
      });
    });
  }
  reverseGeocode(platform, lat, lng) {
    var prox = lat + ',' + lng + ',56';
    var geocoder = platform.getGeocodingService(),
      parameters = {
        prox: prox,
        mode: 'retrieveAddresses',
        maxresults: '1',
        gen: '9'
      };

    geocoder.reverseGeocode(parameters, result => {
      console.log(result);
      var streets = result.Response.View[0].Result[0].Location.Address.Street;
      var houseNumber = result.Response.View[0].Result[0].Location.Address.HouseNumber;
      var zipcode = result.Response.View[0].Result[0].Location.Address.PostalCode;

      this.address = streets;


    }, (error) => {
      alert(error);
    });
  }
}
