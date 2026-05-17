import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MMainMenuComponent } from '../../m-framework/components/m-main-menu/m-main-menu.component';
import { MAhaComponent } from '../../m-framework/components/m-aha/m-aha.component';
import { MResultBoxComponent } from '../../m-framework/components/m-result-box/m-result-box.component';
import { FirebaseService } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';

interface GeminiResult { classification: string; authority: string; action: string; }

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MContainerComponent, MMainMenuComponent,
    MAhaComponent, MResultBoxComponent
  ],
  templateUrl: './report.component.html',
  styleUrl: './report.component.css'
})
export class ReportComponent implements OnInit {

  activeTab = 'Submit Report';

  category = '';
  severity = '';
  description = '';

  lat = 0;
  lng = 0;
  locationReady = false;
  locationError = '';

  submitting = false;
  submitted = false;
  submitError = '';

  geminiResult: GeminiResult | null = null;

  get canSubmit(): boolean {
    return !!this.category && !!this.severity && this.description.length >= 10 && this.locationReady;
  }

  constructor(private fb: FirebaseService, private gemini: GeminiService) {}

  ngOnInit(): void { this.detectLocation(); }

  onMenuClick(tab: string): void { this.activeTab = tab; }

  detectLocation(): void {
    this.locationError = '';
    this.locationReady = false;
    if (!navigator.geolocation) {
      this.locationError = 'Geolocation is not supported by your browser.';
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => { this.lat = pos.coords.latitude; this.lng = pos.coords.longitude; this.locationReady = true; },
      () => { this.locationError = 'Unable to detect location. Please enable GPS.'; }
    );
  }

  async submitReport(): Promise<void> {
    if (!this.canSubmit) return;
    this.submitting = true;
    this.submitted = true;
    this.submitError = '';
    this.activeTab = 'AI Result';

    const prompt = `You are a public-safety AI. A citizen reported the following hazard:
Category: ${this.category}
Severity: ${this.severity}
Description: ${this.description}

Respond ONLY with a JSON object (no markdown, no extra text) with keys:
- "classification": a concise hazard classification (one sentence)
- "authority": which authority should be notified (e.g. Municipality, Police, Civil Defence)
- "action": recommended immediate action for citizens (one sentence)`;

    try {
      const raw = await this.gemini.generateText(prompt);
      const clean = raw.replace(/```json|```/g, '').trim();
      this.geminiResult = JSON.parse(clean);
    } catch {
      this.geminiResult = {
        classification: this.category + ' hazard reported',
        authority: 'Local Municipality',
        action: 'Exercise caution in the area and report to local authorities.'
      };
    }

    const user = this.fb.getCurrentUser();
    await this.fb.saveReport({
      category: this.category,
      severity: this.severity,
      description: this.description,
      lat: this.lat,
      lng: this.lng,
      timestamp: new Date().toISOString(),
      upvotes: 0,
      disputes: 0,
      verified: false,
      geminiClassification: this.geminiResult?.classification,
      geminiAuthority: this.geminiResult?.authority,
      geminiAction: this.geminiResult?.action,
      reporterEmail: user?.email ?? 'anonymous'
    });

    // Update contributor score
    if (user?.email) {
      this.fb.getProfile(user.email, profile => {
        const p = profile ?? { displayName: user.name, email: user.email, contributionScore: 0, totalReports: 0, verifiedReports: 0 };
        this.fb.saveProfile(user.email, {
          ...p,
          contributionScore: (p.contributionScore || 0) + 10,
          totalReports: (p.totalReports || 0) + 1
        });
      });
    }

    this.submitting = false;
  }

  resetForm(): void {
    this.category = '';
    this.severity = '';
    this.description = '';
    this.submitted = false;
    this.geminiResult = null;
    this.activeTab = 'Submit Report';
  }
}
