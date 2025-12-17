import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable } from 'rxjs';
import { UiService } from '../../../services/ui/ui.service';

@Component({
    selector: 'app-mega-menu',
    standalone: true,
    imports: [CommonModule, RouterModule],
    templateUrl: './mega-menu.component.html',
    styleUrls: ['./mega-menu.component.scss']
})
export class MegaMenuComponent implements OnInit {
    activeMenu$: Observable<string | null>;

    constructor(private uiService: UiService) {
        this.activeMenu$ = this.uiService.activeMegaMenu$;
    }

    ngOnInit(): void { }

    onMouseEnter(menuId: string) {
        this.uiService.setActiveMegaMenu(menuId);
    }

    onMouseLeave() {
        this.uiService.setActiveMegaMenu(null);
    }
}
