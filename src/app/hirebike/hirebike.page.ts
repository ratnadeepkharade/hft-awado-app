import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';

import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { MapDataService } from '../services/map-data.service';
import { LocationService } from '../services/location.service';
import { LoadingService } from '../services/loading.service';
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

  isBikeReserved = true;

  currentRoute: any;
  routeSummary: any;
  wayPointsInfo:any;

  startRideSubject: Subject<any> = new Subject();
  gotReservedBikeSubject: Subject<any> = new Subject();
  maneuverList: any = [];

  @ViewChild("mapElement", { static: false })
  public mapElement: ElementRef;

  private map: any;
  private ui: any;
  private defaultLayers: any;
  private locationsGroup: any;

  private currentUserPosition = { lat: 48.783480, lng: 9.180319 };
  private bikePosition = { lat: 48.783480, lng: 9.180319 };
  private destinationPosition = { lat: 48.783480, lng: 9.180319 };

  public currentLocationMarker: any;
  public destinationMarker: any;

  public rideStarted = false;

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService,
    private router: Router,
    private mapDataService: MapDataService,
    public locationService: LocationService,
    public loadingService: LoadingService) {
      
    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
  }

  ngOnInit() {
    
  }

  ngAfterViewInit() {
    window.addEventListener('resize', () => this.map.getViewPort().resize());
  }

  ionViewWillEnter() {
    this.currentUserPosition.lat = this.locationService.currentUserPosition.lat;
    this.currentUserPosition.lng = this.locationService.currentUserPosition.lng;

    this.initializeMap();

    //get user location
    if (this.currentLocationMarker) {
      this.currentLocationMarker.setGeometry({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng })
    } else {
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
    }

    this.locationService.liveLocationSubject.subscribe((position) => {
      console.log('got location inside home subscription');
      this.currentUserPosition.lat = position.lat;
      this.currentUserPosition.lng = position.lng;
      if (this.currentLocationMarker) {
        this.currentLocationMarker.setGeometry({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng })
      } else {
        this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
      }
    });
    this.getReservedBike();

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

    this.gotReservedBikeSubject.subscribe(bikeDetails => {
      console.log('Got Bike in map');
      console.log(bikeDetails);
      this.bikePosition.lat = bikeDetails.lat;
      this.bikePosition.lng = bikeDetails.lon;
      var img = ['../../../assets/images/100_percent.png', '../../../assets/images/75_percent.png', '../../../assets/images/50_percent.png', '../../../assets/images/25_percent.png', '../../../assets/images/0_percent.png'];
      if (bikeDetails.batteryPercentage < 100 && bikeDetails.batteryPercentage >= 75) {
        this.addMarker(Number(bikeDetails.lat), Number(bikeDetails.lon), img[0]);
      }
      else if (bikeDetails.batteryPercentage < 75 && bikeDetails.batteryPercentage >= 50) {
        this.addMarker(Number(bikeDetails.lat), Number(bikeDetails.lon), img[1]);
      }
      else if (bikeDetails.batteryPercentage < 50 && bikeDetails.batteryPercentage >= 25) {
        this.addMarker(Number(bikeDetails.lat), Number(bikeDetails.lon), img[2]);
      } else if (bikeDetails.batteryPercentage < 25 && bikeDetails.batteryPercentage >= 0) {
        this.addMarker(Number(bikeDetails.lat), Number(bikeDetails.lon), img[3]);
      }

      this.setZoomLevelToPointersGroup();
    });

    this.startRideSubject.subscribe(event => {
      console.log('start ride');
      //remove event listener
      this.rideStarted = true;
      this.calculateRoute();
    });
  }

  showRouteInfoPanel(route) {
    // Add a marker for each maneuver
    let maneuverList = [];
    for (let i = 0; i < route.leg.length; i += 1) {
      for (let j = 0; j < route.leg[i].maneuver.length; j += 1) {
        // Get the next maneuver.
        let maneuver = route.leg[i].maneuver[j];
        maneuverList.push(maneuver);
      }
    }

    this.maneuverList = maneuverList;
  }

  getReservedBike() {
    this.loadingService.showLoader();
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
            this.isBikeReserved = true;

            //pass reserved bike subject here map
            this.gotReservedBikeSubject.next(resp.data);
            this.loadingService.hideLoader();
          }, (reservedBikeError) => {
            console.log(reservedBikeError);
            this.loadingService.hideLoader();
            this.isBikeReserved = false;
          });
        } else {
          this.loadingService.hideLoader();
          this.isBikeReserved = false;
        }
      }, (bikeDetailsError) => {
        console.log(bikeDetailsError);
        this.loadingService.hideLoader();
        this.isBikeReserved = false;
      });
    });
  }

  startTrip() {
    this.isBikeHired = true;
    this.startRideSubject.next('some value');
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/rent' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.get(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.loadingService.hideLoader();
        this.toastService.showToast("Trip Started");
        this.isBikeHired = true;
      }, (error) => {
        console.log(error);
        this.loadingService.hideLoader();
        this.toastService.showToast("This is ongoing Trip");
      });
    });

  }

  startTrip1() {
    this.isBikeHired = true;
    this.startRideSubject.next('some value');
  }

  CancelTrip() {
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/rent' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.delete(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.loadingService.hideLoader();
        this.toastService.showToast("Trip Ended!");
      }, (error) => {
        console.log(error);
        this.loadingService.hideLoader();
        this.toastService.showToast("No Ongong Trip to End")
      });
    });
  }

  ngOnDestroy() {
    // needed if child gets re-created (eg on some model changes)
    // note that subsequent subscriptions on the same subject will fail
    // so the parent has to re-create parentSubject on changes
    //this.startRideSubject.unsubscribe();
  }

  onSuccess(result) {
    var route = result.response.route[0];
    /*
     * The styling of the route response on the map is entirely under the developer's control.
     * A representitive styling can be found the full JS + HTML code of this example
     * in the functions below:
     */
    this.addRouteShapeToMap(route);
    this.addManueversToMap(route);
    this.mapDataService.mapDataSubject.next(route);

    //addWaypointsToPanel(route.waypoint);
    //addManueversToPanel(route);
    //addSummaryToPanel(route.summary);
  }

  /**
     * This function will be called if a communication error occurs during the JSON-P request
     * @param  {Object} error  The error message received.
     */
  onError(error) {
    alert('Can\'t reach the remote server');
  }

  bubble;

  /**
   * Opens/Closes a infobubble
   * @param  {H.geo.Point} position     The location on the map.
   * @param  {String} text              The contents of the infobubble.
   */
  openBubble(position, text) {
    if (!this.bubble) {
      this.bubble = new H.ui.InfoBubble(
        position,
        // The FO property holds the province name.
        { content: text });
      this.ui.addBubble(this.bubble);
    } else {
      this.bubble.setPosition(position);
      this.bubble.setContent(text);
      this.bubble.open();
    }
  }

  /**
   * Creates a H.map.Polyline from the shape of the route and adds it to the map.
   * @param {Object} route A route as received from the H.service.RoutingService
   */
  addRouteShapeToMap(route) {
    var lineString = new H.geo.LineString(),
      routeShape = route.shape,
      polyline;

    routeShape.forEach(function (point) {
      var parts = point.split(',');
      lineString.pushLatLngAlt(parts[0], parts[1]);
    });

    polyline = new H.map.Polyline(lineString, {
      style: {
        lineWidth: 4,
        strokeColor: 'rgba(0, 128, 255, 0.7)'
      }
    });
    // Add the polyline to the map
    this.map.addObject(polyline);
    // And zoom to its bounding rectangle
    this.map.getViewModel().setLookAtData({
      bounds: polyline.getBoundingBox()
    });
  }

  /**
  * Creates a series of H.map.Marker points from the route and adds them to the map.
  * @param {Object} route  A route as received from the H.service.RoutingService
  */
  addManueversToMap(route) {
    var svgMarkup = '<svg width="18" height="18" ' +
      'xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="8" cy="8" r="8" ' +
      'fill="#1b468d" stroke="white" stroke-width="1"  />' +
      '</svg>',
      dotIcon = new H.map.Icon(svgMarkup, { anchor: { x: 8, y: 8 } }),
      group = new H.map.Group()
    var group = new H.map.Group();

    // Add a marker for each maneuver
    for (let i = 0; i < route.leg.length; i += 1) {
      for (let j = 0; j < route.leg[i].maneuver.length; j += 1) {
        // Get the next maneuver.
        var maneuver = route.leg[i].maneuver[j];
        // Add a marker to the maneuvers group
        var marker = new H.map.Marker({
          lat: maneuver.position.latitude,
          lng: maneuver.position.longitude
        },
          { icon: dotIcon });
        marker.instruction = maneuver.instruction;
        group.addObject(marker);
      }
    }

    group.addEventListener('tap', (evt) => {
      this.map.setCenter(evt.target.getGeometry());
      this.openBubble(
        evt.target.getGeometry(), evt.target.instruction);
    }, false);

    // Add the maneuvers group to the map
    this.map.addObject(group);
  }

  calculateRoute() {
    var waypoint0 = this.bikePosition.lat + ',' + this.bikePosition.lng;
    var waypoint1 = this.destinationPosition.lat + ',' + this.destinationPosition.lng;
    var router = this.platform.getRoutingService(),
      routeRequestParams = {
        mode: 'fastest;bicycle',
        representation: 'display',
        routeattributes: 'waypoints,summary,shape,legs',
        maneuverattributes: 'direction,action',
        waypoint0: waypoint0, // Brandenburg Gate
        waypoint1: waypoint1  // Friedrichstraße Railway Station
      };

    router.calculateRoute(
      routeRequestParams,
      this.onSuccess.bind(this),
      this.onError.bind(this)
    );
  }


  initializeMap() {
    // Obtain the default map types from the platform object
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
    // create custom map settings (icons on map)
    var customMapSettings = new H.ui.MapSettingsControl({
      baseLayers: [
        {
          label: "3D", layer: this.defaultLayers.vector.normal.map
        }, {
          label: "Normal", layer: this.defaultLayers.raster.normal.map
        }, {
          label: "Satellite", layer: this.defaultLayers.raster.satellite.map
        }, {
          label: "Terrain", layer: this.defaultLayers.raster.terrain.map
        }
      ],
      layers: [
        {
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

    // Listen for base layer change event (eg. from satellite to 3D)
    this.map.addEventListener('baselayerchange', (evt) => {
      let mapConfig = this.map.getBaseLayer().getProvider().getStyleInternal().getConfig();
      if (mapConfig === null || (mapConfig && mapConfig.sources && mapConfig.sources.omv)) {
        this.map.getViewModel().setLookAtData({ tilt: 60 });
      } else {
        this.map.getViewModel().setLookAtData({ tilt: 0 });
      }
    });

    // listen for map click event
    this.map.addEventListener('tap', this.mapClickedEvent.bind(this));

    if(!this.locationsGroup) {
      this.locationsGroup = new H.map.Group();
    }
    this.map.addObject(this.locationsGroup);
  }

  mapClickedEvent(event) {
    if(this.rideStarted) {
      return;
    }
    //console.log(event.type, event.currentPointer.type);
    var coord = this.map.screenToGeo(event.currentPointer.viewportX,
      event.currentPointer.viewportY);
    console.log(coord.lat + ', ' + coord.lng);

    this.destinationPosition = { lat: coord.lat, lng: coord.lng };

    if (this.destinationMarker) {
      this.destinationMarker.setGeometry({ lat: coord.lat, lng: coord.lng })
    } else {
      let icon = new H.map.Icon('../../../assets/images/current_location.png');
      // Create a marker using the previously instantiated icon:
      this.destinationMarker = new H.map.Marker({ lat: coord.lat, lng: coord.lng }, { icon: icon });
      // Add the marker to the map:
      if(!this.locationsGroup) {
        this.locationsGroup = new H.map.Group();
      }
      this.locationsGroup.addObjects([this.destinationMarker]);
      this.setZoomLevelToPointersGroup();
    }
  }

  //TODO change this logic
  getCurrentPosition() {
    if (!this.currentLocationMarker) {
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
    }
    this.map.setZoom(17);
    this.map.setCenter({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng });
  }

  setZoomLevelToPointersGroup() {
    this.map.getViewModel().setLookAtData({
      bounds: this.locationsGroup.getBoundingBox()
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
    if(!this.locationsGroup) {
      this.locationsGroup = new H.map.Group();
    }
    this.locationsGroup.addObjects([this.currentLocationMarker]);
    this.setZoomLevelToPointersGroup();

    //this.map.addObject(marker);
    //this.map.setCenter({ lat: lat, lng: lng });
  }

  addMarker(lat, lng, img) {
    var icon = new H.map.Icon(img);
    // Create a marker using the previously instantiated icon:
    var marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });
    // Add the marker to the map:
    //this.map.addObject(marker);
    if(!this.locationsGroup) {
      this.locationsGroup = new H.map.Group();
    }
    this.locationsGroup.addObjects([marker]);
  }

  enable3DMaps() {
    this.map.setBaseLayer(this.defaultLayers.vector.normal.map);
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
      var streets = result.Response.View[0].Result[0].Location.Address.Street;
      var houseNumber = result.Response.View[0].Result[0].Location.Address.HouseNumber;
      var zipcode = result.Response.View[0].Result[0].Location.Address.PostalCode;

      return streets + houseNumber + zipcode;
    }, (error) => {
      alert(error);
    });
  }
}
