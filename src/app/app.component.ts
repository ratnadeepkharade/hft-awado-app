import { Component } from '@angular/core';

import { Platform } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';
import { Storage } from '@ionic/storage';
import { Router } from '@angular/router';

import { RestService } from './rest.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss']
})
export class AppComponent {

  isLoginPage = false;

  public appPages = [
    {
      title: 'Home',
      url: '/home',
      icon: 'home'
    },
    {
      title: 'My Reservation',
      url: '/myreservation',
      icon: 'clipboard'
    },
    {
      title: 'Logout',
      url: '/login',
      icon: 'exit'
    }
  ];

  constructor(
    private platform: Platform,
    private splashScreen: SplashScreen,
    private statusBar: StatusBar,
    public restService: RestService,
    private storage: Storage,
    private router: Router) {

    this.initializeApp();

    let href = window.location.pathname
    if(href === "/login") {
      this.restService.isLoginPage = true;
    } else {
      this.restService.isLoginPage = false;
    }
    this.storage.get('token').then((token) => {
      if(token === "") {
        this.router.navigateByUrl('/login');
      } else {
        this.restService.isUserLoggedIn = true;
      }
    });
  }

  initializeApp() {
    this.platform.ready().then(() => {
      this.statusBar.styleDefault();
      this.splashScreen.hide();
    });
  }
}
