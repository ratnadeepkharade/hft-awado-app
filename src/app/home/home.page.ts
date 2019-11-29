import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
import { ToastService } from '../services/toast.service';


declare var H: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {
  private platform: any;
  private map: any;
  private defaultLayers: any;

  bikes = [];
  bikeApi: Observable<any>;

  private currentLocation = { lat: 0, lng: 0 };
  public isDetailsVisible = false;
  public selectedBike = { id: 0 };
  public isBikeReserved = false;

  @ViewChild("mapElement", { static: false })
  public mapElement: ElementRef;

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService) {

    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
  }

  ngOnInit() {
    this.getBikesList();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.loadmap();
    }, 700);

    window.addEventListener('resize', () => this.map.getViewPort().resize());
  }

  getBikesList() {
    this.geolocation.getCurrentPosition({
      maximumAge: 1000, timeout: 4000,
      enableHighAccuracy: true
    }).then((resp) => {
      let lat = resp.coords.latitude;
      let lng = resp.coords.longitude;

      this.currentLocation.lat = resp.coords.latitude;
      this.currentLocation.lng = resp.coords.longitude;

      this.storage.get('token').then((token) => {
        let url = 'http://193.196.52.237:8081/bikes' + '?lat=' + lat + '&lng=' + lng;
        const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
        this.bikeApi = this.httpClient.get(url, { headers });
        this.bikeApi.subscribe((resp) => {
          console.log("bikes response", resp);
          this.bikes = resp;
          for (let i = 0; i < this.bikes.length; i++) {
            this.bikes[i].distance = this.bikes[i].distance.toFixed(2);;
            this.reverseGeocode(this.platform, this.bikes[i].lat, this.bikes[i].lon, i);
          }
        }, (error) => console.log(error));
      });
    }, er => {
      alert('Can not retrieve location');
    }).catch((error) => {
      alert('Error getting location - ' + JSON.stringify(error));
    });
  }

  loadmap() {
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

    this.map.addEventListener('baselayerchange', (data) => {
      let mapConfig = this.map.getBaseLayer().getProvider().getStyleInternal().getConfig();
      if (mapConfig === null || (mapConfig && mapConfig.sources && mapConfig.sources.omv)) {
        this.map.getViewModel().setLookAtData({ tilt: 60 });
      } else {
        this.map.getViewModel().setLookAtData({ tilt: 0 });
      }
    });
    this.getLocation(this.map);

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
  }

  getCurrentPosition() {
    this.getLocation(this.map.setZoom(17));
  }

  getLocation(map) {
    this.geolocation.getCurrentPosition(
      {
        maximumAge: 1000, timeout: 2000,
        enableHighAccuracy: true
      }
    ).then((resp) => {
      let lat = resp.coords.latitude;
      let lng = resp.coords.longitude;
      this.currentLocation.lat = resp.coords.latitude;
      this.currentLocation.lng = resp.coords.longitude;
      this.moveMapToGiven(map, lat, lng);
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
      console.log(result);
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
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/reservation' + '?bikeId=' + this.selectedBike.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      this.bikeApi = this.httpClient.get(url, { headers });
      this.bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.isBikeReserved = true;
        this.toastService.showToast("Reservation Successful!");
      }, (error) => {
        console.log(error)
        this.toastService.showToast("Only one bike may be reserved or rented at a time")
      });
    });
  }

}
