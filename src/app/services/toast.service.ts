import { Injectable } from '@angular/core';
import { ToastController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class ToastService {

  toast: any;

  constructor(public toastController: ToastController) { }

  showToast(message) {
    this.toast = this.toastController.create({
      message: message,
      duration: 2000
    }).then((toastData)=>{
      toastData.present();
    });
  }
  HideToast(){
    this.toast = this.toastController.dismiss();
  }
}
