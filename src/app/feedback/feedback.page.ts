import { Component, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { RestService } from 'src/app/rest.service';
import { Storage } from '@ionic/storage';
import { Router } from '@angular/router';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { ToastService } from '../services/toast.service';
import { FeedbackService } from '../services/feedback.service';

@Component({
  selector: 'app-feedback',
  templateUrl: './feedback.page.html',
  styleUrls: ['./feedback.page.scss'],
})
export class FeedbackPage implements OnInit {
  public angForm: FormGroup;
  
 
  
  feedbackApi:  Observable<any>;
  content: "";
  bikeId="";
  public isDetailsVisible = false;
 
  
  
 

  constructor(private router: Router, 
    public httpClient: HttpClient, 
    public restService: RestService,
    private toastService: ToastService,
    private fb: FormBuilder,
    private storage: Storage,
    public feedbackService: FeedbackService) {
      this.createForm();

     }

  ngOnInit() {
  }
  createForm() {
    this.angForm = this.fb.group({
       
       
       feedback: ['', [Validators.required ]],
      
       
 
   
    });
    
  }
  submitFeedback() {
    if (this.angForm.invalid) {
      return;
  }
  let Form = JSON.stringify(this.angForm.value);
  
    this.storage.get('token').then((token) => {
      let url = 'http://193.196.52.237:8081/feedbacks'
      let Form = JSON.stringify(this.angForm.value);
      const headers = new HttpHeaders().set("Authorization", "Bearer " + token);
      this.feedbackApi = this.httpClient.post<any>(url, {"content": Form,"bikeId":this.feedbackService.getBikeid()},{headers});
      this.feedbackApi.subscribe((resp) => {
        //console.log("rides response", resp);
        this.isDetailsVisible = false;
        this.toastService.showToast("Feedback Successful!")
        this.router.navigateByUrl('/home');
       
        //this.loadingService.hideLoader();
      }, (error) => {console.log(error)
        this.toastService.showToast("Feedback failed !")
        //this.loadingService.hideLoader();
      });
    });
}
  }

