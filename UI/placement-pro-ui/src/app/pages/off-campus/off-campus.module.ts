// src/app/pages/off-campus/off-campus.module.ts
// NOTE: All components are standalone — they go in imports[], NOT declarations[]

import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { OffCampusFeedComponent }     from './off-campus-feed/off-campus-feed';
import { OpportunityDetailComponent } from './opportunity-detail/opportunity-detail';

const routes: Routes = [
  {
    path: '',
    component: OffCampusFeedComponent
  },
  {
    path: 'jobs/:id',
    component: OpportunityDetailComponent,
    data: { type: 'job' }
  },
  {
    path: 'events/:id',
    component: OpportunityDetailComponent,
    data: { type: 'event' }
  }
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
    OffCampusFeedComponent,       // standalone → import, not declare
    OpportunityDetailComponent    // standalone → import, not declare
  ]
})
export class OffCampusModule {}