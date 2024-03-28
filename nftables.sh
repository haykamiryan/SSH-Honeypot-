#!/bin/bash
sudo nft add table inet honeypot-table
sudo nft add chain inet honeypot-table output-filter-chain '{ type filter hook output priority 0; }'

cat log.txt  | xargs -n1 | sort -u | xargs | tr ' ' '\n'  > filtered.log
sudo awk '{gsub("::ffff:", "");print}' log.txt > filtered.log

for ((i=1;i<=10 ;i++)); 
do
IP=$(grep -m $i -o '.*' filtered.log | cut -d ':' -f 1 | tail -n 1)
sudo nft add rule inet honeypot-table output-filter-chain ip daddr $IP drop
done
