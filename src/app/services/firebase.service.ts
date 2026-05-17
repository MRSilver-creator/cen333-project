import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, onValue, update }
  from 'firebase/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environments';

export interface SafetyReport {
  id?: string;
  category: string;
  severity: string;
  description: string;
  lat: number;
  lng: number;
  timestamp: string;
  upvotes?: number;
  disputes?: number;
  verified?: boolean;
  geminiClassification?: string;
  geminiAuthority?: string;
  geminiAction?: string;
  reporterEmail?: string;
}

export interface UserProfile {
  displayName: string;
  email: string;
  contributionScore?: number;
  totalReports?: number;
  verifiedReports?: number;
}

@Injectable({ providedIn: 'root' })
export class FirebaseService {

  private db: any;

  private _currentUser$ = new BehaviorSubject<{ name: string; email: string } | null>(
    this.loadSession()
  );
  currentUser$: Observable<{ name: string; email: string } | null> = this._currentUser$.asObservable();

  constructor() {
    const app = initializeApp(environment.firebaseConfig);
    this.db = getDatabase(app);
  }

  private loadSession(): { name: string; email: string } | null {
    const s = localStorage.getItem('saferoute_session');
    return s ? JSON.parse(s) : null;
  }

  login(name: string, email: string): void {
    const user = { name, email };
    localStorage.setItem('saferoute_session', JSON.stringify(user));
    this._currentUser$.next(user);
  }

  logout(): void {
    localStorage.removeItem('saferoute_session');
    this._currentUser$.next(null);
  }

  getCurrentUser(): { name: string; email: string } | null {
    return this._currentUser$.getValue();
  }

  // Legacy vital-signs
  saveReading(age: number, heartRate: number): Promise<void> {
    return push(ref(this.db, 'readings'), {
      age, heartRate, timestamp: new Date().toISOString()
    }).then(() => {});
  }

  getReadings(callback: (readings: any[]) => void): void {
    onValue(ref(this.db, 'readings'), (snapshot) => {
      const data = snapshot.val();
      callback(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    });
  }

  // Safety reports
  saveReport(report: SafetyReport): Promise<string> {
    return push(ref(this.db, 'safetyReports'), report).then(r => r.key ?? '');
  }

  getReports(callback: (reports: SafetyReport[]) => void): void {
    onValue(ref(this.db, 'safetyReports'), (snapshot) => {
      const data = snapshot.val();
      callback(data ? Object.keys(data).map(k => ({ id: k, ...data[k] })) : []);
    });
  }

  updateReport(id: string, changes: Partial<SafetyReport>): Promise<void> {
    return update(ref(this.db, `safetyReports/${id}`), changes as any);
  }

  // User profiles
  saveProfile(email: string, profile: Partial<UserProfile>): Promise<void> {
    const key = email.replace(/\./g, '_');
    return update(ref(this.db, `profiles/${key}`), profile as any);
  }

  getProfile(email: string, callback: (p: UserProfile | null) => void): void {
    const key = email.replace(/\./g, '_');
    onValue(ref(this.db, `profiles/${key}`), (snapshot) => {
      callback(snapshot.val() as UserProfile | null);
    });
  }

  getAllProfiles(callback: (profiles: (UserProfile & { email: string })[]) => void): void {
    onValue(ref(this.db, 'profiles'), (snapshot) => {
      const data = snapshot.val();
      callback(data ? Object.keys(data).map(k => ({ ...data[k], email: k.replace(/_/g, '.') })) : []);
    });
  }
}
