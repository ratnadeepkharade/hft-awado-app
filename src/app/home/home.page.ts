import { Component, OnInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../services/toast.service';
import { Router } from '@angular/router';
import { LocationService } from '../services/location.service';
import { LoadingService } from '../services/loading.service';

declare var H: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage implements OnInit, OnDestroy {
  private platform: any;
  private map: any;
  private defaultLayers: any;
  private locationsGroup: any;
  private currentUserPosition = { lat: 48.783480, lng: 9.180319 };

  bikes = [];
  bikeApi: Observable<any>;

  public isDetailsVisible = false;
  public selectedBike = { id: 0 };
  public isBikeReserved = false;

  public currentLocationMarker: any;

  @ViewChild("mapElement", { static: false })
  public mapElement: ElementRef;

  constructor(private geolocation: Geolocation,
    private router: Router,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService,
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
    if (this.currentLocationMarker) {
      this.currentLocationMarker.setGeometry({ lat: this.currentUserPosition.lat, lng: this.currentUserPosition.lng })
    } else {
      this.showUserLocationOnMap(this.currentUserPosition.lat, this.currentUserPosition.lng);
    }
    this.getBikesList();

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
    var ui = H.ui.UI.createDefault(this.map, this.defaultLayers);
    ui.removeControl("mapsettings");
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
    ui.addControl("custom-mapsettings", customMapSettings);
    var mapSettings = ui.getControl('custom-mapsettings');
    var zoom = ui.getControl('zoom');
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
    this.map.addEventListener('tap', (event) => {
      console.log(event.type, event.currentPointer.type);
    });

    this.locationsGroup = new H.map.Group();
  }

  getBikesList() {
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/bikes' + '?lat=' + this.currentUserPosition.lat + '&lng=' + this.currentUserPosition.lng;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      this.bikeApi = this.httpClient.get(url, { headers });
      this.bikeApi.subscribe((resp) => {
        console.log("bikes response", resp);
        this.bikes = resp;
        for (let i = 0; i < this.bikes.length; i++) {
          this.bikes[i].distance = this.bikes[i].distance.toFixed(2);;
          this.reverseGeocode(this.platform, this.bikes[i].lat, this.bikes[i].lon, i);
        }
        this.showBikesOnMap();
        this.loadingService.hideLoader();
      }, (error) => {console.log(error)
        this.loadingService.hideLoader();
      });
    });
  }

  showBikesOnMap() {
    var img = ['../../../assets/images/100_percent.png', '../../../assets/images/75_percent.png', '../../../assets/images/50_percent.png', '../../../assets/images/25_percent.png', '../../../assets/images/0_percent.png'];
    for (let i = 0; i < this.bikes.length; i++) {
      if (this.bikes[i].batteryPercentage < 100 && this.bikes[i].batteryPercentage >= 75) {
        this.addMarker(Number(this.bikes[i].lat), Number(this.bikes[i].lon), img[0]);
      }
      else if (this.bikes[i].batteryPercentage < 75 && this.bikes[i].batteryPercentage >= 50) {
        this.addMarker(Number(this.bikes[i].lat), Number(this.bikes[i].lon), img[1]);
      }
      else if (this.bikes[i].batteryPercentage < 50 && this.bikes[i].batteryPercentage >= 25) {
        this.addMarker(Number(this.bikes[i].lat), Number(this.bikes[i].lon), img[2]);
      } else if (this.bikes[i].batteryPercentage < 25 && this.bikes[i].batteryPercentage >= 0) {
        this.addMarker(Number(this.bikes[i].lat), Number(this.bikes[i].lon), img[3]);
      }
    }

    //this.map.addObject(this.locationsGroup);
    this.setZoomLevelToPointersGroup();
  }

  //TODO change this logic
  getCurrentPosition() {
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
    this.locationsGroup.addObjects([this.currentLocationMarker]);
    this.map.addObject(this.locationsGroup);
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

    this.locationsGroup.addObjects([marker]);
  }
  navigatetoBikeList() {
    this.isDetailsVisible = false;
    this.ionViewWillEnter();
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

      this.bikes[index].address = streets;
      this.bikes[index].HouseNumber = houseNumber;
      this.bikes[index].PostalCode = zipcode;

    }, (error) => {
      alert(error);
    });
  }

  showBikeDetails(bike) {
    this.selectedBike = bike;
    this.isDetailsVisible = true;
  }

  reserveBike() {
    //this.selectedBike=bikeS;
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/reservation' + '?bikeId=' + this.selectedBike.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      this.bikeApi = this.httpClient.get(url, { headers });
      this.bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.isBikeReserved = true;
        this.toastService.showToast("Reservation Successful!");
        this.router.navigateByUrl('/myreservation');
        this.loadingService.hideLoader();
      }, (error) => {
        console.log(error);
        this.loadingService.hideLoader();
        this.toastService.showToast("Only one bike may be reserved or rented at a time");
      });
    });
  }

  ngOnDestroy(){
    //this.locationService.liveLocationSubject.unsubscribe();
  }

}
