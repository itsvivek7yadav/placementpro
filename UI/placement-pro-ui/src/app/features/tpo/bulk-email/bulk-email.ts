import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-bulk-email',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-email.html',
  styleUrls: ['./bulk-email.scss']
})
export class BulkEmail implements OnInit, OnDestroy {

  API = "http://localhost:5050/api/tpo/email-campaigns";

  // ── View state ─────────────────────────────────────────
  // 'list'   → shows all campaigns
  // 'upload' → shows upload form
  // 'detail' → shows single campaign stats + email table
  view: 'list' | 'upload' | 'detail' = 'list';

  // ── Upload form ─────────────────────────────────────────
  file: any;
  campaignName = "";
  subject = "";
  body = "";
  uploading = false;
  uploadError = "";

  // ── Campaign list ───────────────────────────────────────
  campaigns: any[] = [];
  loadingCampaigns = false;

  // ── Campaign detail ─────────────────────────────────────
  selectedCampaign: any = null;
  stats: any = { total: 0, sent: 0, failed: 0, pending: 0, status: '' };
  emails: any[] = [];
  showEmails = false;
  loadingEmails = false;

  private pollInterval: any;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCampaigns();
  }

  // ── Campaign List ────────────────────────────────────────

  loadCampaigns() {
    this.loadingCampaigns = true;
    this.http.get(`${this.API}`).subscribe({
      next: (res: any) => {
        this.loadingCampaigns = false;
        this.campaigns = res.campaigns || [];
      },
      error: () => { this.loadingCampaigns = false; }
    });
  }

  openUploadForm() {
    this.view = 'upload';
    this.resetForm();
  }

  goToList() {
    this.stopPolling();
    this.showEmails = false;
    this.emails = [];
    this.view = 'list';
    this.loadCampaigns();
  }

  openCampaign(campaign: any) {
    this.selectedCampaign = campaign;
    this.view = 'detail';
    this.showEmails = false;
    this.emails = [];
    this.refreshDetail(campaign.campaign_id);
    if (campaign.status === 'in_progress') {
      this.startPolling(campaign.campaign_id);
    }
  }

  // ── Upload ───────────────────────────────────────────────

  selectFile(e: any) {
    this.file = e.target.files[0];
  }

  uploadCampaign() {

    if (!this.file) {
      this.uploadError = "Please select a CSV file.";
      return;
    }

    if (!this.campaignName.trim() || !this.subject.trim() || !this.body.trim()) {
      this.uploadError = "All fields are required.";
      return;
    }

    this.uploading = true;
    this.uploadError = "";

    const fd = new FormData();
    fd.append("csvFile", this.file);
    fd.append("campaignName", this.campaignName);
    fd.append("subject", this.subject);
    fd.append("emailBody", this.body);

    this.http.post(`${this.API}/upload`, fd).subscribe({
      next: (res: any) => {
        this.uploading = false;
        // Navigate to detail view of newly created campaign
        this.refreshDetail(res.campaignId);
        this.startPolling(res.campaignId);
        this.view = 'detail';
      },
      error: (err) => {
        this.uploading = false;
        this.uploadError = err?.error?.error || "Upload failed. Please try again.";
      }
    });

  }

  resetForm() {
    this.file = null;
    this.campaignName = "";
    this.subject = "";
    this.body = "";
    this.uploadError = "";
  }

  // ── Detail / Stats ───────────────────────────────────────

  refreshDetail(campaignId: number) {
    this.http.get(`${this.API}/${campaignId}`).subscribe({
      next: (res: any) => {
        const c = res.data;
        this.selectedCampaign = c;
        this.stats = {
          total:   c.total_recipients || 0,
          sent:    c.sent_count       || 0,
          failed:  c.failed_count     || 0,
          pending: c.pending_count    || 0,
          status:  c.status           || ''
        };
        if (this.showEmails) {
          this.loadEmailList(campaignId);
        }
        if (c.status === 'completed') {
          this.stopPolling();
        }
      },
      error: () => {}
    });
  }

  startPolling(campaignId: number) {
    this.stopPolling();
    this.pollInterval = setInterval(() => this.refreshDetail(campaignId), 5000);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  toggleEmailList() {
    this.showEmails = !this.showEmails;
    if (this.showEmails) {
      this.loadEmailList(this.selectedCampaign.campaign_id);
    }
  }

  loadEmailList(campaignId: number) {
    this.loadingEmails = true;
    this.http.get(`${this.API}/${campaignId}/emails`).subscribe({
      next: (res: any) => {
        this.loadingEmails = false;
        this.emails = res.emails || [];
      },
      error: () => { this.loadingEmails = false; }
    });
  }

  // ── Helpers ──────────────────────────────────────────────

  get progressPercent(): number {
    if (!this.stats.total) return 0;
    return Math.round(((this.stats.sent + this.stats.failed) / this.stats.total) * 100);
  }

  get isCompleted(): boolean { return this.stats.status === 'completed'; }
  get isInProgress(): boolean { return this.stats.status === 'in_progress'; }

  ngOnDestroy() {
    this.stopPolling();
  }

}