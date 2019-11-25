import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { Geolocation } from '@ionic-native/geolocation/ngx';
declare var H: any;
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})
export class HomePage {
  private platform: any;
  private map: any;
  private currentLocation = {lat:0,lng:0};

  @ViewChild("map", { static: false })
  public mapElement: ElementRef;
  public constructor(private geolocation: Geolocation) {
    this.platform = new H.service.Platform({
      'apikey': 'tiVTgBnPbgV1spie5U2MSy-obhD9r2sGiOCbBzFY2_k'
    });
  }

  public ngOnInit() { }

  public ngAfterViewInit() {
    setTimeout(() => {
      this.loadmap();
    }, 1000);

    window.addEventListener('resize', () => this.map.getViewPort().resize());
  }

  loadmap() {
    // Obtain the default map types from the platform object
    var defaultLayers = this.platform.createDefaultLayers();
    this.map = new H.Map(
      this.mapElement.nativeElement,
      defaultLayers.vector.normal.map,
      {
        zoom: 16,
        center: { lat: 40.757601, lng: -73.985328 },
        pixelRatio: window.devicePixelRatio || 1
      }
    );
    var behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(this.map));
    var ui = H.ui.UI.createDefault(this.map, defaultLayers);
    this.getLocation(this.map);
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
    }, er => {
      alert('Can not retrieve Location')
    }).catch((error) => {
      alert('Error getting location - ' + JSON.stringify(error))
    });
  }

  moveMapToGiven(map, lat, lng) {
    
    var icon = new H.map.Icon('../../../assets/images/icon_map_currentLocation.png');
    // Create a marker using the previously instantiated icon:
    var marker = new H.map.Marker({ lat: lat, lng: lng }, { icon: icon });

    // Add the marker to the map:
    map.addObject(marker);
    map.setCenter({ lat: lat, lng: lng });
  }
}
