import { Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MMainMenuComponent } from '../../m-framework/components/m-main-menu/m-main-menu.component';
import { MAhaComponent } from '../../m-framework/components/m-aha/m-aha.component';
import { MResultBoxComponent } from '../../m-framework/components/m-result-box/m-result-box.component';
import { MTableComponent } from '../../m-framework/components/m-table/m-table.component';
import { FirebaseService, SafetyReport, UserProfile } from '../../services/firebase.service';
import { GeminiService } from '../../services/gemini.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MContainerComponent, MMainMenuComponent,
    MAhaComponent, MResultBoxComponent, MTableComponent
  ],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css'
})
export class ProfileComponent implements OnInit {

  activeTab = 'My Profile';

  profile: UserProfile | null = null;
  nameInitials = '';
  userRank = 0;
  myReports: SafetyReport[] = [];

  digest = '';
  digestLoading = false;

  scoringRules = [
    { action: 'Submit a report', points: '+10' },
    { action: 'Report gets verified (3+ upvotes)', points: '+20' },
    { action: 'Upvote a report', points: '+2' },
    { action: 'Dispute a false report', points: '+5' },
  ];

  constructor(private fb: FirebaseService, private gemini: GeminiService) {}

  ngOnInit(): void {
    const user = this.fb.getCurrentUser();
    if (!user) return;

    this.fb.getProfile(user.email, p => {
      if (p) {
        this.profile = p;
      } else {
        this.profile = { displayName: user.name, email: user.email, contributionScore: 0, totalReports: 0, verifiedReports: 0 };
        this.fb.saveProfile(user.email, this.profile);
      }
      const n = this.profile.displayName ?? '';
      const parts = n.split(' ');
      this.nameInitials = parts.map((p: string) => p[0]).join('').toUpperCase().slice(0, 2);
    });

    this.fb.getReports(reports => {
      this.myReports = reports.filter(r => r.reporterEmail === user.email);
    });

    this.fb.getAllProfiles(profiles => {
      const sorted = [...profiles].sort((a, b) => (b.contributionScore || 0) - (a.contributionScore || 0));
      const idx = sorted.findIndex(p => p.email === user.email);
      this.userRank = idx >= 0 ? idx + 1 : sorted.length + 1;
    });
  }

  onMenuClick(tab: string): void { this.activeTab = tab; }

  async generateDigest(): Promise<void> {
    this.digestLoading = true;
    this.digest = '';
    const user = this.fb.getCurrentUser();

    this.fb.getReports(async reports => {
      const week = reports.filter(r => {
        const age = Date.now() - new Date(r.timestamp).getTime();
        return age < 7 * 86400000;
      });
      const summary = week.map(r => `${r.category} (${r.severity}) - ${r.description}`).slice(0, 10).join('\n');
      const prompt = `You are a neighbourhood safety AI. Here are this week's hazard reports near Abu Dhabi:
${summary || 'No reports this week.'}
Write a brief, friendly weekly safety digest for the user "${user?.name || 'resident'}" in 3-4 sentences. Mention any patterns, advice, and end positively.`;
      try {
        this.digest = await this.gemini.generateText(prompt);
      } catch {
        this.digest = 'Unable to generate digest at this time. Please try again later.';
      }
      this.digestLoading = false;
    });
  }
}
