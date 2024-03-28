#!/bin/bash
cat log.txt  | xargs -n1 | sort -u | xargs | tr ' ' '\n'  > filtered.log
sudo awk '{gsub("::ffff:", "");print}' log.txt > filtered.log


for ((i=1;i<=10 ;i++)); 
do
IP=$(grep -m $i -o '.*' filtered.log | cut -d ':' -f 1 | tail -n 1)
sudo iptables -A INPUT -s $IP -j DROP
sudo iptables -A OUTPUT -s $IP -j DROP
done
