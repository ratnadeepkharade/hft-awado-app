import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Storage } from '@ionic/storage';
import { ToastService } from '../../services/toast.service';
import { UserService } from '../../services/user.service';
import { RestService } from '../../rest.service';

@Component({
  selector: 'app-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
})
export class ResetPasswordPage implements OnInit {
 oldPassword="";
 newPassword=""; 
 confirmPassword="";
 username="";
 ResetPasswordApi : Observable<any>;
  constructor(private router: Router,
     public httpClient: HttpClient,
     private toastService: ToastService,
     public restService: RestService,
    private storage: Storage,
    public userService: UserService) { 
    this.username = this.userService.getUsername();}
  ngOnInit() {
  }
  login(){
    this.router.navigateByUrl('/login');
  }
  resetPassword(){
    if(this.oldPassword=="" || this.confirmPassword=="" || this.newPassword=="")
    this.toastService.showToast("All Feilds are mandatory");
    else if(this.newPassword.length < 4)
    this.toastService.showToast("Weak Password");
    else if(this.confirmPassword!=this.newPassword)
    this.toastService.showToast("Please Confirm Password Again");
    
    else{
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/password-reset/'
      
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      this.ResetPasswordApi = this.httpClient.post<any>(url, {"oldPassword":this.oldPassword,"newPassword": this.newPassword},{headers});
      this.ResetPasswordApi.subscribe((resp) => {
        console.log("PasswordChanged", resp);
        
        this.toastService.showToast("Password Changed Sucessfully!Login Again");
        this.router.navigateByUrl('/login');

      }, (error) => {console.log(error)
        //this.loadingService.hideLoader();
        this.toastService.showToast("Please Try Again");
      });
    });
  }
  }
  
}
