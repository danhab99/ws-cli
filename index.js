#!/usr/bin/env node

const program = require('commander');
const Server = require('./server')
const Connect = require('./connect')

program.version(require('./package.json').version)
var mode;

program
  .option('-p, --pipe-stdin', 'Pipe stdin to server and server to stdout')

program.command('listen <port>')
  .description('Listen for websocket connections on a port')
  .action(port => {
    const wss = new WebSocket.Server({ port: port })
    var keyboard = new Keyboard()
    var counter = 0
    var clients = []
 
    wss.on('connection', ws => {
      clients.push(ws)
      ws.enabled = true // TODO setting
      ws.number = counter++
      console.log(`!!! Client #${ws.number} connected`)
      ws.on('message', msg => {
        if (ws.enabled) {
          process.stdout.write(`\r${Date.now()} #${ws.number} >>> ${JSON.stringify(msg)}\n`)
          keyboard.fix_prompt()
        }
      });
    });
    
    keyboard.on('s', () => {
      keyboard.prompt('select').then(raw => {
        if (raw != '') {
          let s = raw.split(',');
          for (let index = 0; index < clients.length; index++) {
            clients[index].enabled = false;
          }
          for (let index = 0; index < s.length; index++) {
            i = parseInt(s[index]);
            clients[i].enabled = true
          }
        }
      })
    })

    keyboard.on('l', () => {
      process.stdout.write('CLIENTS: ')
      clients.forEach(element => {
        if (element.OPEN) {
          process.stdout.write(`${element.number}, `)
        }
      });
      process.stdout.write('\n')
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
      keyboard.prompt(`are you sure you want to close selected connections [yn]`).then(raw => {
        if (raw == 'y') {
          for(let cli in clients) {
            if (clients[cli].enabled) {
              clients[cli].close()
            }
          }
        }
      })
    })

    keyboard.on('h', () => {
      console.log(`
      [s] open select prompt
      [S] print selected clients
      [t] transmits message to selected clients
      [b] broadcasts message to all clients
      [k] close selected clients
      `)
    })
  })
  
program.command('connect <address>')
  .description('Connect to a websocket at an address')
  .action(address => {
    const ws = new WebSocket(address)
    ws.on('open', () => console.log('!!! Connected'))
    
    ws.on('message', msg => {
      // TODO: Make tabsize a setting
      process.stdout.write(`\r${Date.now()} >>> ${JSON.stringify(msg)}\n`) // TODO: Pretty print
      keyboard.fix_prompt()
    })

    ws.on('close', () => {
      console.error('!!! Server closed connection')
      process.exit(1)
    })

    let keyboard = new Keyboard()

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

    keyboard.on('h', () => {
      console.log(`
      [s] send a message to server
      `)
    })
  })

program.parse(process.argv)
debugger
if (mode === undefined) {
  program.help()
  process.exit(1)
}

if (process.stdin.setRawMode){
  process.stdin.setRawMode(true);
}

process.stdin.resume();

if (mode.mode == 0) {
  Server(program, mode.port)
}

if (mode.mode == 1) {
  Connect(program, mode.address)
}
