#!/bin/bash

apt install zmap -y
npm install
wget -O china_ip.txt https://cdn.jsdelivr.net/gh/17mon/china_ip_list@master/china_ip_list.txt

#zmap scan
zmap -w iplist.txt -p 443 -B 30M -o ip_webserver.txt

#get CloudFront IPs
node index.js

echo "完成!"