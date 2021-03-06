import { Component, Input, Output, EventEmitter } from '@angular/core';

import { FormGroup, FormControl, Validators } from '@angular/forms';

import { Crypto } from '../shared/crypto';

@Component({
    selector: 'lock-pin',
    templateUrl: 'lockPIN.component.html',
    styleUrls: ['lockPIN.component.scss']
})
export class LockPINComponent {
    newPINCodeForm = new FormGroup({
        pinCode: new FormControl('', Validators.required),
        pinCodeCheck: new FormControl('', Validators.required)
    });

    pinCode: string = "";
    passwordHash: string = "";

    @Input() locked: boolean;
    @Output() unlock: EventEmitter<boolean> = new EventEmitter<boolean>();

    constructor() {
        this.passwordHash = localStorage.getItem('PINpassword')
    }

    validPassword(password: string): boolean {
        return  Crypto.Hash(password) == this.passwordHash;
    }

    setPINCode(value, valid): void {
        if (!valid) {
            return;
        }
        if (value.pinCode != value.pinCodeCheck) {
            console.log("Not Same Password");
            return;
        }
        this.passwordHash = Crypto.Hash(value.pinCode);
        localStorage.setItem('PINpassword', this.passwordHash);
        this.unlock.emit(true);
        value.pinCode = "";
        value.pinCodeCheck = "";
    }

    pinCodeChange(password): void {
        if (this.validPassword(password)) {
            this.pinCode = "";
            this.unlock.emit(true);
        }
    }
}
