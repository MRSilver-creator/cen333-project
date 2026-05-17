import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { MLoginComponent } from '../../m-framework/components/m-login/m-login.component';
import { FirebaseService } from '../../services/firebase.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [MLoginComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  constructor(private router: Router, private firebaseService: FirebaseService) {}

  onLoginSuccess(user: { name: string; email: string }): void {
    this.firebaseService.login(user.name, user.email);
    this.router.navigate(['/map']);
  }
}
