import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { ProfileSidebarComponent } from '../../components/profile-sidebar/profile-sidebar';
import { PersonalInfoComponent } from './components/personal-info/personal-info';
import { AddressListComponent } from './components/address-list/address-list';
import { FavoritesListComponent } from './components/favorites-list/favorites-list';

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [
        CommonModule,
        ProfileSidebarComponent,
        PersonalInfoComponent,
        AddressListComponent,
        FavoritesListComponent
    ],
    templateUrl: './profile.html',
    styleUrls: ['./profile.scss']
})
export class Profile implements OnInit {
    route = inject(ActivatedRoute);
    router = inject(Router);

    activeTab: 'personal' | 'addresses' | 'favorites' = 'personal';

    ngOnInit(): void {
        // Check for query params to switch tab
        this.route.queryParams.subscribe(params => {
            const tab = params['tab'];
            if (tab === 'addresses') {
                this.activeTab = 'addresses';
            } else if (tab === 'favorites') {
                this.activeTab = 'favorites';
            } else {
                this.activeTab = 'personal';
            }
        });
    }

    switchTab(tab: 'personal' | 'addresses' | 'favorites') {
        this.activeTab = tab;
        // Update URL without reloading to keep state synced
        this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { tab: tab },
            queryParamsHandling: 'merge'
        });
    }
}
