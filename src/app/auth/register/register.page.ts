import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { RestService } from 'src/app/rest.service';
import { ToastService } from '../../services/toast.service';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage implements OnInit {
  public angForm: FormGroup;
  registerApi: Observable<any>;
 
  correctCredentials: boolean;
  email: "";
  password: "";
  lastName: "";
  firstName: "";
  
  constructor(private router: Router, 
    public httpClient: HttpClient, 
    public restService: RestService,
    private toastService: ToastService,
    private fb: FormBuilder) {
      this.createForm();

     }

  ngOnInit() {
  }
  createForm() {
    this.angForm = this.fb.group({
       firstName: ['',[ Validators.required ]],
       lastName: ['', [Validators.required ]],
       email: ['',[ Validators.required, Validators.email]],
       password: ['', [Validators.required,Validators.minLength(4) ]],
       
 
   
    });
    
  }
  submitRegister() {
    if (this.angForm.invalid) {
      return;
  }

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
        this.toastService.showToast("Registration Successful!")
        this.router.navigateByUrl('/login');
        
      }, (error) => {
        console.log(error);
        this.toastService.showToast("Registration failed!")
        
      });
  }
}
