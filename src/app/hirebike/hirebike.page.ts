import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { MapDataService } from '../services/map-data.service';
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

  currentRoute: any;
  routeSummary: any;
  wayPointsInfo:any;

  startRideSubject: Subject<any> = new Subject();
  gotReservedBikeSubject: Subject<any> = new Subject();
  maneuverList: any = [];

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService,
    private router: Router,
    private mapDataService: MapDataService) {
    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
    this.mapDataService.mapDataSubject.subscribe(receiveddata => {
      console.log('data received ');
      console.log(receiveddata);
      this.currentRoute = receiveddata;
      let content = '';
      content += 'Total distance: ' + receiveddata.summary.distance + 'm. ';
      content += 'Travel Time: ' + Math.floor(receiveddata.summary.travelTime / 60) + ' minutes ' + (receiveddata.summary.travelTime % 60) + ' seconds.' + ' (in current traffic)';
      this.routeSummary = content;
      this.showRouteInfoPanel(receiveddata);
      let waypointLabels = [];
      for (let i = 0; i < receiveddata.waypoint.length; i += 1) {
        waypointLabels.push(receiveddata.waypoint[i].label)
      }
      this.wayPointsInfo = waypointLabels.join(' - ');
    });
  }

  ngOnInit() {
    this.getReservedBike();
  }

  ngAfterViewInit() {

  }

  showRouteInfoPanel(route) {
    // Add a marker for each maneuver
    let maneuverList = [];
    for (let i = 0; i < route.leg.length; i += 1) {
      for (let j = 0; j < route.leg[i].maneuver.length; j += 1) {
        // Get the next maneuver.
        let maneuver = route.leg[i].maneuver[j];
        maneuverList.push(maneuver);

        // var li = document.createElement('li'),
        //   spanArrow = document.createElement('span'),
        //   spanInstruction = document.createElement('span');

        // spanArrow.className = 'arrow ' + maneuver.action;
        // spanInstruction.innerHTML = maneuver.instruction;
        // li.appendChild(spanArrow);
        // li.appendChild(spanInstruction);

        // nodeOL.appendChild(li);
      }
    }

    this.maneuverList = maneuverList;
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

  startTrip() {
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

  startTrip1() {
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
