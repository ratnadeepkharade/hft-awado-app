import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
import { RestService } from '../rest.service';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';


declare var H: any;

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

export class HomePage {
  private platform: any;
  private map: any;
  bikes = [];
  streets = [];
  bikeApi: Observable<any>;


  private currentLocation = { lat: 0, lng: 0 };

  public is3DChecked = false;

  public tempArr = [1, 2];
  public locationArr = [{ lat: 48.778409, lng: 9.179252 },
  { lat: 48.780926, lng: 9.173456 },
  { lat: 48.775174, lng: 9.175459 },
  { lat: 48.793704, lng: 9.191112 }]
  public arrayLanLon = { lat: 0, lng: 0 };
  @ViewChild("mapElement2d", { static: false })
  public mapElement2d: ElementRef;

  @ViewChild("mapElement3d", { static: false })
  public mapElement3d: ElementRef;


 

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage) {

    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
  }

  ngOnInit() {
    this.getBikesList();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.loadmap("2D");
    }, 200);

    window.addEventListener('resize', () => this.map.getViewPort().resize());
  }

  getBikesList() {
    this.geolocation.getCurrentPosition({
      maximumAge: 1000, timeout: 1000,
      enableHighAccuracy: true
    }).then((resp) => {
      this.currentLocation.lat = resp.coords.latitude;
      this.currentLocation.lng = resp.coords.longitude;

      this.storage.get('token').then((token) => {
        let url = 'http://193.196.52.237:8081/bikes' + '?lat=' + this.currentLocation.lat + '&lng=' + this.currentLocation.lng;
        const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
        this.bikeApi = this.httpClient.get(url, { headers });
        this.bikeApi.subscribe((resp) => {
          console.log('my data: ', resp);
          this.bikes = resp;
          for (let i = 0; i < this.bikes.length; i++) {
            var beforeDotStr = ''+this.bikes[i].distance;
            var beforeDot = beforeDotStr.split('.')[0];
            var afterDotArr = beforeDotStr.split('.')[1].split('');
            var afterDot = afterDotArr[0] + afterDotArr[1];
            this.bikes[i].distance = beforeDot + '.' + afterDot; 
            this.reverseGeocode(this.platform, this.bikes[i].lat, this.bikes[i].lon, i);
          }
        }, (error) => console.log(error));
      });
    }, er => {
      alert('Can not retrieve Location')
    }).catch((error) => {
      alert('Error getting location - ' + JSON.stringify(error))
    });
  }





  loadmap(style) {
    // Obtain the default map types from the platform object
    var mapStyle = "raster";
    var mapElement = "mapElement2d";
    if (style === "3D") {
      mapStyle = "vector";
      mapElement = "mapElement3d";
    }
    var defaultLayers = this.platform.createDefaultLayers();
    this.map = new H.Map(
      this[mapElement].nativeElement,
      defaultLayers[mapStyle].normal.map,
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
    zoom.setAlignment('right-top');
    if (style === "3D") {
      this.map.getViewModel().setLookAtData({ tilt: 60 });
    }
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
      let lat = resp.coords.latitude
      let lng = resp.coords.longitude
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

  toggle3DMaps() {
    console.log(this.is3DChecked);
    if (!this.is3DChecked) {
      setTimeout(() => {
        this.loadmap("3D");
      }, 1000);
    }
  }

  enable3DMaps() {
    this.is3DChecked = true;
    setTimeout(() => {
      this.loadmap("3D");
    }, 100);
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









}
