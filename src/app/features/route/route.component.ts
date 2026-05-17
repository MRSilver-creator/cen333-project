import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MMainMenuComponent } from '../../m-framework/components/m-main-menu/m-main-menu.component';
import { MAhaComponent } from '../../m-framework/components/m-aha/m-aha.component';
import { MResultBoxComponent } from '../../m-framework/components/m-result-box/m-result-box.component';
import { MTableComponent } from '../../m-framework/components/m-table/m-table.component';
import { FirebaseService, SafetyReport } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';

interface RouteAdvisory { advisory: string; safeAlternative: string; }

@Component({
  selector: 'app-route',
  standalone: true,
  imports: [
    CommonModule, FormsModule, GoogleMapsModule,
    MContainerComponent, MMainMenuComponent,
    MAhaComponent, MResultBoxComponent, MTableComponent
  ],
  templateUrl: './route.component.html',
  styleUrl: './route.component.css'
})
export class RouteComponent implements OnInit {

  activeTab = 'Plan Route';

  lat = 0;
  lng = 0;
  locationReady = false;
  destination = '';
  checking = false;
  routeChecked = false;

  allReports: SafetyReport[] = [];
  hazardsOnRoute: SafetyReport[] = [];
  routePath: google.maps.LatLngLiteral[] = [];
  routeAdvisory: RouteAdvisory | null = null;

  mapCenter: google.maps.LatLngLiteral = { lat: 24.4539, lng: 54.3773 };
  mapZoom = 12;
  mapOptions: google.maps.MapOptions = { mapTypeId: 'roadmap' };

  constructor(private fb: FirebaseService, private gemini: GeminiService) {}

  ngOnInit(): void {
    navigator.geolocation?.getCurrentPosition(
      pos => {
        this.lat = pos.coords.latitude;
        this.lng = pos.coords.longitude;
        this.mapCenter = { lat: this.lat, lng: this.lng };
        this.locationReady = true;
      }
    );
    this.fb.getReports(r => this.allReports = r);
  }

  onMenuClick(tab: string): void { this.activeTab = tab; }

  async checkRoute(): Promise<void> {
    if (!this.locationReady || !this.destination || this.checking) return;
    this.checking = true;
    this.routeChecked = false;
    this.hazardsOnRoute = [];
    this.routeAdvisory = null;

    try {
      const geocoder = new google.maps.Geocoder();
      const result = await geocoder.geocode({ address: this.destination });
      if (!result.results.length) throw new Error('Destination not found');

      const destLat = result.results[0].geometry.location.lat();
      const destLng = result.results[0].geometry.location.lng();

      // Simple straight-line route — interpolate 10 points
      const points: google.maps.LatLngLiteral[] = [];
      for (let i = 0; i <= 10; i++) {
        points.push({
          lat: this.lat + (destLat - this.lat) * (i / 10),
          lng: this.lng + (destLng - this.lng) * (i / 10)
        });
      }
      this.routePath = points;

      // Find hazards within ~1 km of any route point
      this.hazardsOnRoute = this.allReports.filter(r =>
        points.some(p => this.distance(p.lat, p.lng, r.lat, r.lng) < 1.0)
      );

      if (this.hazardsOnRoute.length > 0) {
        const summary = this.hazardsOnRoute.map(h => `${h.category} (${h.severity})`).join(', ');
        const prompt = `Route from current location to "${this.destination}" has these hazards: ${summary}.
Respond ONLY with JSON: {"advisory":"one sentence warning","safeAlternative":"one sentence recommendation"}`;
        try {
          const raw = await this.gemini.generateText(prompt);
          this.routeAdvisory = JSON.parse(raw.replace(/```json|```/g, '').trim());
        } catch {
          this.routeAdvisory = { advisory: 'Hazards detected along this route.', safeAlternative: 'Consider an alternative route.' };
        }
      }

      this.routeChecked = true;
      this.activeTab = 'Safety Advisory';
    } catch {
      this.routeChecked = true;
      this.activeTab = 'Safety Advisory';
    }

    this.checking = false;
  }

  hazardMarkerOptions(r: SafetyReport): google.maps.MarkerOptions {
    const color = r.severity === 'High' ? '#EE2737' : r.severity === 'Medium' ? '#FF8C00' : '#0C2340';
    return { icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 0.9, strokeWeight: 1, strokeColor: '#fff' } };
  }

  showOriginalRoute(): void { this.activeTab = 'Plan Route'; }
  requestAlternate(): void { this.destination = ''; this.routeChecked = false; this.activeTab = 'Plan Route'; }

  private distance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
