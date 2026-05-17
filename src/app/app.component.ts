import { Component } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { MHeaderComponent } from './m-framework/components/m-header/m-header.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [MHeaderComponent, RouterOutlet, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  titleName = 'SafeRoute';
  showGlobalShell = false;

  constructor(private router: Router) {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      const url = (e.urlAfterRedirects || '').split('?')[0].split('#')[0];
      // Only show the m-header shell on inner app pages (not home or login)
      const innerPages = ['/map', '/report', '/route', '/profile', '/leaderboard'];
      this.showGlobalShell = innerPages.some(p => url === p || url.startsWith(p + '/'));
    });
  }
}
