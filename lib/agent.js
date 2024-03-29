const EventEmitter = require('events')
const http = require('http-shutdown')(require('http').createServer())
const io = require('socket.io')(http, {
  pingTimeout: 60000,
  cors: {
    // Only allow access from kaluma.io and localhost for security
    origin: ['https://kaluma.io', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
    preflightContinue: true
  }
})
const logger = require('./logger')
const { Session } = require('./session')

const SOCKET_PORT = 54094

/**
 * Agent background service
 */
class Agent extends EventEmitter {
  constructor () {
    super()

    /**
     * I/O Socket
     */
    this.socket = null

    /**
     * Sessions
     * @type {Array<Session>}
     */
    this.sessions = []

    this.setup()
  }

  setup () {
    http.on('request', (req, res) => {
      if (req.method === 'GET' && req.url === '/ping') {
        res.writeHead(200, {
          'Access-Control-Allow-Origin': '*'
        })
        res.end('OK')
      }
    })

    io.on('connection', socket => {
      logger.info(`[socket-${socket.id}] connected`)
      var session = new Session(this, socket)
      this.add(session)
    })
  }

  logSessions () {
    logger.info('')
    logger.info('=== sessions ===')
    this.sessions.forEach(s => {
      logger.info(`  [session-${s.socket.id}]`)
      s.devices.forEach(d => {
        logger.info(`    [device-${d.path}]`)
      })
    })
    logger.info('')
  }

  /**
   * Add a session
   * @param {Session} session
   */
  add (session) {
    this.sessions.push(session)
    session.socket.on('disconnect', () => {
      logger.info(`[socket-${session.socket.id}] disconnected`)
      session.close()
      this.remove(session)
    })
    this.logSessions()
  }

  /**
   * Remove a session
   * @param {Session} session
   */
  remove (session) {
    var idx = this.sessions.indexOf(session)
    if (idx > -1) {
      this.sessions.splice(idx, 1)
    }
    this.logSessions()
  }

  /**
   * Start agent service
   */
  start () {
    if (!http.listening) {
      http.listen(SOCKET_PORT, () => {
        logger.info('[agent] started')
        this.emit('start')
      })
    }
  }

  /**
   * Stop agent service
   */
  stop () {
    http.shutdown(() => {
      logger.info('[agent] stop')
      this.emit('stop')
    })
  }

  /**
   * Whether agent is running or not
   * @type {boolean}
   */
  get isRunning () {
    return http.listening
  }
}

module.exports = Agent
