#!/usr/bin/env node

const program = require('commander');
const WebSocket = require('ws');
const Keyboard = require('./keyboard')

program.version(require('./package.json').version)
program.command('listen <port>')
  .description('Listen for websocket connections on a port')
  .action(port => {
    const wss = new WebSocket.Server({ port: port })
    var counter = 0
    var outOn = true
    var mode = ''
    var clients = []
 
    wss.on('connection', ws => {
      clients.push(ws)
      ws.enabled = true // TODO setting
      ws.number = counter++
      console.log(`!!! Client #${ws.number} connected`)
      ws.on('message', msg => {
        if (outOn && ws.enabled) {
          console.log(`${Date.now()} #${ws.number} >>> ${JSON.stringify(msg)}`)
        }
      });
    });

    var keyboard = new Keyboard()

    keyboard.on('prompting', () => {
      outOn = false
    })

    keyboard.on('done-prompting', () => {
      outOn = true
    })
    
    keyboard.on('s', () => {
      keyboard.prompt('select').then(raw => {
        let s = raw.split(',');
        for (let index = 0; index < clients.length; index++) {
          clients[index].enabled = false;
        }
        for (let index = 0; index < s.length; index++) {
          i = parseInt(s[index]);
          clients[i].enabled = true
        }
      })
    })

    keyboard.on('l', () => {
      console.log(`CLIENTS: ${JSON.stringify(clients)}`)
    })

    keyboard.on('S', () => {
      process.stdout.write('SELECTED: ')
      for (let index = 0; index < clients.length; index++) {
        const element = clients[index];
        if (element.enabled) {
          process.stdout.write(index.toString() + ', ')
        }
      }
      process.stdout.write('\n')
    })

    keyboard.on('t', () => {
      keyboard.prompt('transmit').then(raw => {
        try {
          for(let cli in clients) {
            if (clients[cli].enabled) {
              clients[cli].send(raw)
            }
          }
        }
        catch (e) {
          console.error(e)
        }
      })
    })

    keyboard.on('b', () => {
      keyboard.prompt('broadcast').then(raw => {
        for(let cli in clients) {
          clients[cli].send(raw)
        }
      })
    })

    keyboard.on('k', () => {
      keyboard.prompt(`are you sure you want to close ${clients.length} connections [yn]`).then(raw => {
        if (raw == 'y') {
          for(let cli in clients) {
            if (cli.enabled) {
              cli.close()
            }
          }
        }
      })
    })
  })

  
program.command('connect <address>')
  .description('Connect to a websocket at an address')
  .action(address => {
    const ws = new WebSocket(address)
    var outOn = true
    var buffer = ""
    ws.on('open', () => console.log('!!! Connected'))
    
    ws.on('message', msg => {
      // TODO: Make tabsize a setting
      if (outOn) {
        console.log(`${Date.now()} >>> ${JSON.stringify(msg)}`) // TODO: Pretty print
      }
    })

    let keyboard = new Keyboard()

    keyboard.on('prompting', () => {
      outOn = false
    })

    keyboard.on('done-prompting', () => {
      outOn = true
    })

    keyboard.on('s', () => {
      keyboard.prompt('send').then(raw => {
        try {
          ws.send(raw)
        }
        catch (e) {
          console.error(e)
        }
      })
    })
  })

program.parse(process.argv)


process.stdin.setRawMode(true);
process.stdin.resume();

