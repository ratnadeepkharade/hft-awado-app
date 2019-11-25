import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
})
export class LoginPage implements OnInit {
  username = "";
  password = "";
  correctCredentials=false;

  constructor(private router: Router) { }


  ngOnInit() {
  }
  clickMe() {
    if (this.username === "admin" && this.password === "admin" || this.username === "demo" && this.password === "demo") {

      this.router.navigateByUrl('/home');
    }
    else { this.correctCredentials=true; }


  }
}
