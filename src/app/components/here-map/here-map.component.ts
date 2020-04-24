import { Component, OnInit, ViewChild, ElementRef, Input } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../../rest.service';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../../services/toast.service';
import { MapDataService } from 'src/app/services/map-data.service';

declare var H: any;

@Component({
  selector: 'app-here-map',
  templateUrl: './here-map.component.html',
  styleUrls: ['./here-map.component.scss'],
})
export class HereMapComponent implements OnInit {
  @ViewChild("mapElement", { static: false })
  public mapElement: ElementRef;

  @Input()
  startRideSubject: Subject<any>;

  @Input()
  gotReservedBikeSubject: Subject<any>;

  private platform: any;
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
    private mapDataService: MapDataService) {

    this.platform = new H.service.Platform({
      // Api key for HereMaps JS version 
      'apikey': ''
    });

    let watch = this.geolocation.watchPosition({ enableHighAccuracy: true, maximumAge: 10000 });
    watch.subscribe((position) => {
      //console.log(position.coords.latitude);
      //console.log(position.coords.longitude);
      this.currentUserPosition.lat = position.coords.latitude;
      this.currentUserPosition.lng = position.coords.longitude;
      if (this.currentLocationMarker) {
        this.currentLocationMarker.setGeometry({ lat: position.coords.latitude, lng: position.coords.longitude });
      }
    }, (errorObj) => {
      //console.log(errorObj.code + ": " + errorObj.message);
    });
  }

  ngOnInit() {
    this.gotReservedBikeSubject.subscribe(bikeDetails => {
      //console.log('Got Bike in map');
      //console.log(bikeDetails);
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
    });

    this.startRideSubject.subscribe(event => {
      //console.log('start ride');
      //remove event listener
      this.rideStarted = true;
      this.calculateRoute();
    });
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initializeMap();
      this.getUserLocation();
    }, 500);
    window.addEventListener('resize', () => this.map.getViewPort().resize());
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
    //console.log(coord.lat + ', ' + coord.lng);

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
    //console.log(this.currentLocationMarker);
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

  getUserLocation() {
    this.geolocation.getCurrentPosition().then((resp) => {
      let lat = resp.coords.latitude;
      let lng = resp.coords.longitude;
      this.currentUserPosition.lat = resp.coords.latitude;
      this.currentUserPosition.lng = resp.coords.longitude;
      this.showUserLocationOnMap(lat, lng);
    }, er => {
      //alert('Can not retrieve Location')
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
    }).catch((error) => {
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
      //alert('Error getting location - ' + JSON.stringify(error))
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

  reverseGeocode(platform, lat, lng, index) {
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
