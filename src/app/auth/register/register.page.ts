import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  httpClient: any;
  registerApi: Observable<any>;
  restService: any;
  router: any;
  correctCredentials: boolean;
  constructor() { }

  ngOnInit() {
  }
 
}
