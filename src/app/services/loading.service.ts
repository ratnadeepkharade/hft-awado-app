import { Injectable } from '@angular/core';
import { LoadingController } from '@ionic/angular';

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  loaderToShow: any;

  constructor(
    public loadingController: LoadingController
  ) {
  }

  showLoader(message = 'loading...') {
    this.loaderToShow = this.loadingController.create({
      message: message
    }).then((res) => {
      res.present();

      res.onDidDismiss().then((dis) => {
        //console.log('Loading dismissed!');
      });
    });
  }

  hideLoader() {
    this.loadingController.dismiss();
  }
}
