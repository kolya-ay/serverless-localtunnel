const localtunnel = require('localtunnel')
const _ = require('lodash')

class ServerlessLocaltunnel {
  constructor (serverless, options) {
    this.serverless = serverless
    this.options = _.get(this.serverless, 'service.custom.localtunnel')

    console.error('WE ARE HERE');
    this.serverless.cli.log(options);
    // Parse tunnel options
    if(Array.isArray(this.options)){
      this.tunnelsOptions = this.options
    }else{
      this.serverless.cli.log('Shouldn\'t be here');
      this.tunnelsOptions = [{
        port: _.get(this.options, 'port', 8080),
        host: _.get(this.options, 'host', 'https://localtunnel.me'),
        subdomain: _.get(this.options, 'subdomain')
      }]
    }

    this.commands = {
      tunnel: {
        lifecycleEvents: ['init']
      }
    }
    // Run tunnels after serverless-offline
    this.hooks = {
      'tunnel:init': this.runServer.bind(this),
      'before:offline:start:init': this.runServer.bind(this)
    }
  }
  runTunnel(options) {
    let tunnel
    let serverRestarted = false
    const errorHandler = (e) => {
      this.serverless.cli.log('Localtunnel error - restarting in 15 seconds')
      console.log(e)
      if(serverRestarted) return
      serverRestarted = true
      tunnel.close()
      setTimeout(this.runTunnel.bind(this, options), 15000)
    }
    try {
      tunnel = localtunnel(options, (err, tunnel) => {
        if (err) {
          this.serverless.cli.log(`Localtunnel.me error: ${err.message}`)
        }else{
          this.serverless.cli.log(`Localtunnel.me started: ${tunnel.url}`)
        }
      })
      tunnel.on('close', () => {
        this.serverless.cli.log('Localtunnel closed')
      })
      tunnel.on('error', errorHandler)
    } catch (e) {
      errorHandler(e)
    }
    return tunnel
  }
  runServer() {
    this.serverless.cli.log('Localtunnel running server')
    return this.tunnelsOptions.map((opts) => {
      return this.runTunnel(opts)
    })
  }
}

module.exports = ServerlessLocaltunnel;