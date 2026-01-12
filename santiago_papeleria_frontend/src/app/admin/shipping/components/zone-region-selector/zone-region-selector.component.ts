import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule, Check } from 'lucide-angular';

@Component({
    selector: 'app-zone-region-selector',
    standalone: true,
    imports: [CommonModule, LucideAngularModule],
    providers: [
        { provide: LucideAngularModule, useValue: LucideAngularModule.pick({ Check }) }
    ],
    templateUrl: './zone-region-selector.component.html'
})
export class ZoneRegionSelectorComponent {
    @Input() title: string = '';
    @Input() provinces: string[] = [];
    @Input() color: 'blue' | 'amber' | 'emerald' | 'indigo' = 'blue';
    @Input() selected: Set<string> = new Set();

    @Output() toggle = new EventEmitter<string>();

    isSelected(prov: string): boolean {
        return this.selected.has(prov);
    }

    getButtonClass(prov: string): string {
        const isSel = this.isSelected(prov);
        const base = "px-3 py-2 rounded-lg text-sm text-left transition-all flex justify-between items-center";

        if (isSel) {
            // Active styles based on color
            const activeMap: Record<string, string> = {
                blue: 'bg-blue-500 text-white',
                amber: 'bg-amber-600 text-white',
                emerald: 'bg-emerald-600 text-white',
                indigo: 'bg-indigo-600 text-white'
            };
            return `${base} ${activeMap[this.color] || 'bg-slate-900 text-white'}`;
        } else {
            // Inactive styles
            const hoverMap: Record<string, string> = {
                blue: 'hover:bg-blue-100',
                amber: 'hover:bg-amber-100',
                emerald: 'hover:bg-emerald-100',
                indigo: 'hover:bg-indigo-100'
            };
            return `${base} bg-white text-slate-600 ${hoverMap[this.color] || 'hover:bg-slate-100'}`;
        }
    }

    getContainerClass(): string {
        const map: Record<string, string> = {
            blue: 'bg-blue-50/50 border-blue-100',
            amber: 'bg-amber-50/50 border-amber-100',
            emerald: 'bg-emerald-50/50 border-emerald-100',
            indigo: 'bg-indigo-50/50 border-indigo-100' // Fixed incorrect indigo bg
        };
        return `p-4 rounded-xl border ${map[this.color] || 'bg-slate-50 border-slate-200'}`;
    }

    getTitleClass(): string {
        const map: Record<string, string> = {
            blue: 'text-blue-800',
            amber: 'text-amber-800',
            emerald: 'text-emerald-800',
            indigo: 'text-indigo-800' // Fixed incorrect indigo text
        };
        return `text-xs font-bold uppercase mb-3 text-center ${map[this.color] || 'text-slate-800'}`;
    }
}
