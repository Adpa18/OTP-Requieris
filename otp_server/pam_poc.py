#!/usr/bin/env python3

DB_ID_TO_CHECK = 3
username = 'bastien'
password = 'pwd'

import requests

token = input("OTP token: ")

payload = {'token': token}

r = requests.get("https://localhost:8443/api/v1/accounts/{}/verifyToken".format(DB_ID_TO_CHECK),
                 auth=(username, password),
                 data=payload,
                 verify=False)

res = r.json()
print(res)
print("OK" if res['meta']['success'] else "KO")
