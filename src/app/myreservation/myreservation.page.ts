import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { LocationService } from '../services/location.service';
import { LoadingService } from '../services/loading.service';
import { DistanceService } from '../services/distance.service';

declare var H: any;

@Component({
  selector: 'app-myreservation',
  templateUrl: './myreservation.page.html',
  styleUrls: ['./myreservation.page.scss'],
})
export class MyreservationPage implements OnInit {
  private platform: any;
  private map: any;
  // Get an instance of the routing service:
  private mapRouter: any;
  private ui: any;
  private defaultLayers: any;

  reservedBike: any = {};
  bikeDetails: any = {};
  isBikeHired = false;
  address = "sample";
  isBikeReserved = true;
  distance="0";

  private currentUserPosition = { lat: 48.783480, lng: 9.180319 };

  public currentLocationMarker: any;

  // Create the parameters for the routing request:
  private routingParameters = {
    // The routing mode:
    mode: 'shortest;pedestrian',
    // The start point of the route:
    waypoint0: 'geo!50.1120423728813,8.68340740740811',
    // The end point of the route:
    waypoint1: 'geo!52.5309916298853,13.3846220493377',
    // To retrieve the shape of the route we choose the route
    // representation mode 'display'
    representation: 'display'
  };

  @ViewChild("mapElement", { static: false })
  public mapElement: ElementRef;

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService,
    private router: Router,
    public locationService: LocationService,
    public distanceService: DistanceService,
    public loadingService: LoadingService) {
    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
    this.mapRouter = this.platform.getRoutingService();
  }

  ngOnInit() {

  }

  ngAfterViewInit() {

  }

  ionViewWillEnter() {
    this.currentUserPosition.lat = this.locationService.currentUserPosition.lat;
    this.currentUserPosition.lng = this.locationService.currentUserPosition.lng;
    
    this.loadmap();
    
    if (this.currentLocationMarker) {
      this.currentLocationMarker.setGeometry({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng })
    } else {
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
    }

    this.getReservedBike();

    this.locationService.liveLocationSubject.subscribe((position) => {
      //console.log('got location inside home subscription');
      this.currentUserPosition.lat = position.lat;
      this.currentUserPosition.lng = position.lng;
      if (this.currentLocationMarker) {
        this.currentLocationMarker.setGeometry({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng })
      } else {
        this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
      }
    });
  }

  showUserLocationOnMap(lat, lng) {
    let svgMarkup = '<svg width="24" height="24" ' +
      'xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="10" cy="10" r="10" ' +
      'fill="#007cff" stroke="white" stroke-width="2"  />' +
      '</svg>';
    let icon = new H.map.Icon(svgMarkup);
    //let icon = new H.map.Icon('../../../assets/images/current_location.png');
    // Create a marker using the previously instantiated icon:
    this.currentLocationMarker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });
    // Add the marker to the map:
    this.map.addObject(this.currentLocationMarker);

    this.map.setCenter({ lat: lat, lng: lng });
  }

  addBikeOnMap() {
    var img = ['../../../assets/images/100_percent.png', '../../../assets/images/75_percent.png', '../../../assets/images/50_percent.png', '../../../assets/images/25_percent.png', '../../../assets/images/0_percent.png'];
    if (this.bikeDetails.batteryPercentage < 100 && this.bikeDetails.batteryPercentage >= 75) {
      this.addMarker(Number(this.bikeDetails.lat), Number(this.bikeDetails.lon), img[0]);
    }
    else if (this.bikeDetails.batteryPercentage < 75 && this.bikeDetails.batteryPercentage >= 50) {
      this.addMarker(Number(this.bikeDetails.lat), Number(this.bikeDetails.lon), img[1]);
    }
    else if (this.bikeDetails.batteryPercentage < 50 && this.bikeDetails.batteryPercentage >= 25) {
      this.addMarker(Number(this.bikeDetails.lat), Number(this.bikeDetails.lon), img[2]);
    } else if (this.bikeDetails.batteryPercentage < 25 && this.bikeDetails.batteryPercentage >= 0) {
      this.addMarker(Number(this.bikeDetails.lat), Number(this.bikeDetails.lon), img[3]);
    }
  }

  getReservedBike() {
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      //call reserved bike api
      let reserveUrl = 'http://193.196.52.237:8081/active-rent';
      let bikeReservationStatusApi = this.httpClient.get(reserveUrl, { headers });
      bikeReservationStatusApi.subscribe((resp: any) => {
        //console.log('Reserved Bike', resp);
        if (resp.data) {
          this.reservedBike = resp.data;
          this.isBikeHired = this.reservedBike.rented;
          //Call Bike Details api
          let bikeDetailsUrl = 'http://193.196.52.237:8081/bikes/' + this.reservedBike.bikeId;
          let bikeDetailsApi = this.httpClient.get(bikeDetailsUrl, { headers });
          bikeDetailsApi.subscribe((resp: any) => {
            //console.log('Bike Details', resp);
            this.loadingService.hideLoader();
            this.bikeDetails = resp.data;
            this.distance = this.distanceService.getDistance();
            this.reverseGeocode(this.platform, this.bikeDetails.lat, this.bikeDetails.lon);
            this.isBikeReserved = true;
            this.addBikeOnMap();

            // set routing params
            this.routingParameters.waypoint1 = 'geo!' + this.bikeDetails.lat + ',' + this.bikeDetails.lon;
            this.routingParameters.waypoint0 = 'geo!' + this.currentUserPosition.lat + ',' + this.currentUserPosition.lng;

            // show route on map
            this.mapRouter.calculateRoute(this.routingParameters, this.onResult.bind(this),
              (error) => {
                //console.log(error.message);
              });
          }, (reservedBikeError) => {
            this.loadingService.hideLoader();
            //console.log(reservedBikeError);
            this.isBikeReserved = false;
          });
        } else {
          this.loadingService.hideLoader();
          this.isBikeReserved = false;
        }
      }, (bikeDetailsError) => {
        this.loadingService.hideLoader();
        //console.log(bikeDetailsError)
        this.isBikeReserved = false;
      });
    });
  }

  cancelReservation() {
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/reservation' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.delete(url, { headers });
      bikeApi.subscribe((resp) => {
        //console.log('Reservation Cancelled: ', resp);
        this.toastService.showToast("Bike Reservation successfully cancelled.");
        this.router.navigateByUrl('/home');
      }, (error) => console.log(error));
    });
  }

  loadmap() {
    this.defaultLayers = this.platform.createDefaultLayers();
    this.map = new H.Map(
      this.mapElement.nativeElement,
      this.defaultLayers.raster.normal.map,
      {
        center: { lat: this.locationService.preiousUserPosition.lat, lng: this.locationService.preiousUserPosition.lng },
        zoom: 17,
        pixelRatio: window.devicePixelRatio || 1
      }
    );

    var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    this.ui = H.ui.UI.createDefault(this.map, this.defaultLayers);
    this.ui.removeControl("mapsettings");
    // create custom one
    var customMapSettings = new H.ui.MapSettingsControl({
      baseLayers: [{
        label: "3D", layer: this.defaultLayers.vector.normal.map
      }, {
        label: "Normal", layer: this.defaultLayers.raster.normal.map
      }, {
        label: "Satellite", layer: this.defaultLayers.raster.satellite.map
      }, {
        label: "Terrain", layer: this.defaultLayers.raster.terrain.map
      }
      ],
      layers: [{
        label: "layer.traffic", layer: this.defaultLayers.vector.normal.traffic
      },
      {
        label: "layer.incidents", layer: this.defaultLayers.vector.normal.trafficincidents
      }
      ]
    });
    this.ui.addControl("custom-mapsettings", customMapSettings);
    var mapSettings = this.ui.getControl('custom-mapsettings');
    var zoom = this.ui.getControl('zoom');
    mapSettings.setAlignment('top-right');
    zoom.setAlignment('right-top');

    this.map.getViewPort().setPadding(30, 30, 30, 30);

    this.map.getViewPort().setPadding(30, 30, 30, 30);
  }

  //TODO change this logic
  getCurrentPosition() {
    if (!this.currentLocationMarker) {
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
    }
    this.map.setZoom(17);
    this.map.setCenter({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng });
  }

  moveMapToGiven(map, lat, lng) {
    var icon = new H.map.Icon('../../../assets/images/current_location.png');
    // Create a marker using the previously instantiated icon:
    var marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });
    // Add the marker to the map:
    map.addObject(marker);
    map.setCenter({ lat: lat, lng: lng });
  }

  addMarker(lat, lng, img) {
    var icon = new H.map.Icon(img);
    // Create a marker using the previously instantiated icon:
    var marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });
    // Add the marker to the map:
    this.map.addObject(marker);
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
      //console.log(result);
      var streets = result.Response.View[0].Result[0].Location.Address.Street;
      var houseNumber = result.Response.View[0].Result[0].Location.Address.HouseNumber;
      var zipcode = result.Response.View[0].Result[0].Location.Address.PostalCode;

      this.address = streets;


    }, (error) => {
      alert(error);
    });
  }


  // Define a callback function to process the routing response:
  onResult(result) {
    var route,
      routeShape,
      startPoint,
      endPoint,
      linestring;
    if (result.response.route) {
      // Pick the first route from the response:
      route = result.response.route[0];
      // Pick the route's shape:
      routeShape = route.shape;

      // Create a linestring to use as a point source for the route line
      linestring = new H.geo.LineString();

      // Push all the points in the shape into the linestring:
      routeShape.forEach(function (point) {
        var parts = point.split(',');
        linestring.pushLatLngAlt(parts[0], parts[1]);
      });

      // Retrieve the mapped positions of the requested waypoints:
      startPoint = route.waypoint[0].mappedPosition;
      endPoint = route.waypoint[1].mappedPosition;

      // Create a polyline to display the route:
      var routeLine = new H.map.Polyline(linestring, {
        /* style: {
          lineWidth: 10,
          fillColor: 'white',
          strokeColor: 'rgba(255, 255, 255, 1)',
          lineDash: [0, 2],
          lineTailCap: 'arrow-tail',
          lineHeadCap: 'arrow-head' 
        } */
        style: {
          lineWidth: 6,
          strokeColor: 'rgba(0, 72, 255, 0.8)',
          lineDash: [0, 2]
        }
      });

      // Add the route polyline and the two markers to the map:
      this.map.addObjects([routeLine]);

      // Set the map's viewport to make the whole route visible:
      this.map.getViewModel().setLookAtData({ bounds: routeLine.getBoundingBox() });
      //this.map.setZoom(this.map.getZoom() - 4.3, true);
    }
  };

  hireBike() {
    if (this.isBikeHired)
      this.toastService.showToast("You already Hired this bike");
    else
      this.router.navigateByUrl('/hirebike');
  }

  ionViewDidLeave(){
    if(this.mapElement) {
      //this.mapElement.nativeElement.remove();
    }
    // if(this.locationService.liveLocationSubject) {
    //   this.locationService.liveLocationSubject.unsubscribe();
    // }
  }
}
