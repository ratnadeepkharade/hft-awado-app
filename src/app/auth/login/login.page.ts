import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  username = "";
  password = "";
  correctCredentials = false;
  loginApi: Observable<any>;

  constructor(private router: Router, public httpClient: HttpClient) {

  }

  ngOnInit() {
  }


  login() {
    this.loginApiCall();
  }

  loginApiCall() {
    this.loginApi = this.httpClient.post('http://193.196.52.237:8081/authenticate', {
      "email": this.username,
      "password": this.password
    });
    this.loginApi
      .subscribe((data) => {
        console.log('my data: ', data);
        this.router.navigateByUrl('/home');
      }, (error) =>  {
        console.log(error);
        this.correctCredentials = true;
      });
  }
}
