import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';

import { RidehistoryPage } from './ridehistory.page';

describe('RidehistoryPage', () => {
  let component: RidehistoryPage;
  let fixture: ComponentFixture<RidehistoryPage>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ RidehistoryPage ],
      imports: [IonicModule.forRoot()]
    }).compileComponents();

    fixture = TestBed.createComponent(RidehistoryPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
