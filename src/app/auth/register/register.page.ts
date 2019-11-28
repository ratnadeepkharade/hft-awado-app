import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RestService } from 'src/app/rest.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
 
  registerApi: Observable<any>;
 
  correctCredentials: boolean;
  email: "";
  password: "";
  lastName: "";
  firstName: "";
  constructor(private router: Router, public httpClient: HttpClient, public restService: RestService) { }

  ngOnInit() {
  }
  submitRegister() {
    this.registerApi = this.httpClient.post('http://193.196.52.237:8081/register', {
      "email": this.email,
      "password": this.password,
      "firstname": this.firstName,
      "lastname": this.lastName
    });
    this.registerApi
      .subscribe((data) => {
        console.log('my data: ', data);
        this.restService.setToken(data.token);
        this.router.navigateByUrl('/home');
      }, (error) => {
        console.log(error);
        this.correctCredentials = true;
      });
  }
}
