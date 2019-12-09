import { Component, OnInit } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Storage } from '@ionic/storage';
import { Router } from '@angular/router';
import { RestService } from '../rest.service';
import { ToastService } from '../services/toast.service';
@Component({
  selector: 'app-ridehistory',
  templateUrl: './ridehistory.page.html',
  styleUrls: ['./ridehistory.page.scss'],
})
export class RidehistoryPage implements OnInit {
  rides = [];
  rideApi: Observable<any>;
  isRideActive=false;
  constructor(
    private router: Router,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,
    private toastService: ToastService
  ) { }

  ngOnInit() {
    this.showrideHistory();
  }
  showrideHistory() {
    

      this.storage.get('token').then((token) => {
        let url = 'http://193.196.52.237:8081/rent-history'
        const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
        this.rideApi = this.httpClient.get(url, { headers });
        this.rideApi.subscribe((resp) => {
          console.log("rides response", resp);
          this.rides = resp.data;
          for (let i = 0; i < this.rides.length; i++) {
            this.rides[i] = this.rides[i];
            if(this.rides[i].active)
            this.isRideActive=true;
        }
      });
    }, er => {
      //alert('Can not retrieve location');
    }).catch((error) => {
      //alert('Error getting location - ' + JSON.stringify(error));
    });
  }
  showRideDetails() {
    //this.router.navigateByUrl('/myreservation');
  }
}
