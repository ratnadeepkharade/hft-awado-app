import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable } from 'rxjs';
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
  private map: any;
  // Get an instance of the routing service:
  private mapRouter: any;

  reservedBike: any = {};
  bikeDetails: any = {};

  noReservation = true;

  private currentLocation = { lat: 0, lng: 0 };

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
    private router: Router) {
    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
    this.mapRouter = this.platform.getRoutingService();
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
          //Call Bike Details api
          let bikeDetailsUrl = 'http://193.196.52.237:8081/bikes/' + this.reservedBike.bikeId;
          let bikeDetailsApi = this.httpClient.get(bikeDetailsUrl, { headers });
          bikeDetailsApi.subscribe((resp: any) => {
            console.log('Bike Details', resp);
            this.bikeDetails = resp.data;
            this.noReservation = false;

            // display map
            setTimeout(() => {
              this.loadmap();
            }, 1000);
            window.addEventListener('resize', () => this.map.getViewPort().resize());
          }, (reservedBikeError) => console.log(reservedBikeError));
        }
      }, (bikeDetailsError) => console.log(bikeDetailsError));
    });
  }

  cancelReservation() {
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/reservation' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.delete(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('Reservation Cancelled: ', resp);
        this.toastService.showToast("Bike Reservation successfully cancelled.");
        this.router.navigateByUrl('/home');
      }, (error) => console.log(error));
    });
  }

  loadmap() {
    var defaultLayers = this.platform.createDefaultLayers();
    this.map = new H.Map(
      this.mapElement.nativeElement,
      defaultLayers.raster.normal.map,
      {
        zoom: 17,
        pixelRatio: window.devicePixelRatio || 1
      }
    );

    var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    var ui = H.ui.UI.createDefault(this.map, defaultLayers);
    ui.removeControl("mapsettings");
    // create custom one
    var ms = new H.ui.MapSettingsControl({
      baseLayers: [{
        label: "3D", layer: defaultLayers.vector.normal.map
      }, {
        label: "Normal", layer: defaultLayers.raster.normal.map
      }, {
        label: "Satellite", layer: defaultLayers.raster.satellite.map
      }, {
        label: "Terrain", layer: defaultLayers.raster.terrain.map
      }
      ],
      layers: [{
        label: "layer.traffic", layer: defaultLayers.vector.normal.traffic
      },
      {
        label: "layer.incidents", layer: defaultLayers.vector.normal.trafficincidents
      }
      ]
    });
    ui.addControl("customized", ms);
    var mapSettings = ui.getControl('customized');
    var zoom = ui.getControl('zoom');
    mapSettings.setAlignment('top-right');
    zoom.setAlignment('left-top');

    //get user location
    this.getLocation(this.map);

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

  getLocation(map) {
    this.geolocation.getCurrentPosition(
      {
        maximumAge: 1000, timeout: 5000,
        enableHighAccuracy: true
      }
    ).then((resp) => {
      let lat = resp.coords.latitude
      let lng = resp.coords.longitude
      this.currentLocation.lat = resp.coords.latitude;
      this.currentLocation.lng = resp.coords.longitude;
      this.moveMapToGiven(map, lat, lng);
      // set routing params
      this.routingParameters.waypoint1 = 'geo!' + this.bikeDetails.lat + ',' + this.bikeDetails.lon;
      this.routingParameters.waypoint0 = 'geo!' + this.currentLocation.lat + ',' + this.currentLocation.lng;

      // show route on map
      this.mapRouter.calculateRoute(this.routingParameters, this.onResult.bind(this),
      (error) => {
        alert(error.message);
      });
    }, er => {
      alert('Can not retrieve Location')
    }).catch((error) => {
      alert('Error getting location - ' + JSON.stringify(error))
    });
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
    this.router.navigateByUrl('/hirebike');
  }

}
