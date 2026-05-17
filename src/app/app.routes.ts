import { Routes } from '@angular/router';
import { HomeComponent }        from './features/home/home.component';
import { LoginComponent }       from './features/login/login.component';
import { MapComponent }         from './features/map/map.component';
import { ReportComponent }      from './features/report/report.component';
import { RouteComponent }       from './features/route/route.component';
import { ProfileComponent }     from './features/profile/profile.component';
import { LeaderboardComponent } from './features/leaderboard/leaderboard.component';
import { authGuard }            from './guards/auth.guard';

export const routes: Routes = [
  { path: '',          component: HomeComponent },
  { path: 'home',      component: HomeComponent },
  { path: 'login',     component: LoginComponent },
  { path: 'map',       component: MapComponent,         canActivate: [authGuard] },
  { path: 'report',    component: ReportComponent,      canActivate: [authGuard] },
  { path: 'route',     component: RouteComponent,       canActivate: [authGuard] },
  { path: 'profile',   component: ProfileComponent,     canActivate: [authGuard] },
  { path: 'leaderboard', component: LeaderboardComponent, canActivate: [authGuard] },
];
