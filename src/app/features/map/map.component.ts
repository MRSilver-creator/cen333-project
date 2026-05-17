import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GoogleMapsModule } from '@angular/google-maps';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MMainMenuComponent } from '../../m-framework/components/m-main-menu/m-main-menu.component';
import { MAhaComponent } from '../../m-framework/components/m-aha/m-aha.component';
import { MResultBoxComponent } from '../../m-framework/components/m-result-box/m-result-box.component';
import { MSearchButtonComponent } from '../../m-framework/components/m-search-button/m-search-button.component';
import { MTableComponent } from '../../m-framework/components/m-table/m-table.component';
import { FirebaseService, SafetyReport } from '../../services/firebase.service';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    GoogleMapsModule,
    MContainerComponent, MMainMenuComponent,
    MAhaComponent, MResultBoxComponent,
    MSearchButtonComponent, MTableComponent
  ],
  templateUrl: './map.component.html',
  styleUrl: './map.component.css'
})
export class MapComponent implements OnInit {

  activeTab = 'Live Heatmap';

  allReports: SafetyReport[] = [];
  filteredReports: SafetyReport[] = [];
  filterTerm = '';
  filterCategory = '';
  filterSeverity = '';
  filterTime = 'all';

  selectedReport: SafetyReport | null = null;
  detailReport: SafetyReport | null = null;

  voteMessage = '';
  voteMessageType = 'success';

  mapCenter = { lat: 24.4539, lng: 54.3773 };
  mapZoom = 12;
  mapOptions: google.maps.MapOptions = { mapTypeId: 'roadmap', disableDefaultUI: false };

  get heatmapData(): google.maps.LatLng[] {
    return this.filteredReports
      .filter(r => r.lat && r.lng)
      .map(r => new google.maps.LatLng(r.lat, r.lng));
  }

  get verifiedCount(): number { return this.allReports.filter(r => r.verified).length; }
  get highCount(): number { return this.allReports.filter(r => r.severity === 'High').length; }

  constructor(private fb: FirebaseService) {}

  ngOnInit(): void {
    this.fb.getReports(reports => {
      this.allReports = reports;
      this.applyFilters();
    });
  }

  onMenuClick(tab: string): void { this.activeTab = tab; }

  markerOptions(r: SafetyReport): google.maps.MarkerOptions {
    const color = r.severity === 'High' ? '#EE2737' : r.severity === 'Medium' ? '#FF8C00' : '#0C2340';
    return { icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: color, fillOpacity: 0.9, strokeWeight: 1, strokeColor: '#fff' } };
  }

  onMarkerClick(r: SafetyReport): void { this.selectedReport = r; }
  onReportDetails(r: SafetyReport): void { this.detailReport = r; }

  upvote(r: SafetyReport): void {
    if (!r.id) return;
    const upvotes = (r.upvotes || 0) + 1;
    const verified = upvotes >= 3;
    this.fb.updateReport(r.id, { upvotes, verified }).then(() => {
      this.voteMessage = 'Your upvote has been recorded!';
      this.voteMessageType = 'success';
      setTimeout(() => this.voteMessage = '', 3000);
    });
  }

  dispute(r: SafetyReport): void {
    if (!r.id) return;
    const disputes = (r.disputes || 0) + 1;
    this.fb.updateReport(r.id, { disputes }).then(() => {
      this.voteMessage = 'Dispute recorded. Thank you for keeping the map accurate.';
      this.voteMessageType = 'warning';
      setTimeout(() => this.voteMessage = '', 3000);
    });
  }

  applyFilters(): void {
    let result = [...this.allReports];
    if (this.filterCategory) result = result.filter(r => r.category === this.filterCategory);
    if (this.filterSeverity) result = result.filter(r => r.severity === this.filterSeverity);
    if (this.filterTime !== 'all') {
      const now = Date.now();
      const cutoff = this.filterTime === '24h' ? now - 86400000 : now - 604800000;
      result = result.filter(r => new Date(r.timestamp).getTime() >= cutoff);
    }
    this.filteredReports = result;
  }

  resetFilters(): void {
    this.filterCategory = '';
    this.filterSeverity = '';
    this.filterTime = 'all';
    this.applyFilters();
  }
}
