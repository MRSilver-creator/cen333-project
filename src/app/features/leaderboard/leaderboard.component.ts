import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MContainerComponent } from '../../m-framework/components/m-container/m-container.component';
import { MMainMenuComponent } from '../../m-framework/components/m-main-menu/m-main-menu.component';
import { MAhaComponent } from '../../m-framework/components/m-aha/m-aha.component';
import { MTableComponent } from '../../m-framework/components/m-table/m-table.component';
import { FirebaseService, UserProfile } from '../../services/firebase.service';

@Component({
  selector: 'app-leaderboard',
  standalone: true,
  imports: [CommonModule, MContainerComponent, MMainMenuComponent, MAhaComponent, MTableComponent],
  templateUrl: './leaderboard.component.html',
  styleUrl: './leaderboard.component.css'
})
export class LeaderboardComponent implements OnInit {

  activeTab = 'Top Contributors';
  leaderboard: (UserProfile & { email: string; rank?: number })[] = [];

  constructor(private fb: FirebaseService) {}

  ngOnInit(): void {
    this.fb.getAllProfiles(profiles => {
      const sorted = profiles
        .sort((a, b) => (b.contributionScore || 0) - (a.contributionScore || 0))
        .map((p, i) => ({ ...p, rank: i + 1 }));
      this.leaderboard = sorted;
    });
  }

  onMenuClick(tab: string): void { this.activeTab = tab; }
}
