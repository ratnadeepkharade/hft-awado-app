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
import { FeedbackService } from 'src/app/services/feedback.service';
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
  wayPointsInfo: any;

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

  isTripStarted = false;

  constructor(private geolocation: Geolocation,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService,
    private router: Router,
    private mapDataService: MapDataService,
    public locationService: LocationService,
    public loadingService: LoadingService,
    public feedbackService: FeedbackService) {

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
      content += 'Travel Time: ' + Math.floor(receiveddata.summary.travelTime / 60) + ' min';
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

  gotRouteOptions = false;

  getRouteOptions() {
    var waypoint0 = this.bikePosition.lat + ',' + this.bikePosition.lng;
    var waypoint1 = this.destinationPosition.lat + ',' + this.destinationPosition.lng;
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/routing?startlng='+ this.bikePosition.lng + '&startlat=' + this.bikePosition.lat + '&destinationlng='+ this.destinationPosition.lng + '&destinationlat=' + this.destinationPosition.lat;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.get(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.loadingService.hideLoader();
        this.isBikeHired = true;
        this.displayRouteOptions(resp);
        this.gotRouteOptions = true;
      }, (error) => {
        console.log(error);
        this.loadingService.hideLoader();
      });
    });

    // let resp = {
    //   "data": {
    //     "routes": [
    //       {
    //         "route": "{\"response\":{\"metaInfo\":{\"timestamp\":\"2019-12-10T22:17:31Z\",\"mapVersion\":\"8.30.103.151\",\"moduleVersion\":\"7.2.201949-5928\",\"interfaceVersion\":\"2.6.74\",\"availableMapVersion\":[\"8.30.103.151\"]},\"route\":[{\"waypoint\":[{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"}],\"mode\":{\"type\":\"fastest\",\"transportModes\":[\"bicycle\"],\"trafficMode\":\"disabled\",\"feature\":[]},\"shape\":[\"48.7704613,9.1575942,337.0\",\"48.7715851,9.1540272,335.0\",\"48.7712073,9.1605806,329.0\",\"48.7717223,9.1625118,325.0\",\"48.7719047,9.163295,324.0\",\"48.7721622,9.1641963,323.0\",\"48.7725377,9.1656125,322.0\",\"48.7727737,9.1663849,321.0\",\"48.7730205,9.1672969,319.0\",\"48.7730205,9.1674793,318.0\",\"48.7730956,9.1678011,317.0\",\"48.7735248,9.1691315,314.0\",\"48.7735462,9.1692603,313.0\",\"48.7737072,9.1698503,312.0\",\"48.7738574,9.1702366,312.0\",\"48.7739646,9.1704512,312.0\",\"48.7742114,9.1707838,311.0\",\"48.7747371,9.1713846,310.0\",\"48.7749624,9.1715884,310.0\",\"48.775295,9.1719317,310.0\",\"48.7762928,9.1730046,309.0\",\"48.7772691,9.1741741,306.0\",\"48.7784064,9.175483,304.0\",\"48.7795544,9.1766739,301.0\",\"48.7797582,9.1768348,300.0\",\"48.7800801,9.176985,300.0\",\"48.7803805,9.1770923,300.0\",\"48.7805414,9.1771245,300.0\",\"48.7810457,9.177146,298.0\",\"48.7822258,9.1772747,297.0\",\"48.782419,9.1773069,296.0\",\"48.7827516,9.1774356,295.0\",\"48.7869983,9.1746073,295.0\",\"48.7832236,9.1778433,295.0\",\"48.7838459,9.1786051,294.0\",\"48.7840712,9.1789269,294.0\",\"48.7838566,9.1793454,293.0\",\"48.783489,9.180268,292.0\",\"48.7828696,9.1816843,291.0\",\"48.7826765,9.18221,291.0\",\"48.7824082,9.1831219,290.0\",\"48.7820113,9.1845703,289.0\",\"48.7818289,9.1851497,290.0\",\"48.7814856,9.1861689,293.0\",\"48.7814319,9.1863942,294.0\",\"48.7812924,9.1868341,294.0\",\"48.7814426,9.1869199,294.0\",\"48.7821937,9.1874456,293.0\",\"48.782537,9.1877246,292.0\",\"48.7829447,9.1879928,291.0\",\"48.7835558,9.1881752,291.0\",\"48.7838352,9.1886044,290.0\",\"48.7842751,9.1888833,290.0\",\"48.7853587,9.1896343,288.0\",\"48.7857449,9.1898811,288.0\",\"48.7858951,9.1899133,288.0\",\"48.7859917,9.1899133,288.0\",\"48.7860024,9.1900098,288.0\",\"48.7860453,9.19016,287.0\",\"48.7862921,9.1904819,287.0\",\"48.7865818,9.1910291,287.0\",\"48.7878478,9.1932714,285.0\",\"48.7881052,9.1936684,285.0\",\"48.7894249,9.1958678,284.0\",\"48.7893927,9.1963291,284.0\",\"48.7894034,9.1966617,285.0\",\"48.7893713,9.1975951,287.0\",\"48.7893069,9.1987109,291.0\",\"48.789221,9.2007816,298.0\",\"48.7891889,9.2013931,300.0\",\"48.7891352,9.2017472,301.0\",\"48.789103,9.2022085,302.0\",\"48.789103,9.2024767,303.0\",\"48.7891567,9.2027986,304.0\",\"48.7890601,9.2058671,311.0\",\"48.7890279,9.206543,312.0\",\"48.7889636,9.2070901,313.0\",\"48.7888777,9.2084849,311.0\",\"48.7888026,9.210695,303.0\",\"48.7888026,9.2115963,299.0\",\"48.788867,9.2122185,297.0\",\"48.7889314,9.2125726,296.0\",\"48.7889636,9.2130125,294.0\",\"48.7889636,9.2133021,293.0\",\"48.7889099,9.2136347,291.0\",\"48.7887168,9.2140639,289.0\",\"48.7883949,9.2144716,287.0\",\"48.7881696,9.21489,285.0\",\"48.7880409,9.2152762,284.0\",\"48.7878048,9.216274,280.0\",\"48.7876868,9.2165959,279.0\",\"48.7874615,9.2170358,277.0\",\"48.7867856,9.217937,273.0\",\"48.7861633,9.2167246,277.0\",\"48.7857878,9.2159522,282.0\"],\"leg\":[{\"start\":{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},\"end\":{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"},\"length\":6049,\"travelTime\":1633,\"maneuver\":[{\"position\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"instruction\":\"Head toward <span class=\\\"toward_street\\\">Schwabstraße</span> on <span class=\\\"street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">35 m</span>.</span>\",\"travelTime\":8,\"length\":35,\"id\":\"M1\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7705851,\"longitude\":9.1580272},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">2.3 km</span>.</span>\",\"travelTime\":578,\"length\":2305,\"id\":\"M2\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7840712,\"longitude\":9.1789269},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Arnulf-Klett-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">524 m</span>.</span>\",\"travelTime\":138,\"length\":524,\"id\":\"M3\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7818289,\"longitude\":9.1851497},\"instruction\":\"Keep <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Gebhard-Müller-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">101 m</span>.</span>\",\"travelTime\":36,\"length\":101,\"id\":\"M4\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7814319,\"longitude\":9.1863942},\"instruction\":\"Turn <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Willy-Brandt-Straße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">608 m</span>.</span>\",\"travelTime\":176,\"length\":608,\"id\":\"M5\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7859917,\"longitude\":9.1899133},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Neckarstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">583 m</span>.</span>\",\"travelTime\":155,\"length\":583,\"id\":\"M6\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7894249,\"longitude\":9.1958678},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Hackstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">1.4 km</span>.</span>\",\"travelTime\":402,\"length\":1393,\"id\":\"M7\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7883949,\"longitude\":9.2144716},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotenbergstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">318 m</span>.</span>\",\"travelTime\":63,\"length\":318,\"id\":\"M8\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7867856,\"longitude\":9.217937},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">182 m</span>.</span>\",\"travelTime\":77,\"length\":182,\"id\":\"M9\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"instruction\":\"Arrive at <span class=\\\"street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. Your destination is on the right.\",\"travelTime\":0,\"length\":0,\"id\":\"M10\",\"_type\":\"PrivateTransportManeuverType\"}]}],\"summary\":{\"distance\":6049,\"baseTime\":1633,\"flags\":[\"builtUpArea\"],\"text\":\"The trip takes <span class=\\\"length\\\">6.0 km</span> and <span class=\\\"time\\\">27 mins</span>.\",\"travelTime\":1633,\"_type\":\"RouteSummaryType\"}}],\"language\":\"en-us\"}}",
    //         "mode": "NORMAL"
    //       },
    //       {
    //         "route": "{\"response\":{\"metaInfo\":{\"timestamp\":\"2019-12-10T22:17:30Z\",\"mapVersion\":\"8.30.103.151\",\"moduleVersion\":\"7.2.201949-5928\",\"interfaceVersion\":\"2.6.74\",\"availableMapVersion\":[\"8.30.103.151\"]},\"route\":[{\"waypoint\":[{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"}],\"mode\":{\"type\":\"fastest\",\"transportModes\":[\"bicycle\"],\"trafficMode\":\"disabled\",\"feature\":[]},\"shape\":[\"48.7704613,9.1575942,337.0\",\"48.7725851,9.1560272,335.0\",\"48.7712073,9.1605806,329.0\",\"48.7717223,9.1625118,325.0\",\"48.7719047,9.163295,324.0\",\"48.7721622,9.1641963,323.0\",\"48.7725377,9.1656125,322.0\",\"48.7727737,9.1663849,321.0\",\"48.7730205,9.1672969,319.0\",\"48.7730205,9.1674793,318.0\",\"48.7730956,9.1678011,317.0\",\"48.7735248,9.1691315,314.0\",\"48.7735462,9.1692603,313.0\",\"48.7737072,9.1698503,312.0\",\"48.7738574,9.1702366,312.0\",\"48.7739646,9.1704512,312.0\",\"48.7742114,9.1707838,311.0\",\"48.7747371,9.1713846,310.0\",\"48.7749624,9.1715884,310.0\",\"48.775295,9.1719317,310.0\",\"48.7762928,9.1730046,309.0\",\"48.7772691,9.1741741,306.0\",\"48.7784064,9.175483,304.0\",\"48.7795544,9.1766739,301.0\",\"48.7797582,9.1768348,300.0\",\"48.7800801,9.176985,300.0\",\"48.7803805,9.1770923,300.0\",\"48.7805414,9.1771245,300.0\",\"48.7810457,9.177146,298.0\",\"48.7822258,9.1772747,297.0\",\"48.782419,9.1773069,296.0\",\"48.7827516,9.1774356,295.0\",\"48.7859983,9.1756073,295.0\",\"48.7832236,9.1778433,295.0\",\"48.7838459,9.1786051,294.0\",\"48.7840712,9.1789269,294.0\",\"48.7838566,9.1793454,293.0\",\"48.7834489,9.180268,292.0\",\"48.7828696,9.1816843,291.0\",\"48.7826765,9.18221,291.0\",\"48.7824082,9.1831219,290.0\",\"48.7820113,9.1845703,289.0\",\"48.7818289,9.1851497,290.0\",\"48.7814856,9.1861689,293.0\",\"48.7814319,9.1863942,294.0\",\"48.7812924,9.1868341,294.0\",\"48.7814426,9.1869199,294.0\",\"48.7821937,9.1874456,293.0\",\"48.782537,9.1877246,292.0\",\"48.7829447,9.1879928,291.0\",\"48.7862558,9.1881752,291.0\",\"48.7838352,9.1886044,290.0\",\"48.7842751,9.1888833,290.0\",\"48.7853587,9.1896343,288.0\",\"48.7857449,9.1898811,288.0\",\"48.7858951,9.1899133,288.0\",\"48.7859917,9.1899133,288.0\",\"48.7860024,9.1900098,288.0\",\"48.7860453,9.19016,287.0\",\"48.7862921,9.1904819,287.0\",\"48.7865818,9.1910291,287.0\",\"48.7878478,9.1932714,285.0\",\"48.7881052,9.1936684,285.0\",\"48.7894249,9.1958678,284.0\",\"48.7893927,9.1963291,284.0\",\"48.7894034,9.1966617,285.0\",\"48.7893713,9.1975951,287.0\",\"48.7893069,9.1987109,291.0\",\"48.789221,9.2007816,298.0\",\"48.7891889,9.2013931,300.0\",\"48.7891352,9.2017472,301.0\",\"48.789103,9.2022085,302.0\",\"48.789103,9.2024767,303.0\",\"48.7891567,9.2027986,304.0\",\"48.7890601,9.2058671,311.0\",\"48.7890279,9.206543,312.0\",\"48.7889636,9.2070901,313.0\",\"48.7888777,9.2084849,311.0\",\"48.7888026,9.210695,303.0\",\"48.7888026,9.2115963,299.0\",\"48.788867,9.2122185,297.0\",\"48.7889314,9.2125726,296.0\",\"48.7889636,9.2130125,294.0\",\"48.7889636,9.2133021,293.0\",\"48.7889099,9.2136347,291.0\",\"48.7887168,9.2140639,289.0\",\"48.7883949,9.2144716,287.0\",\"48.7881696,9.21489,285.0\",\"48.7880409,9.2152762,284.0\",\"48.7878048,9.216274,280.0\",\"48.7876868,9.2165959,279.0\",\"48.7874615,9.2170358,277.0\",\"48.7867856,9.217937,273.0\",\"48.7861633,9.2167246,277.0\",\"48.7857878,9.2159522,282.0\"],\"leg\":[{\"start\":{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},\"end\":{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"},\"length\":6049,\"travelTime\":1633,\"maneuver\":[{\"position\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"instruction\":\"Head toward <span class=\\\"toward_street\\\">Schwabstraße</span> on <span class=\\\"street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">35 m</span>.</span>\",\"travelTime\":8,\"length\":35,\"id\":\"M1\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7705851,\"longitude\":9.1580272},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">2.3 km</span>.</span>\",\"travelTime\":578,\"length\":2305,\"id\":\"M2\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7840712,\"longitude\":9.1789269},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Arnulf-Klett-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">524 m</span>.</span>\",\"travelTime\":138,\"length\":524,\"id\":\"M3\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7818289,\"longitude\":9.1851497},\"instruction\":\"Keep <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Gebhard-Müller-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">101 m</span>.</span>\",\"travelTime\":36,\"length\":101,\"id\":\"M4\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7814319,\"longitude\":9.1863942},\"instruction\":\"Turn <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Willy-Brandt-Straße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">608 m</span>.</span>\",\"travelTime\":176,\"length\":608,\"id\":\"M5\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7859917,\"longitude\":9.1899133},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Neckarstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">583 m</span>.</span>\",\"travelTime\":155,\"length\":583,\"id\":\"M6\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7894249,\"longitude\":9.1958678},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Hackstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">1.4 km</span>.</span>\",\"travelTime\":402,\"length\":1393,\"id\":\"M7\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7883949,\"longitude\":9.2144716},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotenbergstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">318 m</span>.</span>\",\"travelTime\":63,\"length\":318,\"id\":\"M8\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7867856,\"longitude\":9.217937},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">182 m</span>.</span>\",\"travelTime\":77,\"length\":182,\"id\":\"M9\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"instruction\":\"Arrive at <span class=\\\"street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. Your destination is on the right.\",\"travelTime\":0,\"length\":0,\"id\":\"M10\",\"_type\":\"PrivateTransportManeuverType\"}]}],\"summary\":{\"distance\":6049,\"baseTime\":1633,\"flags\":[\"builtUpArea\"],\"text\":\"The trip takes <span class=\\\"length\\\">6.0 km</span> and <span class=\\\"time\\\">27 mins</span>.\",\"travelTime\":1633,\"_type\":\"RouteSummaryType\"}}],\"language\":\"en-us\"}}",
    //         "mode": "ACCIDENTS"
    //       },
    //       {
    //         "route": "{\"response\":{\"metaInfo\":{\"timestamp\":\"2019-12-10T22:17:30Z\",\"mapVersion\":\"8.30.103.151\",\"moduleVersion\":\"7.2.201949-5928\",\"interfaceVersion\":\"2.6.74\",\"availableMapVersion\":[\"8.30.103.151\"]},\"route\":[{\"waypoint\":[{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"}],\"mode\":{\"type\":\"fastest\",\"transportModes\":[\"bicycle\"],\"trafficMode\":\"disabled\",\"feature\":[]},\"shape\":[\"48.7704613,9.1575942,337.0\",\"48.7735851,9.1570272,335.0\",\"48.7712073,9.1605806,329.0\",\"48.7717223,9.1625118,325.0\",\"48.7719047,9.163295,324.0\",\"48.7721622,9.1641963,323.0\",\"48.7725377,9.1656125,322.0\",\"48.7727737,9.1663849,321.0\",\"48.7730205,9.1672969,319.0\",\"48.7730205,9.1674793,318.0\",\"48.7730956,9.1678011,317.0\",\"48.7735248,9.1691315,314.0\",\"48.7735462,9.1692603,313.0\",\"48.7737072,9.1698503,312.0\",\"48.7738574,9.1702366,312.0\",\"48.7739646,9.1704512,312.0\",\"48.7742114,9.1707838,311.0\",\"48.7747371,9.1713846,310.0\",\"48.7749624,9.1715884,310.0\",\"48.775295,9.1719317,310.0\",\"48.7762928,9.1730046,309.0\",\"48.7772691,9.1741741,306.0\",\"48.7784064,9.175483,304.0\",\"48.7795544,9.1766739,301.0\",\"48.7797582,9.1768348,300.0\",\"48.7800801,9.176985,300.0\",\"48.7803805,9.1770923,300.0\",\"48.7805414,9.1771245,300.0\",\"48.7810457,9.177146,298.0\",\"48.7822258,9.1772747,297.0\",\"48.782419,9.1773069,296.0\",\"48.7827516,9.1774356,295.0\",\"48.7849983,9.1766073,295.0\",\"48.7832236,9.1778433,295.0\",\"48.7838459,9.1786051,294.0\",\"48.7840712,9.1789269,294.0\",\"48.7838566,9.1793454,293.0\",\"48.7834489,9.180268,292.0\",\"48.7828696,9.1816843,291.0\",\"48.7826765,9.18221,291.0\",\"48.7824082,9.1831219,290.0\",\"48.7820113,9.1845703,289.0\",\"48.7818289,9.1851497,290.0\",\"48.7814856,9.1861689,293.0\",\"48.7814319,9.1863942,294.0\",\"48.7812924,9.1868341,294.0\",\"48.7814426,9.1869199,294.0\",\"48.7821937,9.1874456,293.0\",\"48.782537,9.1877246,292.0\",\"48.7829447,9.1879928,291.0\",\"48.7872558,9.1881752,291.0\",\"48.7838352,9.1886044,290.0\",\"48.7842751,9.1888833,290.0\",\"48.7853587,9.1896343,288.0\",\"48.7857449,9.1898811,288.0\",\"48.7858951,9.1899133,288.0\",\"48.7859917,9.1899133,288.0\",\"48.7860024,9.1900098,288.0\",\"48.7860453,9.19016,287.0\",\"48.7862921,9.1904819,287.0\",\"48.7865818,9.1910291,287.0\",\"48.7878478,9.1932714,285.0\",\"48.7881052,9.1936684,285.0\",\"48.7894249,9.1958678,284.0\",\"48.7893927,9.1963291,284.0\",\"48.7894034,9.1966617,285.0\",\"48.7893713,9.1975951,287.0\",\"48.7893069,9.1987109,291.0\",\"48.789221,9.2007816,298.0\",\"48.7891889,9.2013931,300.0\",\"48.7891352,9.2017472,301.0\",\"48.789103,9.2022085,302.0\",\"48.789103,9.2024767,303.0\",\"48.7891567,9.2027986,304.0\",\"48.7890601,9.2058671,311.0\",\"48.7890279,9.206543,312.0\",\"48.7889636,9.2070901,313.0\",\"48.7888777,9.2084849,311.0\",\"48.7888026,9.210695,303.0\",\"48.7888026,9.2115963,299.0\",\"48.788867,9.2122185,297.0\",\"48.7889314,9.2125726,296.0\",\"48.7889636,9.2130125,294.0\",\"48.7889636,9.2133021,293.0\",\"48.7889099,9.2136347,291.0\",\"48.7887168,9.2140639,289.0\",\"48.7883949,9.2144716,287.0\",\"48.7881696,9.21489,285.0\",\"48.7880409,9.2152762,284.0\",\"48.7878048,9.216274,280.0\",\"48.7876868,9.2165959,279.0\",\"48.7874615,9.2170358,277.0\",\"48.7867856,9.217937,273.0\",\"48.7861633,9.2167246,277.0\",\"48.7857878,9.2159522,282.0\"],\"leg\":[{\"start\":{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},\"end\":{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"},\"length\":6049,\"travelTime\":1633,\"maneuver\":[{\"position\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"instruction\":\"Head toward <span class=\\\"toward_street\\\">Schwabstraße</span> on <span class=\\\"street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">35 m</span>.</span>\",\"travelTime\":8,\"length\":35,\"id\":\"M1\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7705851,\"longitude\":9.1580272},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">2.3 km</span>.</span>\",\"travelTime\":578,\"length\":2305,\"id\":\"M2\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7840712,\"longitude\":9.1789269},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Arnulf-Klett-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">524 m</span>.</span>\",\"travelTime\":138,\"length\":524,\"id\":\"M3\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7818289,\"longitude\":9.1851497},\"instruction\":\"Keep <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Gebhard-Müller-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">101 m</span>.</span>\",\"travelTime\":36,\"length\":101,\"id\":\"M4\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7814319,\"longitude\":9.1863942},\"instruction\":\"Turn <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Willy-Brandt-Straße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">608 m</span>.</span>\",\"travelTime\":176,\"length\":608,\"id\":\"M5\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7859917,\"longitude\":9.1899133},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Neckarstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">583 m</span>.</span>\",\"travelTime\":155,\"length\":583,\"id\":\"M6\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7894249,\"longitude\":9.1958678},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Hackstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">1.4 km</span>.</span>\",\"travelTime\":402,\"length\":1393,\"id\":\"M7\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7883949,\"longitude\":9.2144716},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotenbergstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">318 m</span>.</span>\",\"travelTime\":63,\"length\":318,\"id\":\"M8\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7867856,\"longitude\":9.217937},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">182 m</span>.</span>\",\"travelTime\":77,\"length\":182,\"id\":\"M9\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"instruction\":\"Arrive at <span class=\\\"street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. Your destination is on the right.\",\"travelTime\":0,\"length\":0,\"id\":\"M10\",\"_type\":\"PrivateTransportManeuverType\"}]}],\"summary\":{\"distance\":6049,\"baseTime\":1633,\"flags\":[\"builtUpArea\"],\"text\":\"The trip takes <span class=\\\"length\\\">6.0 km</span> and <span class=\\\"time\\\">27 mins</span>.\",\"travelTime\":1633,\"_type\":\"RouteSummaryType\"}}],\"language\":\"en-us\"}}",
    //         "mode": "AIR_POLLUTION"
    //       },
    //       {
    //         "route": "{\"response\":{\"metaInfo\":{\"timestamp\":\"2019-12-10T22:17:31Z\",\"mapVersion\":\"8.30.103.151\",\"moduleVersion\":\"7.2.201949-5928\",\"interfaceVersion\":\"2.6.74\",\"availableMapVersion\":[\"8.30.103.151\"]},\"route\":[{\"waypoint\":[{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"}],\"mode\":{\"type\":\"fastest\",\"transportModes\":[\"bicycle\"],\"trafficMode\":\"disabled\",\"feature\":[]},\"shape\":[\"48.7704613,9.1575942,337.0\",\"48.7745851,9.1580272,335.0\",\"48.7712073,9.1605806,329.0\",\"48.7717223,9.1625118,325.0\",\"48.7719047,9.163295,324.0\",\"48.7721622,9.1641963,323.0\",\"48.7725377,9.1656125,322.0\",\"48.7727737,9.1663849,321.0\",\"48.7730205,9.1672969,319.0\",\"48.7730205,9.1674793,318.0\",\"48.7730956,9.1678011,317.0\",\"48.7735248,9.1691315,314.0\",\"48.7735462,9.1692603,313.0\",\"48.7737072,9.1698503,312.0\",\"48.7738574,9.1702366,312.0\",\"48.7739646,9.1704512,312.0\",\"48.7742114,9.1707838,311.0\",\"48.7747371,9.1713846,310.0\",\"48.7749624,9.1715884,310.0\",\"48.775295,9.1719317,310.0\",\"48.7762928,9.1730046,309.0\",\"48.7772691,9.1741741,306.0\",\"48.7784064,9.175483,304.0\",\"48.7795544,9.1766739,301.0\",\"48.7797582,9.1768348,300.0\",\"48.7800801,9.176985,300.0\",\"48.7803805,9.1770923,300.0\",\"48.7805414,9.1771245,300.0\",\"48.7810457,9.177146,298.0\",\"48.7822258,9.1772747,297.0\",\"48.782419,9.1773069,296.0\",\"48.7827516,9.1774356,295.0\",\"48.7839983,9.1776073,295.0\",\"48.7832236,9.1778433,295.0\",\"48.7838459,9.1786051,294.0\",\"48.7840712,9.1789269,294.0\",\"48.7838566,9.1793454,293.0\",\"48.7834489,9.180268,292.0\",\"48.7828696,9.1816843,291.0\",\"48.7826765,9.18221,291.0\",\"48.7824082,9.1831219,290.0\",\"48.7820113,9.1845703,289.0\",\"48.7818289,9.1851497,290.0\",\"48.7814856,9.1861689,293.0\",\"48.7814319,9.1863942,294.0\",\"48.7812924,9.1868341,294.0\",\"48.7814426,9.1869199,294.0\",\"48.7821937,9.1874456,293.0\",\"48.782537,9.1877246,292.0\",\"48.7829447,9.1879928,291.0\",\"48.7882558,9.1881752,291.0\",\"48.7838352,9.1886044,290.0\",\"48.7842751,9.1888833,290.0\",\"48.7853587,9.1896343,288.0\",\"48.7857449,9.1898811,288.0\",\"48.7858951,9.1899133,288.0\",\"48.7859917,9.1899133,288.0\",\"48.7860024,9.1900098,288.0\",\"48.7860453,9.19016,287.0\",\"48.7862921,9.1904819,287.0\",\"48.7865818,9.1910291,287.0\",\"48.7878478,9.1932714,285.0\",\"48.7881052,9.1936684,285.0\",\"48.7894249,9.1958678,284.0\",\"48.7893927,9.1963291,284.0\",\"48.7894034,9.1966617,285.0\",\"48.7893713,9.1975951,287.0\",\"48.7893069,9.1987109,291.0\",\"48.789221,9.2007816,298.0\",\"48.7891889,9.2013931,300.0\",\"48.7891352,9.2017472,301.0\",\"48.789103,9.2022085,302.0\",\"48.789103,9.2024767,303.0\",\"48.7891567,9.2027986,304.0\",\"48.7890601,9.2058671,311.0\",\"48.7890279,9.206543,312.0\",\"48.7889636,9.2070901,313.0\",\"48.7888777,9.2084849,311.0\",\"48.7888026,9.210695,303.0\",\"48.7888026,9.2115963,299.0\",\"48.788867,9.2122185,297.0\",\"48.7889314,9.2125726,296.0\",\"48.7889636,9.2130125,294.0\",\"48.7889636,9.2133021,293.0\",\"48.7889099,9.2136347,291.0\",\"48.7887168,9.2140639,289.0\",\"48.7883949,9.2144716,287.0\",\"48.7881696,9.21489,285.0\",\"48.7880409,9.2152762,284.0\",\"48.7878048,9.216274,280.0\",\"48.7876868,9.2165959,279.0\",\"48.7874615,9.2170358,277.0\",\"48.7867856,9.217937,273.0\",\"48.7861633,9.2167246,277.0\",\"48.7857878,9.2159522,282.0\"],\"leg\":[{\"start\":{\"linkId\":\"+1188640340\",\"mappedPosition\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"originalPosition\":{\"latitude\":48.770685,\"longitude\":9.157448},\"type\":\"stopOver\",\"spot\":0.1666667,\"sideOfStreet\":\"left\",\"mappedRoadName\":\"Rotebühlstraße\",\"label\":\"Rotebühlstraße - L1015\",\"shapeIndex\":0,\"source\":\"user\"},\"end\":{\"linkId\":\"-1189087529\",\"mappedPosition\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"originalPosition\":{\"latitude\":48.786034,\"longitude\":9.2158129},\"type\":\"stopOver\",\"spot\":0.41,\"sideOfStreet\":\"right\",\"mappedRoadName\":\"Talstraße\",\"label\":\"Talstraße - L1014\",\"shapeIndex\":94,\"source\":\"user\"},\"length\":6049,\"travelTime\":1633,\"maneuver\":[{\"position\":{\"latitude\":48.7704613,\"longitude\":9.1575942},\"instruction\":\"Head toward <span class=\\\"toward_street\\\">Schwabstraße</span> on <span class=\\\"street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">35 m</span>.</span>\",\"travelTime\":8,\"length\":35,\"id\":\"M1\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7705851,\"longitude\":9.1580272},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotebühlstraße</span> <span class=\\\"number\\\">(L1015)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">2.3 km</span>.</span>\",\"travelTime\":578,\"length\":2305,\"id\":\"M2\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7840712,\"longitude\":9.1789269},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Arnulf-Klett-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">524 m</span>.</span>\",\"travelTime\":138,\"length\":524,\"id\":\"M3\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7818289,\"longitude\":9.1851497},\"instruction\":\"Keep <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Gebhard-Müller-Platz</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">101 m</span>.</span>\",\"travelTime\":36,\"length\":101,\"id\":\"M4\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7814319,\"longitude\":9.1863942},\"instruction\":\"Turn <span class=\\\"direction\\\">left</span> onto <span class=\\\"next-street\\\">Willy-Brandt-Straße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">608 m</span>.</span>\",\"travelTime\":176,\"length\":608,\"id\":\"M5\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7859917,\"longitude\":9.1899133},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Neckarstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">583 m</span>.</span>\",\"travelTime\":155,\"length\":583,\"id\":\"M6\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7894249,\"longitude\":9.1958678},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Hackstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">1.4 km</span>.</span>\",\"travelTime\":402,\"length\":1393,\"id\":\"M7\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7883949,\"longitude\":9.2144716},\"instruction\":\"Continue on <span class=\\\"next-street\\\">Rotenbergstraße</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">318 m</span>.</span>\",\"travelTime\":63,\"length\":318,\"id\":\"M8\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7867856,\"longitude\":9.217937},\"instruction\":\"Turn <span class=\\\"direction\\\">right</span> onto <span class=\\\"next-street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. <span class=\\\"distance-description\\\">Go for <span class=\\\"length\\\">182 m</span>.</span>\",\"travelTime\":77,\"length\":182,\"id\":\"M9\",\"_type\":\"PrivateTransportManeuverType\"},{\"position\":{\"latitude\":48.7857878,\"longitude\":9.2159522},\"instruction\":\"Arrive at <span class=\\\"street\\\">Talstraße</span> <span class=\\\"number\\\">(L1014)</span>. Your destination is on the right.\",\"travelTime\":0,\"length\":0,\"id\":\"M10\",\"_type\":\"PrivateTransportManeuverType\"}]}],\"summary\":{\"distance\":6049,\"baseTime\":1633,\"flags\":[\"builtUpArea\"],\"text\":\"The trip takes <span class=\\\"length\\\">6.0 km</span> and <span class=\\\"time\\\">27 mins</span>.\",\"travelTime\":1633,\"_type\":\"RouteSummaryType\"}}],\"language\":\"en-us\"}}",
    //         "mode": "AIR_POLLUTION_AND_ACCIDENTS"
    //       }
    //     ],
    //     "predictionData": {
    //       "airPollutionAndAccidentsPrediction": "test",
    //       "airPollutionPrediction": "test",
    //       "accidentsPrediction": "test",
    //       "normalPrediction": "test",
    //       "overAllPrediction": "test"
    //     }
    //   }
    // }
  }

  displayRouteOptions(resp){
    for (let i = 0; i < resp.data.routes.length; i++) {
      let routeResp = JSON.parse(resp.data.routes[i].route);
      let route = routeResp.response.route[0];
      //console.log(route);
      this.setRouteOptions(route, i, resp.data.routes[i].mode);
      this.drawRouteLine(route, i);
    }

    let firstRoute = JSON.parse(resp.data.routes[0].route).response.route[0];
    console.log(firstRoute);
    let waypointLabels = [];
    for (let i = 0; i < firstRoute.waypoint.length; i += 1) {
      waypointLabels.push(firstRoute.waypoint[i].label)
    }
    this.wayPointsInfo = waypointLabels.join(' - ');
  }

  routeList = {};

  setRouteOptions(route, index, mode) {
    let content = '';
    content += 'Total distance: ' + route.summary.distance + 'm. ';
    content += 'Travel Time: ' + Math.floor(route.summary.travelTime / 60) + ' min';
    console.log(content);
    this.routeList[index] = {route:route, summary:content, mode:mode};
  }

  isRouteSelected = false;
  selectedRoute = {};

  selectRoute(route, index) {
    let routeLine = this.routeLines[index];
    this.map.removeObject(routeLine);
    this.drawRouteLine(route, index, 'rgba(102, 157, 246, 0.9)');
    this.isRouteSelected = true;
    this.selectedRoute = route;
  }

  routeLines = {};

  drawRouteLine(route, index, color = 'rgba(96, 96, 96, 0.9)') {
    let lineString = new H.geo.LineString(),
      routeShape = route.shape,
      polyline;

    routeShape.forEach(function (point) {
      let parts = point.split(',');
      lineString.pushLatLngAlt(parts[0], parts[1]);
    });

    polyline = new H.map.Polyline(lineString, {
      style: {
        lineWidth: 3,
        strokeColor: color
      }
    });
    this.routeLines[index] = polyline;
    // Add the polyline to the map
    this.map.addObject(polyline);
  }

  getRouteType(mode){
    if (mode === "NORMAL") {
      return "Fastest Route";
    } else if(mode === "ACCIDENTS") {
      return "Safe Route";
    } else if(mode === "AIR_POLLUTION") {
      return "Green Route";
    } else {
      return "Safe and Green Route";
    }
  }

  startTrip() {
    this.isBikeHired = true;
    this.startRideSubject.next('some value');
    this.loadingService.showLoader();
    this.storage.get('token').then((token) => {
      const bikeId=this.bikeDetails.id;
      let url = 'http://193.196.52.237:8081/rent' + '?bikeId=' + this.bikeDetails.id;
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      let bikeApi = this.httpClient.get(url, { headers });
      bikeApi.subscribe((resp) => {
        console.log('my data: ', resp);
        this.feedbackService.setBikeid(this.bikeDetails.id);
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

  startTrip2() {
    this.isBikeHired = true;
    this.isTripStarted = true;
    //this.startRideSubject.next('some value');
    this.drawFinalRouteonMap();
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

  drawFinalRouteonMap() {
    this.map.removeObjects(this.map.getObjects());
    this.addRouteShapeToMap(this.selectedRoute);
    this.addManueversToMap(this.selectedRoute);
    this.mapDataService.mapDataSubject.next(this.selectedRoute);
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
        this.router.navigateByUrl('/feedback');
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

    if (!this.locationsGroup) {
      this.locationsGroup = new H.map.Group();
    }
    this.map.addObject(this.locationsGroup);
  }


  isDestinationSelected = false;

  mapClickedEvent(event) {
    if (this.rideStarted) {
      return;
    }
    //console.log(event.type, event.currentPointer.type);
    var coord = this.map.screenToGeo(event.currentPointer.viewportX,
      event.currentPointer.viewportY);
    console.log(coord.lat + ', ' + coord.lng);

    this.destinationPosition = { lat: coord.lat, lng: coord.lng };
    this.isDestinationSelected = true;

    if (this.destinationMarker) {
      this.destinationMarker.setGeometry({ lat: coord.lat, lng: coord.lng })
    } else {
      let icon = new H.map.Icon('../../../assets/images/current_location.png');
      // Create a marker using the previously instantiated icon:
      this.destinationMarker = new H.map.Marker({ lat: coord.lat, lng: coord.lng }, { icon: icon });
      // Add the marker to the map:
      if (!this.locationsGroup) {
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
    if (!this.locationsGroup) {
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
    if (!this.locationsGroup) {
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
