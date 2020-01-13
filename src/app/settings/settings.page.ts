import { Component, OnInit } from '@angular/core';
import { Router, LoadChildrenCallback } from '@angular/router';
import { ToastService } from '../services/toast.service';
import { AlertController } from '@ionic/angular';
import { RestService } from '../rest.service';
import { Observable, Subject } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Storage } from '@ionic/storage';
@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
})
export class SettingsPage implements OnInit {

  constructor(private router: Router,private toastService: ToastService,public alertController: AlertController,
    public restService: RestService,
    public httpClient: HttpClient,
    private storage: Storage,) { }

  ngOnInit() {
  }
  ChangePassword() {
    this.router.navigateByUrl('/reset-password');
  }
  async DeactivateUser(){
    const alert = await this.alertController.create({
      header: 'Deactivation!',
      message: '<strong>Do you really want to deactivate your account</strong>?',
      buttons: [
        {
          text: 'Not Now',
          role: 'cancel',
          cssClass: 'secondary',
          handler: (blah) => {
            //console.log('Confirm Cancel: blah');
            this.router.navigateByUrl('/settings');
          }
        }, {
          text: 'Yes',
          handler: () => {
            console.log('Confirm Okay');
            this.storage.get('token').then((token) => {
              let url = 'http://193.196.52.237:8081/deactivate-account';
              const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
              let deactivateApi = this.httpClient.delete(url, { headers });
              deactivateApi.subscribe((resp:any) => {
                //console.log('my data: ', resp);
                this.router.navigateByUrl('/login');
                this.toastService.showToast("User account has been deactivated!");
                
              }, (error) => {
                //console.log(error);
                
              });
            });
           
                
          }
        }
      ]
    });

    await alert.present();
  
    
  }
}
