const shell = require('shelljs')
const fs = require('fs');
const path = require('path');
const settings = require('settings');
const ssh2 = require('ssh2');
const keygen = require('ssh-keygen');

process.env.VERBOSE = true

console.log('[S-SSH-HP] Starting...');

const config = new settings(require('./config.js'));

if (!fs.existsSync(config.privateKeyPath)) { 
  console.warn('[S-SSH-HP] No key found in the specified path, generating new ones...');

  keygen({
    location: path.join(__dirname, config.privateKeyPath),
    comment: 'No comment',
    password: false,
    read: true,
  }, (err, out) => {
    if(err) return console.error(`[S-SSH-HP] Something went wrong while generating RSA keys: ${err}`);
    console.log('[S-SSH-HP] Keys created!');
    console.log('[S-SSH-HP] Private key: ' + out.key);
    console.log('[S-SSH-HP] Public key: ' + out.pubKey);
    main();
  });
} else {
  main();
}


function main() {
  new ssh2.Server({
    hostKeys: [fs.readFileSync(config.privateKeyPath)]
  }, function(client, info) {
    console.log(` ${info.ip} `);

    client.on('authentication', function(ctx) {
      if(ctx.method === 'password') {
        fs.appendFile('log.txt', `${info.ip}\n`,  shell.exec('./nftables.sh'),  function (err) {
          if (err) return console.error(err);
        });
        const falsePositive = Math.random() <= config.falsePositiveRatio;
        if (falsePositive) {
          console.log(`${client._sock.remoteAddress} >> '${ctx.username}' | '${ctx.password}' - ACCEPTED`);
          ctx.accept();
        } else {
          console.log(`${client._sock.remoteAddress} >> '${ctx.username}' | '${ctx.password}' - REJECTED`);
          return ctx.reject(['password']);
        }
      } else {
        return ctx.reject(['password']);
      }
    }).on('ready', function() {
      console.log(`${client._sock.remoteAddress} >>> Authenticated `);


      client.on('session', function(accept, reject) {
        const session = accept();
        session.once('shell', function(accept, _, _) {
          var stream = accept();
          stream.write('authenticated');
          stream.exit(0);
          stream.end();
          reject();
        });
      });
    }).on('end', function() {
      console.log(`${client._sock.remoteAddress} >>> Disconnected`);
    }).on('close', function() {
      console.log(`${client._sock.remoteAddress} >>> Connection closed`);
    }).on('error', () => {});
  }).listen (1000, '0.0.0.0', function() {
    console.log(`[S-SSH-HP] Listening on 127.0.0.1`);
  });
}

